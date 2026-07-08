/* =============================================================================
 * SABERR STATUS STORE (runes)
 * -----------------------------------------------------------------------------
 * Consumes the SSE stream `/status/stream` (~3s sparse ticks) via the shared
 * `EventStream` transport, seeded and backstopped by the full `/status` snapshot
 * (`poll()`, on-demand only). It keeps the frontend aware of:
 *   - the backend's version rising past its first-seen value -> "new version available"
 *   - this UI older than the backend's `ui_minimum_version` -> red "out of date" warning
 *   - unread notification / error counts -> sidebar indicators
 *   - per-service health        -> sidebar + per-page error banners
 *   - settings/tracked/list freshness -> triggers silent refetches when stale
 * The watchdog + reconnect/backoff + hidden handling live in `EventStream`; this
 * store just applies a tick's fields and supplies the resync. Failures are silent
 * (last known kept).
 * ========================================================================== */

import { browser } from '$app/environment';
import { apiFetch } from '$lib/api/client';
import { ApiError } from '$lib/api/errors';
import { UI_VERSION, cmpVersion } from '$lib/config/version';
import { EventStream } from '$lib/utils/event-stream';
import { settings } from './settings.svelte';
import { tracked } from './tracked.svelte';
import { userlist } from './userlist.svelte';
import type { ServiceCode, ServiceStatus, Status } from '$lib/api/types';

/**
 * One sparse status-stream event. `ref` is always present (monotonic per
 * connection); every other field appears ONLY when it changed, carrying the new
 * absolute value. Absent ⇒ unchanged. Counts send an explicit `0` when they drop
 * to zero, so we test `!== undefined`, never truthiness.
 */
interface StreamTick {
	ref: number;
	ver?: string;
	ui_min_ver?: string;
	notif?: number;
	err_notif?: number;
	settings_updated?: string;
	tracked_updated?: string;
	list_refreshed?: string;
	services_updated?: string;
	download_added?: string;
	remote_update_available?: boolean;
}

/** Consecutive status connection failures before we surface "connection lost". */
const CONNECTION_LOST_THRESHOLD = 5;
/** Gateway statuses = the backend is unreachable behind a proxy (Cloudflare etc.). */
const GATEWAY_ERRORS = new Set([502, 503, 504]);
/** A failed call that means we couldn't reach Saberr at all (vs. an app-level error). */
const isConnectionError = (e: unknown): boolean =>
	e instanceof ApiError && (e.status === 0 || GATEWAY_ERRORS.has(e.status));

/** Every service we track — used to mark all "waiting" on a fresh dashboard load. */
const ALL_SERVICE_CODES: ServiceCode[] = [
	'qbit',
	'anilist',
	'tvdb',
	'rss',
	'notifications_discord_webhook'
];

class StatusStore {
	/** Last successful status payload, or null before the first poll. */
	current = $state<Status | null>(null);
	/** Backend `version` rose above its first-seen value → brand "new version available". Sticky. */
	updateAvailable = $state(false);
	/** `UI_VERSION` < backend `ui_minimum_version` → red "out of date". Recomputed live. */
	uiOutOfDate = $state(false);
	/** A newer app release is published upstream → green sidebar "update available" banner. */
	remoteUpdateAvailable = $state(false);
	private baselineVersion: string | null = null;
	/**
	 * True after the status stream/poll fails to reach Saberr (connection refused or a
	 * 502/503/504 gateway error) `CONNECTION_LOST_THRESHOLD` times in a row — drives the
	 * sidebar "connection lost" notice. Cleared by the next successful connect/poll.
	 */
	connectionLost = $state(false);
	private connFailures = 0;
	/**
	 * ISO time of the most recently added download (from `download_last_added_at` /
	 * stream `download_added`). Advances when a new download appears; the Downloads page
	 * and the episode-details views watch this to silently refetch. It lives here rather
	 * than on the downloads-updates stream because that stream is closed while nothing's
	 * unfinished.
	 */
	downloadAddedAt = $state<string | null>(null);
	/**
	 * Services whose health we're waiting on — shown grey ("Waiting for service
	 * status…") on settings pages, with NO sidebar dot. Populated on a fresh
	 * dashboard load and when the user saves new service config; cleared by the
	 * next snapshot (which carries the real, freshly-evaluated health).
	 */
	waiting = $state<Set<ServiceCode>>(new Set());

	private active = false;
	/** Last `services_updated` marker adopted from the stream. */
	private lastServicesUpdated: string | null = null;
	/** SSE transport (3s ticks); watchdog/reconnect/hidden handling owned by it. */
	private stream = new EventStream<StreamTick>({
		path: '/api/v1/status/stream',
		freq: 3,
		onMessage: (b) => this.onMessage(b),
		onResync: () => this.poll(),
		onConnect: () => this.markConnectionOk(),
		onConnectError: () => this.markConnectionFailure()
	});

	get unreadCount(): number {
		return this.current?.unread_notification_count ?? 0;
	}

	get unreadErrorCount(): number {
		return this.current?.unread_error_notification_count ?? 0;
	}

	service(code: ServiceCode): ServiceStatus | undefined {
		return this.current?.services_status?.[code];
	}

	/** A status connection succeeded — clear the failure streak + "lost" notice. */
	private markConnectionOk(): void {
		this.connFailures = 0;
		if (this.connectionLost) this.connectionLost = false;
	}

	/** A status connection failed (unreachable / gateway) — surface "lost" after N in a row. */
	private markConnectionFailure(): void {
		this.connFailures += 1;
		if (this.connFailures >= CONNECTION_LOST_THRESHOLD) this.connectionLost = true;
	}

	/** Are we waiting on this service's (re-)evaluated health? */
	isWaiting(code: ServiceCode): boolean {
		return this.waiting.has(code);
	}

	/** True while any service is in the waiting state. */
	get anyWaiting(): boolean {
		return this.waiting.size > 0;
	}

	/**
	 * Mark one service as waiting after the user saves new config for it. Also
	 * optimistically clears any current error indicator (placeholder healthy)
	 * so the sidebar dot drops immediately; the next snapshot replaces it for real.
	 */
	markServiceWaiting(code: ServiceCode): void {
		this.waiting = new Set(this.waiting).add(code);
		if (this.current) {
			const svc = this.current.services_status?.[code];
			this.current = {
				...this.current,
				services_status: {
					...this.current.services_status,
					[code]: { name: svc?.name ?? code, healthy: true }
				}
			};
		}
	}

	/** Mark every service waiting — used once on a fresh dashboard load. */
	markAllServicesWaiting(): void {
		this.waiting = new Set(ALL_SERVICE_CODES);
	}

	/**
	 * Optimistically mark a service healthy without waiting for the next snapshot —
	 * used after AniList connects so a "Not Configured" indicator clears instantly.
	 * Only overrides a missing/Not-Configured entry, never a real error.
	 */
	markServiceHealthy(code: ServiceCode): void {
		if (!this.current) return;
		const svc = this.current.services_status?.[code];
		if (svc?.healthy) return;
		if (svc && svc.error_level !== 'Not Configured') return;
		this.current = {
			...this.current,
			services_status: {
				...this.current.services_status,
				[code]: { name: svc?.name ?? code, healthy: true }
			}
		};
	}

	/** Begin streaming status. Call once authed. */
	start(): void {
		if (!browser || this.active) return;
		this.active = true;
		// Fresh dashboard load: every service is "waiting" until the first snapshot
		// returns its real, freshly-evaluated health.
		this.markAllServicesWaiting();
		// Seed the full snapshot (incl. services_status), then open the stream.
		void this.poll();
		this.stream.start();
	}

	/** Stop streaming (e.g. on logout). */
	stop(): void {
		this.active = false;
		this.stream.stop();
	}

	/** First sighting = baseline; a later higher semver flips `updateAvailable`. */
	private observeVersion(v: string | undefined): void {
		if (!v) return;
		if (this.baselineVersion === null) this.baselineVersion = v;
		else if (cmpVersion(v, this.baselineVersion) > 0) this.updateAvailable = true;
	}

	private evaluateMinimum(min: string | undefined): void {
		if (!min) return;
		this.uiOutOfDate = cmpVersion(UI_VERSION, min) < 0;
	}

	/**
	 * Fetch the full status snapshot once and apply it. The seed (on `start`), the
	 * stream's resync (gap / watchdog / visible recovery), and the public refresh
	 * the notifications page awaits. Carries the rich `services_status` the stream
	 * omits.
	 */
	async poll(): Promise<void> {
		if (!this.active || !browser) return;
		try {
			const data = await apiFetch<Status>('/api/v1/status', { userInitiated: false });
			this.markConnectionOk();
			this.current = data;
			// Fresh health is in hand — nothing is waiting anymore.
			if (this.waiting.size) this.waiting = new Set();
			this.observeVersion(data.version);
			this.evaluateMinimum(data.ui_minimum_version);
			this.remoteUpdateAvailable = data.remote_update_available;
			if (data.settings_last_updated_at) settings.refreshIfStale(data.settings_last_updated_at);
			// Bulk-data freshness: silently re-sync the tracked list, and mark the
			// user-list tabs stale, when the backend reports either changed.
			tracked.refreshIfStale(data.tracked_anime_last_updated_at);
			userlist.markStaleIfChanged(data.anime_list_last_refreshed_at);
			if (data.download_last_added_at) this.downloadAddedAt = data.download_last_added_at;
		} catch (e) {
			// Keep last-known status; count it toward the "connection lost" notice when it
			// means we couldn't reach Saberr (the stream watchdog will retry regardless).
			if (isConnectionError(e)) this.markConnectionFailure();
		}
	}

	/** Apply one sparse stream tick's fields (ref/gap/hidden handled by EventStream). */
	private onMessage(body: StreamTick): void {
		// Counts: absolute, change-only. Apply only when present (incl. explicit 0).
		if (this.current && (body.notif !== undefined || body.err_notif !== undefined)) {
			this.current = {
				...this.current,
				...(body.notif !== undefined ? { unread_notification_count: body.notif } : {}),
				...(body.err_notif !== undefined ? { unread_error_notification_count: body.err_notif } : {})
			};
		}

		this.observeVersion(body.ver);
		this.evaluateMinimum(body.ui_min_ver);
		// Boolean flag, change-only: apply only when present.
		if (body.remote_update_available !== undefined)
			this.remoteUpdateAvailable = body.remote_update_available;

		// Staleness markers: present ⟺ changed.
		if (body.settings_updated) settings.refreshIfStale(body.settings_updated);
		if (body.tracked_updated) tracked.refreshIfStale(body.tracked_updated);
		if (body.list_refreshed) userlist.markStaleIfChanged(body.list_refreshed);
		if (body.download_added) this.downloadAddedAt = body.download_added;

		// services_updated: the stream carries no health, only this sentinel. On a
		// change (not the first sighting) pull the full snapshot for the real
		// services_status — which also clears the `waiting` set.
		if (body.services_updated) {
			if (this.lastServicesUpdated !== null && body.services_updated !== this.lastServicesUpdated) {
				void this.poll();
			}
			this.lastServicesUpdated = body.services_updated;
		}
	}
}

export const status = new StatusStore();
