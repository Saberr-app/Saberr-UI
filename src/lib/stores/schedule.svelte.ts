/* =============================================================================
 * SABERR SCHEDULE STORE (runes) — Calendar page. Keyed cache per (view·period·scope),
 * 1-min TTL: show cached immediately, silently refresh if stale + re-fetch every minute
 * while mounted+visible. Force refresh sends `force_refresh=true`.
 * ========================================================================== */

import { getSchedule, type CalendarView } from '$lib/api/schedule';
import type { AiringScheduleScope } from '$lib/api/types';
import { listTrackedAnime } from '$lib/api/tracked';
import { entryBroadcast, type EntryChange, type EntryUpdate } from '$lib/anilist/entry-broadcast';
import { buildCalendarEpisodes, type CalendarEpisode } from '$lib/calendar/enrich';
import { coverageFor } from '$lib/calendar/coverage';
import { toScheduleParam } from '$lib/calendar/datetime';
import { calendarScope } from './calendar-prefs.svelte';
import { settings } from './settings.svelte';
import { tracked } from './tracked.svelte';

const TTL = 60_000; // 1 minute

interface CacheEntry {
	episodes: CalendarEpisode[];
	loadedAt: number;
}

interface ActiveParams {
	view: CalendarView;
	anchorIso: string;
	scope: AiringScheduleScope[];
}

function keyOf(view: CalendarView, anchorIso: string, scope: AiringScheduleScope[]): string {
	return `${view}|${anchorIso}|${[...scope].sort().join(',')}`;
}

class ScheduleStore {
	episodes = $state<CalendarEpisode[]>([]);
	loading = $state(false);
	loaded = $state(false);
	loadFailed = $state(false);
	/** A fill-fetch (not a refresh) that has been running >2s — drives the
	 *  "Fetching data from AniList…" notice. */
	slowLoading = $state(false);

	private cache: Record<string, CacheEntry> = {};
	private active: ActiveParams | null = null;
	private currentKey = '';
	private pollTimer: ReturnType<typeof setInterval> | undefined;
	private slowTimer: ReturnType<typeof setTimeout> | undefined;
	private seeded = false;

	constructor() {
		// An edit anywhere (incl. the calendar's own Add/Edit action) patches the
		// on-list status of every matching cached episode so the chip stays current.
		entryBroadcast.subscribe((c) => this.onEntryChange(c));
		// Bulk reconcile from any list/tracked/browse fetch (calendar is receive-only).
		entryBroadcast.bulkSubscribe((u) => this.applyEntries(u));
	}

	/** Bulk form of `onEntryChange`: freshen on-list status + tracking of cached episodes in the
	 *  batch, then re-derive coverage. Touches only ids in `updates`; never adds/removes. */
	private applyEntries(updates: EntryUpdate[]): void {
		const byId: Record<number, EntryUpdate> = {};
		for (const u of updates) byId[u.anilistId] = u;
		const patch = (eps: CalendarEpisode[]) => {
			for (const ep of eps) {
				const u = byId[ep.anilistId];
				if (!u) continue;
				ep.anime.user_list_status = u.entry?.status ?? null;
				ep.anime.tracked_anime_id = u.trackedAnimeId;
				ep.isTracked = u.trackedAnimeId != null;
				ep.coverage = coverageFor(
					ep.downloadStatus,
					ep.airingAtUnix,
					ep.isTracked,
					ep.episode,
					ep.anime.tracked_from_episode
				);
			}
		};
		patch(this.episodes);
		for (const key in this.cache) patch(this.cache[key].episodes);
	}

	private onEntryChange(change: EntryChange): void {
		// A change carries a list-entry update (`entry` present) and/or a tracking
		// update (`trackedAnimeId` present). Patch whichever it has — a tracking-only
		// change (e.g. tracked from the calendar) still needs to flip the row.
		const status = change.entry === undefined ? undefined : (change.entry?.status ?? null);
		const patch = (eps: CalendarEpisode[]) => {
			for (const ep of eps) {
				if (ep.anilistId !== change.anilistId) continue;
				if (status !== undefined) ep.anime.user_list_status = status;
				if (change.trackedAnimeId !== undefined) {
					ep.anime.tracked_anime_id = change.trackedAnimeId;
					ep.isTracked = change.trackedAnimeId != null;
					if (change.trackedFromEpisode !== undefined) {
						ep.anime.tracked_from_episode = change.trackedFromEpisode;
					}
					// Tracking flipped → re-derive the coverage badge.
					ep.coverage = coverageFor(
						ep.downloadStatus,
						ep.airingAtUnix,
						ep.isTracked,
						ep.episode,
						ep.anime.tracked_from_episode
					);
				}
			}
		};
		patch(this.episodes);
		for (const key in this.cache) patch(this.cache[key].episodes);
	}

	/** Seed the default scope once: the user's lists when AniList is linked OR anything is tracked
	 *  (probes the tracked list if unloaded); otherwise the current season. */
	async ensureScopeSeeded(): Promise<void> {
		if (this.seeded) return;
		this.seeded = true;
		if (calendarScope.current.length > 0) return;

		const hasAnilist = settings.current.anilist.anilist_user_data != null;
		let hasTracked = tracked.loaded && tracked.items.length > 0;
		if (!hasAnilist && !tracked.loaded) {
			try {
				const res = await listTrackedAnime('ACTIVE', false);
				hasTracked = res.tracked_anime.length > 0;
			} catch {
				/* probe is best-effort; fall through to season default */
			}
		}
		calendarScope.current =
			hasAnilist || hasTracked
				? ['user_watching', 'user_planning', 'user_tracking']
				: ['current_season'];
	}

	/** Switch to a period+scope. Cached periods render from cache with NO refetch (the 1-min poll
	 *  keeps the on-screen period fresh); only an uncached period triggers a fill-fetch. */
	show(view: CalendarView, anchor: Date, firstDay: number, scope: AiringScheduleScope[]): void {
		const anchorIso = toScheduleParam(view, anchor, firstDay);
		const key = keyOf(view, anchorIso, scope);
		this.active = { view, anchorIso, scope };
		this.currentKey = key;

		const cached = this.cache[key];
		if (cached) {
			this.episodes = cached.episodes;
			this.loaded = true;
			this.loadFailed = false;
		} else {
			this.episodes = [];
			this.loaded = false;
			void this.fetch(key, { silent: false, fill: true });
		}
	}

	/** Manual force refresh of the current period+scope. */
	refresh(): void {
		if (this.active) void this.fetch(this.currentKey, { silent: false, force: true });
	}

	/** Start the 1-minute background refresh (idempotent, visible-tab only). */
	startPolling(): void {
		if (this.pollTimer != null || typeof window === 'undefined') return;
		this.pollTimer = setInterval(() => {
			if (document.visibilityState !== 'visible' || !this.active) return;
			void this.fetch(this.currentKey, { silent: true });
		}, TTL);
	}

	stopPolling(): void {
		clearInterval(this.pollTimer);
		this.pollTimer = undefined;
	}

	private async fetch(
		key: string,
		opts: { silent: boolean; force?: boolean; fill?: boolean }
	): Promise<void> {
		const params = this.active;
		if (!params) return;
		if (params.scope.length === 0) {
			if (this.currentKey === key) {
				this.episodes = [];
				this.loaded = true;
				this.loadFailed = false;
			}
			return;
		}

		// A fill that runs past 2s surfaces the "Fetching from AniList…" notice.
		if (opts.fill) {
			clearTimeout(this.slowTimer);
			this.slowTimer = setTimeout(() => {
				if (this.currentKey === key) this.slowLoading = true;
			}, 2000);
		}
		this.loading = true;
		try {
			const res = await getSchedule({
				view: params.view,
				anchorIso: params.anchorIso,
				scope: params.scope,
				force: opts.force,
				userInitiated: !opts.silent
			});
			const episodes = buildCalendarEpisodes(res);
			this.cache[key] = { episodes, loadedAt: Date.now() };
			if (this.currentKey === key) {
				this.episodes = episodes;
				this.loaded = true;
				this.loadFailed = false;
			}
		} catch {
			// Keep any cached episodes on a silent failure; only surface when we have nothing.
			if (this.currentKey === key && !this.cache[key]) this.loadFailed = true;
		} finally {
			this.loading = false;
			if (opts.fill) {
				clearTimeout(this.slowTimer);
				this.slowLoading = false;
			}
		}
	}
}

export const schedule = new ScheduleStore();
