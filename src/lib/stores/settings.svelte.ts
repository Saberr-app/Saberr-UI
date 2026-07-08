/* =============================================================================
 * SABERR SETTINGS STORE (runes) — global settings from `GET /settings`. Strict contract:
 * NO localStorage cache (fetch fresh each load; `(app)` layout gates on `loaded`/`loadFailed`).
 * Bundled defaults are a fallback ONLY for a failed first fetch (then retry every 5s); after one
 * success, last-good is kept. Status poll calls `refreshIfStale()`; Save echo adopted via `patch()`.
 * ========================================================================== */

import { browser } from '$app/environment';
import { apiFetch } from '$lib/api/client';
import { defaultSettings } from '$lib/config/settings-defaults';
import type { Settings } from '$lib/api/types';

const RETRY_MS = 5000;

class SettingsStore {
	/** The live settings the UI reads. Defaults are a fallback seed only. */
	current = $state<Settings>(defaultSettings());
	/** Have we ever successfully loaded settings from the backend this session? */
	loaded = $state(false);
	/** True while the last fetch failed — drives the sidebar error + retry loop. */
	loadFailed = $state(false);

	/** The `settings_last_updated_at` we are currently in sync with (from status). */
	private syncedUpdatedAt: string | null = null;
	private retryTimer: ReturnType<typeof setTimeout> | undefined;
	private active = false;

	/** Begin managing settings: fetch fresh. Call once authed. */
	start(): void {
		if (!browser || this.active) return;
		this.active = true;
		void this.refresh();
	}

	/** Stop the retry loop (e.g. on logout). */
	stop(): void {
		this.active = false;
		if (this.retryTimer) clearTimeout(this.retryTimer);
		this.retryTimer = undefined;
	}

	/** Fetch settings now. Silent (no toast) — failure is shown in the sidebar. */
	async refresh(): Promise<void> {
		if (!browser) return;
		try {
			const data = await apiFetch<Settings>('/api/v1/settings', { userInitiated: false });
			this.current = data;
			this.loaded = true;
			this.loadFailed = false;
			if (this.retryTimer) {
				clearTimeout(this.retryTimer);
				this.retryTimer = undefined;
			}
		} catch {
			// Before the first success: fall back to defaults (already the seed) and flag the
			// failure. After a success: keep the last good values untouched. Either way, retry.
			this.loadFailed = true;
			this.scheduleRetry();
		}
	}

	private scheduleRetry(): void {
		if (!this.active || this.retryTimer) return;
		this.retryTimer = setTimeout(() => {
			this.retryTimer = undefined;
			void this.refresh();
		}, RETRY_MS);
	}

	/** From the status poll. Refetches when `settings_last_updated_at` differs from our last sync. */
	refreshIfStale(serverUpdatedAt: string): void {
		if (this.syncedUpdatedAt === null) {
			// First sighting — settings were just loaded at login; adopt the marker.
			this.syncedUpdatedAt = serverUpdatedAt;
			return;
		}
		if (serverUpdatedAt !== this.syncedUpdatedAt) {
			this.syncedUpdatedAt = serverUpdatedAt;
			void this.refresh();
		}
	}

	/** Merge a freshly-saved section (PUT echo) into the live settings. */
	patch<K extends keyof Settings>(key: K, value: Settings[K]): void {
		this.current = { ...this.current, [key]: value };
	}
}

export const settings = new SettingsStore();
