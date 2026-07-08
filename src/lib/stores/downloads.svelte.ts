/* =============================================================================
 * SABERR DOWNLOADS STORE (runes) — `/downloads`. Infinite-scroll (newest-first, optional
 * `statuses`), cached across visits, silent reconcile on re-entry / when a new download
 * appears (status `download_added` advances). Two modes via `?id=`: LIST feed vs SINGLE
 * (one download, expanded). Both register non-PROCESSED ids into the download-updates stream.
 * ========================================================================== */

import { listDownloads, getDownload } from '$lib/api/downloads';
import type { DownloadItem, TorrentDownloadStatus } from '$lib/api/types';
import { downloadUpdates } from './download-updates.svelte';

const PAGE_SIZE = 50;

/** Merge a fresh page into the current list, reusing unchanged rows' identity. */
function reconcile(prev: DownloadItem[], next: DownloadItem[]): DownloadItem[] {
	const byId = new Map(prev.map((d) => [d.id, d]));
	return next.map((n) => {
		const old = byId.get(n.id);
		return old && JSON.stringify(old) === JSON.stringify(n) ? old : n;
	});
}

class DownloadsStore {
	/* list mode */
	items = $state<DownloadItem[]>([]);
	/** Rendered list — base items minus any deleted backend-side (per the live stream). */
	visibleItems = $derived(this.items.filter((d) => !downloadUpdates.isDeleted(d.id)));
	loading = $state(false);
	done = $state(false);
	firstLoadDone = $state(false);
	loadFailed = $state(false);
	loaded = $state(false);

	/** Repeated `statuses` filter; empty = all. */
	statuses = $state<TorrentDownloadStatus[]>([]);

	/* single (`?id=`) mode */
	single = $state<DownloadItem | null>(null);
	singleLoading = $state(false);
	singleFailed = $state(false);
	private singleId: number | null = null;

	private offset = 0;
	private reqId = 0;
	private watchToken: number | undefined;
	/** The `download_added` marker we're in sync with (null until the first sighting). */
	private syncedAddedAt: string | null = null;

	/* --- lifecycle (page mount/unmount) --- */

	enter(): void {
		this.watchToken ??= downloadUpdates.register([]);
	}

	leave(): void {
		if (this.watchToken !== undefined) {
			downloadUpdates.unregister(this.watchToken);
			this.watchToken = undefined;
		}
	}

	/* --- mode switching (driven by the `?id=` param) --- */

	/** Enter single-download view (no list, no new-download refetch). */
	showSingle(id: number): void {
		if (this.singleId === id && this.single) return;
		this.singleId = id;
		this.singleFailed = false;
		this.singleLoading = true;
		this.single = null;
		void (async () => {
			try {
				const d = await getDownload(id);
				if (this.singleId !== id) return; // switched away
				this.single = d;
				this.syncWatch();
			} catch {
				if (this.singleId === id) this.singleFailed = true;
			} finally {
				if (this.singleId === id) this.singleLoading = false;
			}
		})();
	}

	/** Leave single view → restore the list (load if needed, else silent reconcile). */
	showList(): void {
		this.singleId = null;
		this.single = null;
		this.singleFailed = false;
		if (!this.loaded) void this.load(true);
		else void this.sync();
		this.syncWatch();
	}

	/* --- data (list) --- */

	async load(replace: boolean): Promise<void> {
		const id = replace ? ++this.reqId : this.reqId;
		if (replace) {
			this.items = [];
			this.done = false;
			this.offset = 0;
		}
		this.loading = true;
		try {
			const res = await listDownloads({
				offset: replace ? 0 : this.offset,
				limit: PAGE_SIZE,
				statuses: this.statuses
			});
			if (id !== this.reqId) return; // superseded by a newer filter set
			const batch = res.downloads;
			this.items = replace ? batch : [...this.items, ...batch];
			this.offset = this.items.length;
			this.done = batch.length < PAGE_SIZE;
			this.firstLoadDone = true;
			this.loadFailed = false;
			this.loaded = true;
			this.syncWatch();
		} catch {
			if (id !== this.reqId) return;
			if (!this.firstLoadDone) this.loadFailed = true;
		} finally {
			if (id === this.reqId) this.loading = false;
		}
	}

	loadMore(): void {
		if (!this.loading && !this.done) void this.load(false);
	}

	/** Apply a new status filter (resets to page 0). */
	setStatuses(statuses: TorrentDownloadStatus[]): void {
		this.statuses = statuses;
		void this.load(true);
	}

	/** Force a visible refresh from page 0. */
	refresh(): void {
		void this.load(true);
	}

	/** Silent background reconcile: refetch the loaded range, merge by id (unchanged rows keep
	 *  identity), prune dropped ones. Never toggles `loading`. */
	private async sync(): Promise<void> {
		if (!this.loaded) return;
		const id = this.reqId; // bail if a real (replace) load supersedes us
		const limit = Math.max(PAGE_SIZE, this.items.length);
		try {
			const res = await listDownloads({ offset: 0, limit, statuses: this.statuses }, false);
			if (id !== this.reqId) return;
			this.items = reconcile(this.items, res.downloads);
			this.offset = this.items.length;
			this.done = res.downloads.length < limit;
			this.syncWatch();
		} catch {
			/* keep last-known; the next visit/tick retries */
		}
	}

	/** Public silent reconcile (used by the actions controller after delete/retry). */
	reconcileSoon(): void {
		void this.sync();
	}

	/* --- local mutations (after an action) --- */

	/** Drop a row by id after a successful delete (siblings pruned by `reconcileSoon`). */
	removeLocal(id: number): void {
		this.items = this.items.filter((d) => d.id !== id);
		if (this.single?.id === id) this.single = null;
		this.syncWatch();
	}

	/** Optimistically reflect a revert (override) on a row: status → PENDING, superseded cleared.
	 *  The download id is unchanged; the live stream then carries real progress. */
	applyRevert(id: number): void {
		const map = (d: DownloadItem): DownloadItem =>
			d.id === id ? { ...d, status: 'PENDING', superseded: false } : d;
		this.items = this.items.map(map);
		if (this.single?.id === id) this.single = map(this.single);
		this.syncWatch();
	}

	/* --- live stream registration --- */

	/** Re-register the visible non-PROCESSED ids with the live stream (list or single). */
	private syncWatch(): void {
		if (this.watchToken === undefined) return;
		const base = this.single ? [this.single] : this.items;
		const ids = base.filter((d) => d.status !== 'PROCESSED').map((d) => d.id);
		downloadUpdates.update(this.watchToken, ids);
	}

	/** A new download was added (status `download_added` advanced). First sighting adopts the marker;
	 *  a later change silently reconciles the list — never in single (`?id=`) view. */
	refreshIfStale(addedAt: string | null): void {
		if (!addedAt) return;
		if (this.syncedAddedAt === null) {
			this.syncedAddedAt = addedAt;
			return;
		}
		if (addedAt === this.syncedAddedAt) return;
		this.syncedAddedAt = addedAt;
		if (this.single) return; // single view ignores new-download signals
		if (this.loaded) void this.sync();
	}
}

export const downloads = new DownloadsStore();
