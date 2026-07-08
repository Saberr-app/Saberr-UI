/* =============================================================================
 * SABERR RSS ACTIONS CONTROLLER (runes) — Discard + Download flows for the toolbar menu
 * and per-row menus. Discard = fire-and-forget (mark rows discarded, drop from selection).
 * Download = confirm dialog first; a single runs silently, multiple run sequentially behind a
 * progress dialog (green/red bar; Cancel finishes the in-flight one then stops).
 * ========================================================================== */

import type { TorrentListItem } from '$lib/api/types';
import { discardTorrents, overrideTorrent } from '$lib/api/torrents';
import { isDiscardable } from '$lib/rss/recognition';
import { notifyError, notifySuccess } from '$lib/api/notify';
import { rss } from './rss.svelte';

const hashOf = (t: TorrentListItem) => t.rss_torrent.magnet_hash;

class RssActions {
	/* --- confirm dialog --- */
	confirmOpen = $state(false);
	private pending: TorrentListItem[] = [];
	get pendingCount(): number {
		return this.pending.length;
	}

	/* --- progress dialog (multi) --- */
	progressOpen = $state(false);
	total = $state(0);
	success = $state(0);
	fail = $state(0);
	running = $state(false);
	finished = $state(false);
	private cancelRequested = false;

	/** Discard the given torrents (skips any already imported; the client toasts on failure). */
	async discard(items: TorrentListItem[]): Promise<void> {
		const hashes = items.filter(isDiscardable).map(hashOf);
		if (hashes.length === 0) return;
		try {
			await discardTorrents(hashes);
			rss.markDiscarded(hashes);
			notifySuccess(
				hashes.length === 1 ? 'Torrent discarded' : `${hashes.length} torrents discarded`
			);
		} catch {
			/* apiFetch already surfaced the error */
		}
	}

	/** Open the confirm dialog for a download (single or multi). */
	requestDownload(items: TorrentListItem[]): void {
		const targets = items.filter((t) => t.download == null);
		if (targets.length === 0) return;
		this.pending = targets;
		this.confirmOpen = true;
	}

	/** Confirm pressed → run the download(s). */
	async confirmDownload(discardFuture: boolean): Promise<void> {
		this.confirmOpen = false;
		const items = this.pending;
		this.pending = [];
		if (items.length === 0) return;
		if (items.length === 1) {
			await this.runSingle(items[0], discardFuture);
			return;
		}
		await this.runMany(items, discardFuture);
	}

	/** Download/import one torrent via the override API. `runOne` is only ever called for
	 *  recognized + tracked rows (the menu/toolbar gates guarantee it), and those always carry a
	 *  `parent_id` — so download/import goes through override regardless of tracked range. The plain
	 *  download API is reserved for the Identify flow (`IdentifyDialog`, unrecognized rows). */
	private async runOne(
		item: TorrentListItem,
		discardFuture: boolean,
		userInitiated: boolean
	): Promise<boolean> {
		if (item.parent_id == null) return false; // not expected for recognized+tracked rows
		try {
			const res = await overrideTorrent(
				item.parent_id,
				{ discard_future_torrents: discardFuture },
				userInitiated
			);
			rss.applyOverride(hashOf(item), res.download_id);
			rss.deselect([hashOf(item)]);
			return true;
		} catch {
			return false; // apiFetch toasts when userInitiated
		}
	}

	private async runSingle(item: TorrentListItem, discardFuture: boolean): Promise<void> {
		if (await this.runOne(item, discardFuture, true)) notifySuccess('Download started');
	}

	private async runMany(items: TorrentListItem[], discardFuture: boolean): Promise<void> {
		this.total = items.length;
		this.success = 0;
		this.fail = 0;
		this.finished = false;
		this.cancelRequested = false;
		this.running = true;
		this.progressOpen = true;

		for (const item of items) {
			if (this.cancelRequested) break;
			if (await this.runOne(item, discardFuture, false)) this.success += 1;
			else this.fail += 1;
		}

		this.running = false;
		this.finished = true;
		if (this.fail > 0) notifyError(`${this.fail} of ${this.total} downloads failed`);
	}

	/* --- revert (superseded row → re-download via override) --- */
	revertOpen = $state(false);
	private pendingRevert: TorrentListItem | null = null;

	/** Open the override confirm for a single superseded row. */
	requestRevert(item: TorrentListItem): void {
		this.pendingRevert = item;
		this.revertOpen = true;
	}

	/** Confirm pressed on the revert dialog. */
	async confirmRevert(discardFuture: boolean): Promise<void> {
		const item = this.pendingRevert;
		this.pendingRevert = null;
		if (!item || item.parent_id == null) return;
		try {
			const res = await overrideTorrent(item.parent_id, { discard_future_torrents: discardFuture });
			rss.applyOverride(hashOf(item), res.download_id);
			notifySuccess('Reverting to this release');
		} catch {
			/* apiFetch already toasted */
		}
	}

	/** Cancel: stop after the in-flight request (the dialog moves to its final state). */
	cancel(): void {
		this.cancelRequested = true;
	}

	closeProgress(): void {
		this.progressOpen = false;
	}
}

export const rssActions = new RssActions();
