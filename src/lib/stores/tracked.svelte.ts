/* =============================================================================
 * SABERR TRACKED-ANIME STORE (runes) — `/tracked` list. The endpoint returns the WHOLE
 * list in one call (active or archived) → no pagination, just a 6h TTL + force refresh.
 * Holds the two "releasing not tracked" counts. Mutations update the arrays in place;
 * subscribes to the entry broadcast to keep user_entry fresh + drop items untracked elsewhere.
 * ========================================================================== */

import { listTrackedAnime } from '$lib/api/tracked';
import type { TrackedAnimeItem, UserAnimeListItem } from '$lib/api/types';
import { entryBroadcast, type EntryChange, type EntryUpdate } from '$lib/anilist/entry-broadcast';
import { userEntryFromList } from '$lib/anilist/row';
import { isStale } from '$lib/utils/cache';

/** Project a tracked item to the shared bulk-reconcile currency. */
const trackedToUpdate = (t: TrackedAnimeItem): EntryUpdate => ({
	anilistId: t.anilist_id,
	entry: t.user_entry ? userEntryFromList(t.user_entry) : null,
	trackedAnimeId: t.id
});

/** Merge a fresh list into the current one, reusing unchanged survivors' object refs (keyed
 *  `{#each}` only re-renders moved rows). Absent ids dropped; new ones taken as-is. */
function reconcile(prev: TrackedAnimeItem[], next: TrackedAnimeItem[]): TrackedAnimeItem[] {
	const byId = new Map(prev.map((t) => [t.id, t]));
	return next.map((n) => {
		const old = byId.get(n.id);
		return old && JSON.stringify(old) === JSON.stringify(n) ? old : n;
	});
}

class TrackedStore {
	/* active list */
	items = $state<TrackedAnimeItem[]>([]);
	releasingWatchingNotTracked = $state(0);
	releasingPlanningNotTracked = $state(0);
	loading = $state(false);
	loaded = $state(false);
	loadFailed = $state(false);
	private loadedAt = 0;
	/** Once per page load: the first active-list visit revalidates with force_freshness in the
	 *  background (see `initialForceSync`). */
	private didInitialForceSync = false;

	/* archived list */
	archived = $state<TrackedAnimeItem[]>([]);
	archivedLoading = $state(false);
	archivedLoaded = $state(false);
	private archivedLoadedAt = 0;

	/* staleness (driven by the status poll's `tracked_anime_last_updated_at`) */
	/** The marker we're currently in sync with (null until the first sighting). */
	private syncedUpdatedAt: string | null = null;
	/** Bumped on every backend-side change after the first sighting — the detail
	 *  page (`/tracked/[id]`, not store-backed) watches this to re-pull its item. */
	syncTick = $state(0);

	constructor() {
		entryBroadcast.subscribe((c) => this.onBroadcast(c));
		entryBroadcast.bulkSubscribe((u) => this.applyEntries(u));
	}

	/** Bulk reconcile from a foreign fetch: freshen the joined `user_entry` of cached items in the
	 *  batch. Touches only ids in `updates`; never adds/removes/untracks. */
	private applyEntries(updates: EntryUpdate[]): void {
		const byId: Record<number, EntryUpdate> = {};
		for (const u of updates) byId[u.anilistId] = u;
		const patch = (t: TrackedAnimeItem): TrackedAnimeItem => {
			const u = byId[t.anilist_id];
			if (!u) return t;
			const user_entry: UserAnimeListItem | null =
				u.entry == null ? null : { ...u.entry, anime: t.anime, tracked_anime_id: t.id };
			return { ...t, user_entry };
		};
		if (this.items.some((t) => byId[t.anilist_id])) this.items = this.items.map(patch);
		if (this.archived.some((t) => byId[t.anilist_id])) this.archived = this.archived.map(patch);
	}

	/** From the status poll. First sighting adopts the marker; a later change silently re-syncs the
	 *  cached list + bumps `syncTick` (detail page re-pulls). Not a force-refresh — only bypasses our TTL. */
	refreshIfStale(serverUpdatedAt: string | undefined): void {
		if (!serverUpdatedAt) return;
		if (this.syncedUpdatedAt === null) {
			this.syncedUpdatedAt = serverUpdatedAt;
			return;
		}
		if (serverUpdatedAt === this.syncedUpdatedAt) return;
		this.syncedUpdatedAt = serverUpdatedAt;
		this.syncTick++;
		// Drop the archived list's freshness so its next visit refetches.
		this.archivedLoadedAt = 0;
		if (this.loaded) void this.sync();
	}

	/** Silent background re-sync of the active list: merge by id (unchanged rows keep identity),
	 *  prune dropped ones. Never toggles `loading`; keeps last-known on failure. */
	private async sync(): Promise<void> {
		try {
			const res = await listTrackedAnime('ACTIVE', false, false);
			this.items = reconcile(this.items, res.tracked_anime);
			this.releasingWatchingNotTracked = res.releasing_watching_not_tracked_count;
			this.releasingPlanningNotTracked = res.releasing_planning_not_tracked_count;
			this.loadedAt = Date.now();
			entryBroadcast.emitBulk(res.tracked_anime.map(trackedToUpdate)); // seed other caches
		} catch {
			/* keep the last-known list; the next poll/visit retries */
		}
	}

	/** Load the active list, then revalidate with force_freshness (upserting) — the Refresh spinner
	 *  shows during the forced fetch in every case (no skeleton: `loaded` is already true by then).
	 *  The first visit after a page load runs it once (`initialForceSync`); a visit that found the
	 *  cache aged past the TTL runs it every time. */
	ensure(): void {
		if (this.loading) return;
		if (!this.loaded) void this.load(false).then(() => this.initialForceSync());
		else if (isStale(this.loadedAt)) void this.load(false).then(() => this.forceRevalidate());
		else void this.initialForceSync();
	}

	/** Once per page load: force_freshness revalidate after the first active-list load, so the first
	 *  view shows fast (possibly backend-cached) data, then reconciles to guaranteed-fresh data. */
	private initialForceSync(): Promise<void> {
		if (this.didInitialForceSync) return Promise.resolve();
		this.didInitialForceSync = true;
		return this.forceRevalidate();
	}

	/** Re-fetch the active list with force_freshness and upsert (identity-preserving merge — no
	 *  skeleton flash since `loaded` is already true; only the Refresh spinner shows). No error toast
	 *  (`userInitiated:false`); a failure keeps the last-known list. */
	private async forceRevalidate(): Promise<void> {
		this.loading = true;
		try {
			const res = await listTrackedAnime('ACTIVE', true, false);
			this.items = reconcile(this.items, res.tracked_anime);
			this.releasingWatchingNotTracked = res.releasing_watching_not_tracked_count;
			this.releasingPlanningNotTracked = res.releasing_planning_not_tracked_count;
			this.loaded = true;
			this.loadFailed = false;
			this.loadedAt = Date.now();
			entryBroadcast.emitBulk(res.tracked_anime.map(trackedToUpdate)); // seed other caches
		} catch {
			/* keep the last-known list; TTL / manual refresh / next page load still apply */
		} finally {
			this.loading = false;
		}
	}
	refresh(): void {
		void this.load(true);
	}

	async load(force: boolean): Promise<void> {
		this.loading = true;
		try {
			const res = await listTrackedAnime('ACTIVE', force);
			this.items = res.tracked_anime;
			this.releasingWatchingNotTracked = res.releasing_watching_not_tracked_count;
			this.releasingPlanningNotTracked = res.releasing_planning_not_tracked_count;
			this.loaded = true;
			this.loadFailed = false;
			this.loadedAt = Date.now();
			entryBroadcast.emitBulk(res.tracked_anime.map(trackedToUpdate)); // seed other caches
		} catch {
			this.loadFailed = true;
		} finally {
			this.loading = false;
		}
	}

	/** Load the archived list if not loaded or stale. */
	ensureArchived(): void {
		if (this.archivedLoading) return;
		if (!this.archivedLoaded || isStale(this.archivedLoadedAt)) void this.loadArchived(false);
	}
	refreshArchived(): void {
		void this.loadArchived(true);
	}

	async loadArchived(force: boolean): Promise<void> {
		this.archivedLoading = true;
		try {
			const res = await listTrackedAnime('ARCHIVED', force);
			this.archived = res.tracked_anime;
			this.archivedLoaded = true;
			this.archivedLoadedAt = Date.now();
			entryBroadcast.emitBulk(res.tracked_anime.map(trackedToUpdate)); // seed other caches
		} finally {
			this.archivedLoading = false;
		}
	}

	/** Find a loaded tracked item by anilist id (active or archived). */
	find(anilistId: number): TrackedAnimeItem | undefined {
		return (
			this.items.find((t) => t.anilist_id === anilistId) ??
			this.archived.find((t) => t.anilist_id === anilistId)
		);
	}

	/* --- local mutations (after a successful action) --- */

	/** Replace/insert an item after a create/edit save (lands in the active list). */
	upsert(item: TrackedAnimeItem): void {
		const i = this.items.findIndex((t) => t.id === item.id);
		if (i === -1) this.items = [item, ...this.items];
		else this.items = this.items.map((t) => (t.id === item.id ? item : t));
		// If it was archived, it no longer belongs there.
		this.archived = this.archived.filter((t) => t.id !== item.id);
	}

	/** Remove items from the active list by anilist id (archived / deleted). */
	removeActiveByAnilist(anilistIds: number[]): void {
		const set = new Set(anilistIds);
		this.items = this.items.filter((t) => !set.has(t.anilist_id));
	}
	/** Remove items from the archived list by anilist id (unarchived / deleted). */
	removeArchivedByAnilist(anilistIds: number[]): void {
		const set = new Set(anilistIds);
		this.archived = this.archived.filter((t) => !set.has(t.anilist_id));
	}

	/** Patch user_entry / drop untracked items in response to broadcasts. */
	private onBroadcast(c: EntryChange): void {
		// Untracked elsewhere (deleted from another surface) → drop from both lists.
		if (c.trackedAnimeId === null) {
			this.items = this.items.filter((t) => t.anilist_id !== c.anilistId);
			this.archived = this.archived.filter((t) => t.anilist_id !== c.anilistId);
			return;
		}
		if (c.entry === undefined) return;
		const patch = (t: TrackedAnimeItem): TrackedAnimeItem => {
			if (t.anilist_id !== c.anilistId) return t;
			const user_entry: UserAnimeListItem | null =
				c.entry == null ? null : { ...c.entry, anime: t.anime, tracked_anime_id: t.id };
			return { ...t, user_entry };
		};
		this.items = this.items.map(patch);
		this.archived = this.archived.map(patch);
	}
}

export const tracked = new TrackedStore();
