/* =============================================================================
 * SABERR RSS STORE (runes) — RSS page. Cached torrent list + pull status (pull-status SSE →
 * countdown + auto-refresh when `last_pull` advances; suppressed during a custom search or an
 * action dialog), the search/check flow, and the multi-selection (keyed by magnet_hash; only
 * recognized+tracked rows selectable; reload keeps prior picks ∪ auto-set = `selected && !download`).
 * ========================================================================== */

import { browser } from '$app/environment';
import { SvelteSet } from 'svelte/reactivity';
import type { Download, TorrentDownloadResponse, TorrentListItem } from '$lib/api/types';
import { listTorrents, getPullStatus, searchTorrents } from '$lib/api/torrents';
import { isAutoSelected, isSelectable } from '$lib/rss/recognition';
import { blankToNull } from '$lib/utils/form';
import { DEFAULT_SORT, type SortState } from '$lib/rss/sort';
import { persisted } from '$lib/utils/persisted.svelte';
import { EventStream } from '$lib/utils/event-stream';
import { entryBroadcast, type EntryChange } from '$lib/anilist/entry-broadcast';
import { downloadUpdates } from './download-updates.svelte';
import { settings } from './settings.svelte';

const TICK_MS = 1000;

export type GroupMode = 'none' | 'episode';

/**
 * One sparse pull-status stream event (`freq=2`). `ref` is always present; every
 * other field appears only when it changed. Absent ⇒ unchanged.
 */
interface PullStatusTick {
	ref: number;
	last_pull?: string | null;
	next_pull?: string | null;
	currently_pulling?: boolean;
}

class RssStore {
	torrents = $state<TorrentListItem[]>([]);
	loaded = $state(false);
	loading = $state(false);
	loadFailed = $state(false);

	/** True while showing custom-search results (suppresses auto-refresh). */
	searchMode = $state(false);
	/** Search-row UI state (driven by the `?q=`/`?groups=` URL params via the page). */
	searchOpen = $state(false);
	searchQuery = $state('');
	searchGroups = $state<string[]>([]);
	/** In-flight pull (search/check) — disables the controls that trigger it. */
	pulling = $state(false);
	/** Last pull-status snapshot (drives the countdown + the auto-refresh signal). */
	lastPull = $state<string | null>(null);
	nextPull = $state<string | null>(null);
	currentlyPulling = $state(false);

	/** Selection (magnet_hash). Empty → selection mode off. */
	selection = new SvelteSet<string>();
	private anchor: string | null = null;

	/** 1s tick so the countdown / "pulling" derivation stay live. */
	now = $state(Date.now());

	/** Persisted view prefs. */
	sortPref = persisted<SortState>('saberr_rss_sort', DEFAULT_SORT);
	groupPref = persisted<GroupMode>('saberr_rss_group', 'none');

	private tickTimer: ReturnType<typeof setInterval> | undefined;
	/** The `last_pull` value we've already folded into the list (auto-refresh baseline). */
	private seenPull: string | null = null;
	private loadSeq = 0;
	/** Token for the shared download-updates stream (live row status/progress). */
	private watchToken: number | undefined;

	/** SSE transport (2s ticks); watchdog/reconnect/hidden handling owned by it. */
	private stream = new EventStream<PullStatusTick>({
		path: '/api/v1/torrents/pull-status/stream',
		freq: 2,
		onMessage: (b) => this.applyPullTick(b),
		onResync: () => this.resyncPull()
	});

	get selectionActive(): boolean {
		return this.selection.size > 0;
	}

	get availableGroups(): string[] {
		return settings.current.meta.available_release_groups;
	}

	constructor() {
		// A Track/Edit anywhere (incl. this page's own menu) flips the matching rows'
		// tracked status so their actions/selectability update without a refetch.
		entryBroadcast.subscribe((c: EntryChange) => {
			if (c.trackedAnimeId === undefined) return;
			this.torrents = this.torrents.map((t) =>
				t.anilist_id === c.anilistId ? { ...t, tracked_anime_id: c.trackedAnimeId ?? null } : t
			);
		});
	}

	/* --- lifecycle --- */

	start(): void {
		if (!browser) return;
		// Open the stream + tick; the INITIAL list fetch is driven by the page's URL effect
		// (`showFeed()` for no `?q=`, `search()` otherwise) so a deep-linked search isn't
		// clobbered by a concurrent full load.
		this.watchToken ??= downloadUpdates.register([]);
		this.tickTimer ??= setInterval(() => (this.now = Date.now()), TICK_MS);
		this.stream.start();
	}

	stop(): void {
		clearInterval(this.tickTimer);
		this.tickTimer = undefined;
		this.stream.stop();
		if (this.watchToken !== undefined) {
			downloadUpdates.unregister(this.watchToken);
			this.watchToken = undefined;
		}
	}

	/** Register the visible rows' non-PROCESSED download ids with the live stream. */
	private syncWatch(): void {
		if (this.watchToken === undefined) return;
		const ids = this.torrents
			.map((t) => t.download)
			.filter((d): d is NonNullable<typeof d> => d != null && d.status !== 'PROCESSED')
			.map((d) => d.id);
		downloadUpdates.update(this.watchToken, ids);
	}

	/* --- data --- */

	private async load(): Promise<void> {
		const seq = ++this.loadSeq;
		this.loading = true;
		try {
			const res = await listTorrents(false);
			if (seq !== this.loadSeq) return; // superseded
			this.applyList(res.torrents);
			this.lastPull = res.pull_status.last_pull;
			this.nextPull = res.pull_status.next_pull;
			this.currentlyPulling = res.pull_status.currently_pulling;
			this.seenPull = res.pull_status.last_pull;
			this.loaded = true;
			this.loadFailed = false;
		} catch {
			if (seq === this.loadSeq) this.loadFailed = true;
		} finally {
			if (seq === this.loadSeq) this.loading = false;
		}
	}

	/** Apply one sparse pull-status tick (ref/gap/hidden handled by EventStream). */
	private applyPullTick(b: PullStatusTick): void {
		if (b.next_pull !== undefined) this.nextPull = b.next_pull;
		if (b.currently_pulling !== undefined) this.currentlyPulling = b.currently_pulling;
		if (b.last_pull !== undefined) this.foldLastPull(b.last_pull);
	}

	/** Full pull-status refetch — the stream's resync (gap / watchdog / visible). */
	private async resyncPull(): Promise<void> {
		if (!browser) return;
		try {
			const s = await getPullStatus();
			this.nextPull = s.next_pull;
			this.currentlyPulling = s.currently_pulling;
			this.foldLastPull(s.last_pull);
		} catch {
			/* keep last-known; the stream watchdog will retry */
		}
	}

	/** Record the latest `last_pull`; a NEW finished pull auto-refreshes the list
	 *  (unless a custom search is showing or an action has suppressed it). */
	private foldLastPull(lastPull: string | null): void {
		this.lastPull = lastPull;
		if (!this.searchMode && !this.pulling && lastPull !== this.seenPull) {
			this.seenPull = lastPull;
			this.load();
		}
	}

	/** Custom search — replaces the displayed list and suppresses auto-refresh. Shares `loadSeq`
	 *  with `load()` so the latest of the two wins (a concurrent full load can't clobber results). */
	async search(query: string, releaseGroups: string[]): Promise<void> {
		const seq = ++this.loadSeq;
		this.pulling = true;
		try {
			// An empty query must be null, not "" (backend minLength=1 on the nullable field).
			const res = await searchTorrents({
				query: blankToNull(query),
				release_groups: releaseGroups
			});
			if (seq !== this.loadSeq) return; // superseded by a newer load/search
			this.searchMode = true;
			this.applyList(res.torrents);
			this.nextPull = res.pull_status.next_pull;
			this.currentlyPulling = res.pull_status.currently_pulling;
		} finally {
			if (seq === this.loadSeq) this.pulling = false;
		}
	}

	/** Show the live feed (leaving any search): close the search row, drop search mode, reload. */
	showFeed(): void {
		this.searchOpen = false;
		this.searchMode = false;
		this.load();
	}

	/** "Check for torrents" — RSS search over all available groups (a live refresh). */
	async check(): Promise<void> {
		this.pulling = true;
		try {
			const res = await searchTorrents({ release_groups: this.availableGroups });
			this.searchMode = false;
			this.applyList(res.torrents);
			this.lastPull = res.pull_status.last_pull;
			this.nextPull = res.pull_status.next_pull;
			this.currentlyPulling = res.pull_status.currently_pulling;
			this.seenPull = res.pull_status.last_pull;
		} finally {
			this.pulling = false;
		}
	}

	/** Merge a download response into the matching row (after a download/identify). */
	patchByHash(res: TorrentDownloadResponse): void {
		const hash = res.rss_torrent.magnet_hash;
		const i = this.torrents.findIndex((t) => t.rss_torrent.magnet_hash === hash);
		if (i === -1) return;
		const prev = this.torrents[i];
		this.torrents[i] = {
			...prev,
			download: res.download,
			anilist_id: res.anilist_id,
			anilist_english_title: res.anilist_english_title,
			anilist_native_title: res.anilist_native_title,
			anilist_romaji_title: res.anilist_romaji_title,
			tracked_anime_id: res.tracked_anime_id,
			tracked_from_episode: res.tracked_from_episode,
			anilist_episode_numbers: res.anilist_episode_numbers,
			anilist_episode_part: res.anilist_episode_part,
			anilist_episode_part_ceiling: res.anilist_episode_part_ceiling,
			rss_torrent: { ...prev.rss_torrent, ...res.rss_torrent }
		};
		this.syncWatch(); // a new download id may need watching
	}

	/** Reflect a torrent override into the matching row: its download flips to (or is created as)
	 *  PENDING with the returned id, and the superseded flag clears. The live stream fills real status. */
	applyOverride(hash: string, downloadId: number): void {
		const i = this.torrents.findIndex((t) => t.rss_torrent.magnet_hash === hash);
		if (i === -1) return;
		const prev = this.torrents[i];
		const download: Download = prev.download
			? { ...prev.download, id: downloadId, status: 'PENDING', status_details: null }
			: {
					id: downloadId,
					status: 'PENDING',
					status_details: null,
					download_directory_path: null,
					destination_path: null,
					copied_to_destination_path_at: null
				};
		this.torrents[i] = { ...prev, download, superseded: false };
		this.syncWatch();
	}

	/** Drop rows by magnet_hash (after discard). */
	removeByHash(hashes: string[]): void {
		const set = new Set(hashes);
		this.torrents = this.torrents.filter((t) => !set.has(t.rss_torrent.magnet_hash));
		for (const h of hashes) this.selection.delete(h);
		this.syncWatch();
	}

	/** Mark rows discarded (after a successful discard) and drop them from selection. */
	markDiscarded(hashes: string[]): void {
		const set = new Set(hashes);
		this.torrents = this.torrents.map((t) =>
			set.has(t.rss_torrent.magnet_hash) ? { ...t, discarded: true } : t
		);
		for (const h of hashes) this.selection.delete(h);
	}

	/** Remove specific hashes from the selection (keeps selection mode). */
	deselect(hashes: string[]): void {
		for (const h of hashes) this.selection.delete(h);
	}

	/* --- selection (magnet_hash keyed) --- */

	private applyList(items: TorrentListItem[]): void {
		this.torrents = items;
		// Any successfully-applied list clears the load-error state — so a Check/Search
		// that succeeds after the initial load failed renders instead of staying on the
		// "couldn't load" message until the next full refresh.
		this.loaded = true;
		this.loadFailed = false;
		// Reseed: keep prior picks still present, then add the auto-select set.
		const present = new Set(items.map((t) => t.rss_torrent.magnet_hash));
		const next = new SvelteSet<string>();
		for (const h of this.selection) if (present.has(h)) next.add(h);
		for (const t of items) if (isAutoSelected(t)) next.add(t.rss_torrent.magnet_hash);
		this.selection.clear();
		for (const h of next) this.selection.add(h);
		this.anchor = null;
		this.syncWatch();
	}

	isSelected(hash: string): boolean {
		return this.selection.has(hash);
	}

	toggle(hash: string): void {
		if (this.selection.has(hash)) this.selection.delete(hash);
		else {
			this.selection.add(hash);
			this.anchor = hash;
		}
	}

	/** Shift-range toggle over the visible selectable order. */
	toggleRange(hash: string, orderedHashes: string[]): void {
		if (this.anchor == null) return this.toggle(hash);
		const a = orderedHashes.indexOf(this.anchor);
		const b = orderedHashes.indexOf(hash);
		if (a === -1 || b === -1) return this.toggle(hash);
		const range = orderedHashes.slice(Math.min(a, b), Math.max(a, b) + 1);
		const allSelected = range.every((h) => this.selection.has(h));
		for (const h of range) {
			if (allSelected) this.selection.delete(h);
			else this.selection.add(h);
		}
		this.anchor = hash;
	}

	/** Add a set of hashes to the selection (e.g. "Select all"). */
	selectHashes(hashes: string[]): void {
		for (const h of hashes) this.selection.add(h);
		if (hashes.length) this.anchor = hashes[hashes.length - 1];
	}

	unselectAll(): void {
		this.selection.clear();
		this.anchor = null;
	}

	/** The currently-selected items (still present in the list). */
	selectedItems(): TorrentListItem[] {
		return this.torrents.filter(
			(t) => isSelectable(t) && this.selection.has(t.rss_torrent.magnet_hash)
		);
	}
}

export const rss = new RssStore();
