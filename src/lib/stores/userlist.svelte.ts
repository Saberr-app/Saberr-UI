/* =============================================================================
 * SABERR USER-LIST STORE (runes) — tabbed `/list`, one tab per watch-status group, each
 * keeping its OWN preserved state (query/sort/season/rows/paging) so tab/return restores it.
 * Server-driven via `/anime-list` (infinite scroll, 100/page). Subscribes to the entry
 * broadcast so edits patch every tab + move/remove an item whose status changed.
 * ========================================================================== */

import { SvelteMap } from 'svelte/reactivity';
import { listUserAnime } from '$lib/api/anime';
import type {
	AnilistAnimeFormat,
	AnilistAnimeSeason,
	AnilistAnimeStatus,
	AnilistAnimeUserStatus,
	SortDirection,
	UserAnimeListSortBy
} from '$lib/api/types';
import type { IconName } from '$lib/config/icons';
import { rowFromListItem, type AnimeRow } from '$lib/anilist/row';
import {
	entryBroadcast,
	toEntryUpdate,
	type EntryChange,
	type EntryUpdate
} from '$lib/anilist/entry-broadcast';
import { isStale } from '$lib/utils/cache';

const PAGE = 100; // server limit per request (infinite scroll)

export type ListTab = 'watching' | 'completed' | 'planned' | 'hold' | 'dropped';

/** Tab definitions: label + icon + which watch statuses it contains. */
export const LIST_TABS: {
	id: ListTab;
	label: string;
	icon: IconName;
	statuses: AnilistAnimeUserStatus[];
}[] = [
	{ id: 'watching', label: 'Watching', icon: 'watching', statuses: ['CURRENT', 'REPEATING'] },
	{ id: 'completed', label: 'Completed', icon: 'completed', statuses: ['COMPLETED'] },
	{ id: 'planned', label: 'Plan to watch', icon: 'planned', statuses: ['PLANNING'] },
	{ id: 'hold', label: 'On hold', icon: 'hold', statuses: ['PAUSED'] },
	{ id: 'dropped', label: 'Dropped', icon: 'dropped', statuses: ['DROPPED'] }
];

const TAB_IDS = LIST_TABS.map((t) => t.id);
const STATUSES: Record<ListTab, AnilistAnimeUserStatus[]> = Object.fromEntries(
	LIST_TABS.map((t) => [t.id, t.statuses])
) as Record<ListTab, AnilistAnimeUserStatus[]>;

/** Friendly sort options (subset of `UserAnimeListSortBy`) + default. */
export const USERLIST_SORT_OPTIONS: { value: UserAnimeListSortBy; label: string }[] = [
	{ value: 'season_and_year', label: 'Season & year' },
	{ value: 'title', label: 'Title' },
	{ value: 'score', label: 'My score' },
	{ value: 'progress', label: 'Progress' },
	{ value: 'episodes', label: 'Episodes' },
	{ value: 'started_at', label: 'Started' },
	{ value: 'completed_at', label: 'Completed' },
	{ value: 'format', label: 'Format' },
	{ value: 'airing_status', label: 'Airing status' },
	{ value: 'repeat_count', label: 'Rewatches' },
	{ value: 'time_until_airing', label: 'Time until airing' }
];

export interface ListTabState {
	query: string;
	sortKey: UserAnimeListSortBy;
	sortDir: SortDirection;
	season: AnilistAnimeSeason | null;
	year: number | null;
	/** Tracked filter: true = tracked, false = not tracked, null = either. */
	isTracked: boolean | null;
	/** Airing-status filter (include-only, empty = any). */
	airingStatuses: AnilistAnimeStatus[];
	/** Format filter (include-only, empty = any). */
	formats: AnilistAnimeFormat[];
	items: AnimeRow[];
	offset: number;
	loading: boolean; // initial page load (clears items → skeleton)
	loadingMore: boolean; // appending a page
	/** Background stale-while-revalidate in flight — items stay on screen, no skeleton. */
	refreshing: boolean;
	reachedEnd: boolean;
	loaded: boolean; // a first load has been kicked off
	loadedAt: number; // when the first page completed (ms) — drives the 6h TTL
	/** Set when an item was added/moved into this tab but couldn't be inserted from
	 *  the broadcast — the next visit force-refreshes so the new item shows up. */
	forceNext: boolean;
}

const defaultTab = (): ListTabState => ({
	query: '',
	sortKey: 'season_and_year',
	sortDir: 'desc',
	season: null,
	year: null,
	isTracked: null,
	airingStatuses: [],
	formats: [],
	items: [],
	offset: 0,
	loading: false,
	loadingMore: false,
	refreshing: false,
	reachedEnd: false,
	loaded: false,
	loadedAt: 0,
	forceNext: false
});

class UserListStore {
	private tabs = new SvelteMap<ListTab, ListTabState>();
	/** Supersede tokens (plain, non-reactive) per tab. */
	private seq = new Map<ListTab, number>();

	/** The `anime_list_last_refreshed_at` marker we're in sync with (null = unseen). */
	private syncedRefreshedAt: string | null = null;

	constructor() {
		for (const id of TAB_IDS) {
			this.tabs.set(id, defaultTab());
			this.seq.set(id, 0);
		}
		entryBroadcast.subscribe((c) => this.patch(c));
		entryBroadcast.bulkSubscribe((u) => this.applyEntries(u));
	}

	/** Bulk reconcile from a foreign fetch: freshen entry+tracking of loaded rows, and drop a row
	 *  whose new status no longer fits its tab. Touches only ids in `updates`; never adds. */
	private applyEntries(updates: EntryUpdate[]): void {
		const byId: Record<number, EntryUpdate> = {};
		for (const u of updates) byId[u.anilistId] = u;
		for (const tab of TAB_IDS) {
			const s = this.get(tab);
			let changed = false;
			const items: AnimeRow[] = [];
			for (const r of s.items) {
				const u = byId[r.anilistId];
				if (!u) {
					items.push(r);
					continue;
				}
				changed = true;
				// Off the list, or moved out of this tab's status set → drop it here.
				if (u.entry == null || !STATUSES[tab].includes(u.entry.status)) continue;
				items.push({ ...r, entry: u.entry, trackedAnimeId: u.trackedAnimeId });
			}
			if (changed) this.update(tab, { items });
		}
	}

	/** From the status poll. A bulk AniList re-sync can't be patched in place (we hold only loaded
	 *  pages) → flag every tab to force-refresh on next visit. First sighting just adopts the marker. */
	markStaleIfChanged(serverRefreshedAt: string | undefined): void {
		if (!serverRefreshedAt) return;
		if (this.syncedRefreshedAt === null) {
			this.syncedRefreshedAt = serverRefreshedAt;
			return;
		}
		if (serverRefreshedAt === this.syncedRefreshedAt) return;
		this.syncedRefreshedAt = serverRefreshedAt;
		for (const tab of TAB_IDS) this.update(tab, { forceNext: true });
	}

	get(tab: ListTab): ListTabState {
		return this.tabs.get(tab) ?? defaultTab();
	}

	private update(tab: ListTab, patch: Partial<ListTabState>) {
		this.tabs.set(tab, { ...this.get(tab), ...patch });
	}

	private bump(tab: ListTab): number {
		const t = (this.seq.get(tab) ?? 0) + 1;
		this.seq.set(tab, t);
		return t;
	}

	/** Load the first page if this tab hasn't loaded (or its cache went stale). A
	 *  pending `forceNext` (an add/move we couldn't insert) force-refreshes instead. */
	ensure(tab: ListTab): void {
		const s = this.get(tab);
		if (s.loading || s.refreshing) return;
		if (s.forceNext) {
			this.update(tab, { forceNext: false });
			// Something already on screen → revalidate in place (keep it visible, no
			// skeleton). Nothing cached yet → a plain first load (skeleton is fine).
			if (s.loaded && s.items.length > 0) void this.revalidate(tab);
			else void this.load(tab, false);
			return;
		}
		if (!s.loaded || isStale(s.loadedAt)) void this.load(tab, false);
	}

	/** Stale-while-revalidate for a `forceNext` tab: keeps shown items+filters, re-fetches the same
	 *  page depth in the background, swaps in when done (no skeleton flash). Sends no `force_freshness`. */
	private async revalidate(tab: ListTab): Promise<void> {
		const token = this.bump(tab);
		const s = this.get(tab);
		const target = Math.max(s.offset, PAGE); // cover at least what was loaded
		this.update(tab, { refreshing: true });
		const acc: AnimeRow[] = [];
		const seen: Record<number, true> = {}; // plain object dedupe (keeps the lint quiet)
		try {
			for (let offset = 0; offset < target; offset += PAGE) {
				const res = await listUserAnime({
					statuses: STATUSES[tab],
					query: s.query || undefined,
					season: s.season,
					seasonYear: s.year,
					isTracked: s.isTracked,
					sortBy: s.sortKey,
					sortDirection: s.sortDir,
					offset,
					limit: PAGE
				});
				if (this.seq.get(tab) !== token) return; // superseded (filter change / newer refresh)
				const rows = (res.anime_list ?? []).map(rowFromListItem);
				for (const r of rows) {
					if (seen[r.anilistId]) continue;
					seen[r.anilistId] = true;
					acc.push(r);
				}
				if (rows.length < PAGE) {
					// Reached the end early — swap in what we have, mark complete.
					entryBroadcast.emitBulk(acc.map(toEntryUpdate));
					this.update(tab, {
						items: acc,
						offset: acc.length,
						reachedEnd: true,
						loaded: true,
						loadedAt: Date.now()
					});
					return;
				}
			}
			entryBroadcast.emitBulk(acc.map(toEntryUpdate));
			this.update(tab, {
				items: acc,
				offset: acc.length,
				reachedEnd: false,
				loaded: true,
				loadedAt: Date.now()
			});
		} catch {
			// Keep the existing items; flag a retry on the next visit.
			if (this.seq.get(tab) === token) this.update(tab, { forceNext: true });
		} finally {
			if (this.seq.get(tab) === token) this.update(tab, { refreshing: false });
		}
	}

	/** Re-run the current tab's query bypassing any cache. */
	refresh(tab: ListTab): void {
		void this.load(tab, true);
	}

	setQuery(tab: ListTab, query: string): void {
		this.update(tab, { query });
		void this.load(tab, false);
	}
	setSort(tab: ListTab, sortKey: UserAnimeListSortBy, sortDir: SortDirection): void {
		this.update(tab, { sortKey, sortDir });
		void this.load(tab, false);
	}
	setSeasonYear(tab: ListTab, season: AnilistAnimeSeason | null, year: number | null): void {
		this.update(tab, { season, year });
		void this.load(tab, false);
	}
	setIsTracked(tab: ListTab, isTracked: boolean | null): void {
		this.update(tab, { isTracked });
		void this.load(tab, false);
	}
	/** Commit season/year + tracked together (filter popover Apply) with a single re-query. */
	setFilters(
		tab: ListTab,
		season: AnilistAnimeSeason | null,
		year: number | null,
		isTracked: boolean | null,
		airingStatuses: AnilistAnimeStatus[],
		formats: AnilistAnimeFormat[]
	): void {
		this.update(tab, { season, year, isTracked, airingStatuses, formats });
		void this.load(tab, false);
	}

	/** Reset to offset 0 and load the first page. */
	private async load(tab: ListTab, force: boolean): Promise<void> {
		const token = this.bump(tab);
		this.update(tab, { loading: true, loaded: true, items: [], offset: 0, reachedEnd: false });
		const s = this.get(tab); // latest query/sort/season
		try {
			const res = await listUserAnime({
				statuses: STATUSES[tab],
				query: s.query || undefined,
				season: s.season,
				seasonYear: s.year,
				isTracked: s.isTracked,
				airingStatuses: s.airingStatuses,
				formats: s.formats,
				sortBy: s.sortKey,
				sortDirection: s.sortDir,
				offset: 0,
				limit: PAGE,
				forceFreshness: force
			});
			if (this.seq.get(tab) !== token) return;
			const rows = (res.anime_list ?? []).map(rowFromListItem);
			entryBroadcast.emitBulk(rows.map(toEntryUpdate)); // seed the other caches
			this.update(tab, {
				items: rows,
				offset: rows.length,
				reachedEnd: rows.length < PAGE,
				loadedAt: Date.now()
			});
		} catch {
			if (this.seq.get(tab) !== token) return;
			this.update(tab, { reachedEnd: true });
		} finally {
			if (this.seq.get(tab) === token) this.update(tab, { loading: false });
		}
	}

	/** Append the next page (infinite scroll). */
	loadMore(tab: ListTab): void {
		const s = this.get(tab);
		if (s.loading || s.loadingMore || s.refreshing || s.reachedEnd) return;
		const token = this.seq.get(tab) ?? 0; // superseded by any reset, not self
		this.update(tab, { loadingMore: true });
		void (async () => {
			try {
				const res = await listUserAnime({
					statuses: STATUSES[tab],
					query: s.query || undefined,
					season: s.season,
					seasonYear: s.year,
					isTracked: s.isTracked,
					airingStatuses: s.airingStatuses,
					formats: s.formats,
					sortBy: s.sortKey,
					sortDirection: s.sortDir,
					offset: s.offset,
					limit: PAGE
				});
				if (this.seq.get(tab) !== token) return;
				const rows = (res.anime_list ?? []).map(rowFromListItem);
				entryBroadcast.emitBulk(rows.map(toEntryUpdate)); // seed the other caches
				const cur = this.get(tab);
				const seen = new Set(cur.items.map((r) => r.anilistId));
				const fresh = rows.filter((r) => !seen.has(r.anilistId));
				this.update(tab, {
					items: [...cur.items, ...fresh],
					offset: cur.offset + rows.length,
					reachedEnd: rows.length < PAGE
				});
			} catch {
				if (this.seq.get(tab) !== token) return;
				this.update(tab, { reachedEnd: true });
			} finally {
				if (this.seq.get(tab) === token) this.update(tab, { loadingMore: false });
			}
		})();
	}

	/** Patch every tab on an edit: update in place; remove if it no longer belongs;
	 *  or flag a force-refresh when an item now belongs to a tab it isn't loaded in. */
	private patch(c: EntryChange) {
		for (const tab of TAB_IDS) {
			const s = this.get(tab);
			if (!s.items.some((r) => r.anilistId === c.anilistId)) {
				// The item now maps to this tab (added or moved in) but isn't loaded here.
				// The broadcast can't supply a full row, so force-refresh on the next visit.
				if (c.entry != null && STATUSES[tab].includes(c.entry.status)) {
					this.update(tab, { forceNext: true });
				}
				continue;
			}
			let items: AnimeRow[];
			if (c.entry === undefined) {
				// Tracking-only change: patch the tracked id in place, keep the entry.
				items = s.items.map((r) =>
					r.anilistId === c.anilistId
						? {
								...r,
								trackedAnimeId: c.trackedAnimeId !== undefined ? c.trackedAnimeId : r.trackedAnimeId
							}
						: r
				);
			} else if (c.entry == null || !STATUSES[tab].includes(c.entry.status)) {
				// Removed from the list, or moved out of this tab's status set.
				items = s.items.filter((r) => r.anilistId !== c.anilistId);
			} else {
				// Capture the narrowed entry so the closure keeps it non-undefined.
				const entry = c.entry;
				items = s.items.map((r) =>
					r.anilistId === c.anilistId
						? {
								...r,
								entry,
								trackedAnimeId: c.trackedAnimeId !== undefined ? c.trackedAnimeId : r.trackedAnimeId
							}
						: r
				);
			}
			this.update(tab, { items });
		}
	}
}

export const userlist = new UserListStore();
