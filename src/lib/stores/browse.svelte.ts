/* =============================================================================
 * SABERR BROWSE STORE (runes) — Season View state: selected season/year + a per-season
 * cache of fully-loaded rows (all pages), kept until reload/refresh. Subscribes to the
 * entry broadcast so a list edit anywhere patches cached rows.
 * ========================================================================== */

import { SvelteMap } from 'svelte/reactivity';
import { getAnime, getAnimeExtras, listAnime } from '$lib/api/anime';
import type { AnilistAnimeSeason, AnimeExtras, AnimeItemWithUserEntry } from '$lib/api/types';
import { rowFromAnime, type AnimeRow } from '$lib/anilist/row';
import { currentSeason } from '$lib/anilist/dates';
import { entryBroadcast, toEntryUpdate, type EntryUpdate } from '$lib/anilist/entry-broadcast';
import { searchToListParams, type SearchForm } from '$lib/anilist/search';
import { emptyFilter, type FilterState } from '$lib/anilist/collection';
import { isStale } from '$lib/utils/cache';

const PAGE_SIZE = 50; // server-forced
const SEARCH_GATE = 100; // auto-load this many items, then require a "Load more" click

class BrowseStore {
	private cache = new SvelteMap<string, AnimeRow[]>();
	/** When each season was fully loaded (ms) — drives the 6h TTL. */
	private cacheTime = new Map<string, number>();
	/** Full anime objects by id for cache-first detail; patched by list edits. */
	private itemCache = new SvelteMap<number, AnimeItemWithUserEntry>();
	private itemTime = new Map<number, number>();
	private extrasTime = new Map<number, number>();
	private current = currentSeason();

	selSeason = $state<AnilistAnimeSeason>(this.current.season);
	selYear = $state<number>(this.current.year);

	/* --- Season View client-side controls (server-agnostic; preserved across detail nav, like
	 *  `searchForm` below — in-memory only, so a full reload starts clean). --- */
	seasonSearch = $state('');
	seasonFilter = $state<FilterState>(emptyFilter());

	/** True while a season is loading its pages (only blocks when uncached). */
	loading = $state(false);
	/** Titles loaded so far for the in-flight season (progress hint). */
	loadedCount = $state(0);
	/** Monotonic token so a newer load supersedes an in-flight one. */
	private loadSeq = 0;
	/** The season key currently being loaded (re-entry guard during progressive load). */
	private loadingKey: string | null = null;

	/* --- Search tab (server-driven; state preserved across tab/detail nav) --- */
	/** Last applied search form (null until the first search runs). */
	searchForm = $state<SearchForm | null>(null);
	searchResults = $state<AnimeRow[]>([]);
	/** Initial load (page 1) — drives the skeleton. */
	searchLoading = $state(false);
	/** Appending a further page — drives the bottom spinner. */
	searchLoadingMore = $state(false);
	/** A page came back short → no more results. */
	searchReachedEnd = $state(false);
	/** Last fetch failed (the client already toasted the detail). */
	searchError = $state(false);
	/** Item count at which auto-scroll loading pauses for a "Load more" click. */
	searchGateAt = $state(SEARCH_GATE);
	/** When the current search results were last (re)loaded (ms) — 6h TTL. */
	private searchLoadedAt = 0;
	private searchNextPage = 1;
	private searchSeq = 0;

	/* --- Anime detail (cache-first) --- */
	/** True while fetching a detail that wasn't already cached. */
	animeLoading = $state(false);
	private animeSeq = 0;

	/** Relations/characters/staff by id (best-effort; absent until fetched). */
	private extrasCache = new SvelteMap<number, AnimeExtras>();
	private extrasSeq = 0;

	constructor() {
		entryBroadcast.subscribe((c) => this.patch(c.anilistId, c));
		entryBroadcast.bulkSubscribe((u) => this.applyEntries(u));
	}

	/** Auto-loading is paused (the user has hit the current 100-item gate). */
	get searchGated(): boolean {
		return (
			!this.searchReachedEnd &&
			!this.searchLoading &&
			!this.searchLoadingMore &&
			this.searchResults.length > 0 &&
			this.searchResults.length >= this.searchGateAt
		);
	}

	private key(season: AnilistAnimeSeason, year: number) {
		return `${season}:${year}`;
	}

	rowsFor(season: AnilistAnimeSeason, year: number): AnimeRow[] | undefined {
		return this.cache.get(this.key(season, year));
	}

	/** Load a season page-by-page, publishing rows progressively (0.5s cooldown between
	 *  fetches). Dedupes by anilist id against page-boundary overlap. */
	async load(season: AnilistAnimeSeason, year: number, force = false): Promise<void> {
		const key = this.key(season, year);
		// Skip if already loading, or cached + fresh. A full load records `cacheTime`; an
		// abandoned partial doesn't, so it reloads cleanly.
		if (
			!force &&
			(this.loadingKey === key || (this.cache.has(key) && !isStale(this.cacheTime.get(key))))
		)
			return;

		const seq = ++this.loadSeq; // newer loads supersede this one
		this.loadingKey = key;
		this.loading = true;
		this.loadedCount = 0;
		try {
			const seen: Record<number, true> = {};
			const rows: AnimeRow[] = [];
			let page = 1;
			// Guard against an unbounded loop on a misbehaving backend.
			for (let safety = 0; safety < 100; safety++) {
				const res = await listAnime({
					season,
					seasonYear: year,
					page,
					sortBy: ['POPULARITY_DESC'], // stable server sort → no page-boundary dupes
					forceFreshness: force
				});
				if (this.loadSeq !== seq) return; // superseded by a newer load
				const items = res.anime ?? [];
				const now = Date.now();
				for (const item of items) {
					this.itemCache.set(item.id, item);
					this.itemTime.set(item.id, now);
					if (seen[item.id]) continue;
					seen[item.id] = true;
					rows.push(rowFromAnime(item));
				}
				this.loadedCount = rows.length;
				// Publish a fresh array each page so consumers re-render progressively.
				this.cache.set(key, [...rows]);
				if (items.length < PAGE_SIZE) break;
				page++;
				await new Promise((r) => setTimeout(r, 500)); // cooldown between fetches
				if (this.loadSeq !== seq) return; // superseded during the cooldown
			}
			this.cacheTime.set(key, Date.now()); // fully loaded → start the TTL clock
			entryBroadcast.emitBulk(rows.map(toEntryUpdate)); // seed the other caches
		} finally {
			if (this.loadSeq === seq) {
				this.loading = false;
				this.loadingKey = null;
			}
		}
	}

	/* --- Search ------------------------------------------------------------- */

	/** Run a fresh search (resets results + the 100-item gate to page 1). */
	runSearch(form: SearchForm, force = false): void {
		const seq = ++this.searchSeq;
		this.searchForm = form;
		this.searchResults = [];
		this.searchNextPage = 1;
		this.searchReachedEnd = false;
		this.searchError = false;
		this.searchGateAt = SEARCH_GATE;
		void this.loadSearchPage(seq, force);
	}

	/** Re-run the current search bypassing any cache (`force_freshness`). */
	refreshSearch(): void {
		if (this.searchForm) this.runSearch(this.searchForm, true);
	}

	/** True when there are preserved search results but they're past the TTL. */
	isSearchStale(): boolean {
		return this.searchForm != null && isStale(this.searchLoadedAt);
	}

	/** Sentinel hit — auto-load the next page unless we've reached the gate. */
	loadMoreOnScroll(): void {
		if (
			this.searchLoading ||
			this.searchLoadingMore ||
			this.searchReachedEnd ||
			this.searchResults.length >= this.searchGateAt
		)
			return;
		void this.loadSearchPage(this.searchSeq, false);
	}

	/** "Load more" button — lift the gate by 100 and resume loading. */
	loadMoreClicked(): void {
		this.searchGateAt += SEARCH_GATE;
		if (!this.searchLoading && !this.searchLoadingMore && !this.searchReachedEnd) {
			void this.loadSearchPage(this.searchSeq, false);
		}
	}

	private async loadSearchPage(seq: number, force: boolean): Promise<void> {
		if (!this.searchForm) return;
		const page = this.searchNextPage;
		const initial = page === 1;
		if (initial) this.searchLoading = true;
		else this.searchLoadingMore = true;
		try {
			const res = await listAnime({
				...searchToListParams(this.searchForm),
				page,
				forceFreshness: force
			});
			if (this.searchSeq !== seq) return; // superseded
			const items = res.anime ?? [];
			const now = Date.now();
			for (const a of items) {
				this.itemCache.set(a.id, a);
				this.itemTime.set(a.id, now);
			}
			const seen = new Set(this.searchResults.map((r) => r.anilistId));
			const fresh = items.filter((a) => !seen.has(a.id)).map(rowFromAnime);
			this.searchResults = [...this.searchResults, ...fresh];
			if (items.length < PAGE_SIZE) this.searchReachedEnd = true;
			this.searchNextPage = page + 1;
			if (initial) this.searchLoadedAt = now;
			// Seed the other caches with this page's authoritative entries.
			entryBroadcast.emitBulk(
				items.map((a) => ({
					anilistId: a.id,
					entry: a.user_entry,
					trackedAnimeId: a.tracked_anime_id
				}))
			);
		} catch {
			if (this.searchSeq !== seq) return;
			this.searchError = true;
			this.searchReachedEnd = true; // stop auto-loading after a failure
		} finally {
			if (this.searchSeq === seq) {
				this.searchLoading = false;
				this.searchLoadingMore = false;
			}
		}
	}

	/* --- Anime detail ------------------------------------------------------- */

	/** The cached full anime (from a prior season/search load or detail fetch). */
	cachedAnime(id: number): AnimeItemWithUserEntry | undefined {
		return this.itemCache.get(id);
	}

	/** Ensure the full anime is cached: render-from-cache instantly, fetch if missing
	 *  (or `force`). The detail view reads `cachedAnime(id)` reactively. */
	async ensureAnime(id: number, force = false): Promise<void> {
		if (!force && this.itemCache.has(id) && !isStale(this.itemTime.get(id))) return;
		const seq = ++this.animeSeq;
		this.animeLoading = true;
		try {
			const item = await getAnime(id, force);
			if (this.animeSeq === seq) {
				this.itemCache.set(id, item);
				this.itemTime.set(id, Date.now());
				entryBroadcast.emitBulk([
					{ anilistId: item.id, entry: item.user_entry, trackedAnimeId: item.tracked_anime_id }
				]);
			}
		} catch {
			// client already toasts; leave whatever (if anything) was cached
		} finally {
			if (this.animeSeq === seq) this.animeLoading = false;
		}
	}

	/** Cached relations/characters/staff for an anime (undefined until fetched). */
	cachedExtras(id: number): AnimeExtras | undefined {
		return this.extrasCache.get(id);
	}

	/** Best-effort fetch of the anime extras (silent on failure; rows just hide). */
	async ensureExtras(id: number, force = false): Promise<void> {
		if (!force && this.extrasCache.has(id) && !isStale(this.extrasTime.get(id))) return;
		const seq = ++this.extrasSeq;
		try {
			const extras = await getAnimeExtras(id, force);
			if (this.extrasSeq === seq) {
				this.extrasCache.set(id, extras);
				this.extrasTime.set(id, Date.now());
			}
		} catch {
			// silent — the detail view simply omits the extras rows
		}
	}

	/** Bulk reconcile: push authoritative entry+tracking onto cached rows / search / detail.
	 *  Patches only ids present in `updates`; never adds or removes rows. */
	applyEntries(updates: EntryUpdate[]): void {
		// Plain object lookup (not a Map) keeps this a non-reactive local.
		const byId: Record<number, EntryUpdate> = {};
		for (const u of updates) byId[u.anilistId] = u;

		const merge = (r: AnimeRow): AnimeRow => {
			const u = byId[r.anilistId];
			return u ? { ...r, entry: u.entry, trackedAnimeId: u.trackedAnimeId } : r;
		};

		for (const [key, crows] of this.cache) {
			if (crows.some((r) => byId[r.anilistId])) this.cache.set(key, crows.map(merge));
		}
		if (this.searchResults.some((r) => byId[r.anilistId])) {
			this.searchResults = this.searchResults.map(merge);
		}
		for (const u of updates) {
			const item = this.itemCache.get(u.anilistId);
			if (item) {
				this.itemCache.set(u.anilistId, {
					...item,
					user_entry: u.entry,
					tracked_anime_id: u.trackedAnimeId
				});
			}
		}
	}

	/** Apply an entry/tracking change to a row list (returns a fresh array). */
	private mapPatch(
		rows: AnimeRow[],
		anilistId: number,
		change: { entry?: AnimeRow['entry']; trackedAnimeId?: number | null }
	): AnimeRow[] {
		return rows.map((r) =>
			r.anilistId === anilistId
				? {
						...r,
						entry: change.entry !== undefined ? change.entry : r.entry,
						trackedAnimeId:
							change.trackedAnimeId !== undefined ? change.trackedAnimeId : r.trackedAnimeId
					}
				: r
		);
	}

	/** Patch a single anime's entry/tracking across every cache + the search list. */
	private patch(
		anilistId: number,
		change: { entry?: AnimeRow['entry']; trackedAnimeId?: number | null }
	) {
		for (const [key, rows] of this.cache) {
			if (!rows.some((r) => r.anilistId === anilistId)) continue;
			this.cache.set(key, this.mapPatch(rows, anilistId, change));
		}
		if (this.searchResults.some((r) => r.anilistId === anilistId)) {
			this.searchResults = this.mapPatch(this.searchResults, anilistId, change);
		}
		const item = this.itemCache.get(anilistId);
		if (item) {
			this.itemCache.set(anilistId, {
				...item,
				user_entry: change.entry !== undefined ? change.entry : item.user_entry,
				tracked_anime_id:
					change.trackedAnimeId !== undefined ? change.trackedAnimeId : item.tracked_anime_id
			});
		}
	}
}

export const browse = new BrowseStore();
