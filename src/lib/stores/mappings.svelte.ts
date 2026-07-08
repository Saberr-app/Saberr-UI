/* =============================================================================
 * SABERR MAPPINGS STORE (runes) — `/settings/mappings`.
 * -----------------------------------------------------------------------------
 * Shared source of truth for the stats + override list, so the page and the header
 * quick action stay in sync. Cache-first (loads once, revisits reuse). `refresh()`
 * runs the BLOCKING `/mappings/refresh` then re-fetches stats; a single `refreshing`
 * flag guards against double-runs across both surfaces.
 * ========================================================================== */

import { getMappingOverrides, getMappingStats, refreshMappings } from '$lib/api/mappings';
import type { MappingOverrideItem, MappingStatsResponse } from '$lib/api/types';

class MappingsStore {
	stats = $state<MappingStatsResponse | null>(null);
	overrides = $state<MappingOverrideItem[]>([]);
	loaded = $state(false);
	loadFailed = $state(false);
	refreshing = $state(false);

	private loadPromise: Promise<void> | null = null;

	/** Fetch stats + overrides once; concurrent/repeat calls share the in-flight promise. */
	load(): Promise<void> {
		if (this.loaded) return Promise.resolve();
		if (this.loadPromise) return this.loadPromise;
		this.loadPromise = (async () => {
			try {
				const [stats, overrides] = await Promise.all([getMappingStats(), getMappingOverrides()]);
				this.stats = stats;
				this.overrides = overrides;
				this.loaded = true;
				this.loadFailed = false;
			} catch {
				this.loadFailed = true;
			} finally {
				this.loadPromise = null;
			}
		})();
		return this.loadPromise;
	}

	/** Re-fetch stats only (after a refresh). Silent on failure — keeps last-good. */
	private async reloadStats(): Promise<void> {
		try {
			this.stats = await getMappingStats(false);
		} catch {
			/* keep last-good stats */
		}
	}

	/**
	 * Blocking refresh: rebuild relations/mappings, then pull fresh stats. Throws on failure so
	 * callers can toast; the `refreshing` flag is always cleared. No-op while already refreshing.
	 */
	async refresh(): Promise<void> {
		if (this.refreshing) return;
		this.refreshing = true;
		try {
			await refreshMappings();
			await this.reloadStats();
		} finally {
			this.refreshing = false;
		}
	}

	/** Insert a new override or replace an edited one (keeps identity of untouched rows). */
	upsert(item: MappingOverrideItem): void {
		const i = this.overrides.findIndex((o) => o.id === item.id);
		if (i === -1) this.overrides = [item, ...this.overrides];
		else this.overrides[i] = item;
	}

	remove(id: number): void {
		this.overrides = this.overrides.filter((o) => o.id !== id);
	}
}

export const mappings = new MappingsStore();
