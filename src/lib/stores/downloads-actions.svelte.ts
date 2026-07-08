/* =============================================================================
 * SABERR DOWNLOADS ACTIONS CONTROLLER (runes) — per-row Retry / Delete (no bulk). Retry
 * (FAILED_*, DELETED, DISCARDED) calls `retry/check` first — `superseded` ⇒ confirm. Delete
 * (status !== PROCESSED) confirms then DELETEs; the backend cascades to same-hash siblings, so
 * we drop the row + silent-reconcile. Dialog state lives here.
 * ========================================================================== */

import type { DeleteDownloadRequest, DownloadItem } from '$lib/api/types';
import { checkDownloadRetry, retryDownload, deleteDownload } from '$lib/api/downloads';
import { overrideTorrent } from '$lib/api/torrents';
import { notifySuccess } from '$lib/api/notify';
import { downloads } from './downloads.svelte';

/** Retry is offered on these (failed/removed) statuses. */
const RETRYABLE = new Set([
	'FAILED_DOWNLOAD_INIT',
	'FAILED_DOWNLOAD',
	'FAILED_PROCESSING',
	'DELETED',
	'DISCARDED'
]);

export const canRetry = (item: DownloadItem): boolean => RETRYABLE.has(item.status);
/** Any download can now be deleted (the dialog scopes what gets removed). */
export const canDelete = (): boolean => true;
/** Revert (override) is offered when a newer download has superseded this imported one. */
export const canRevert = (item: DownloadItem): boolean =>
	item.superseded && item.status === 'PROCESSED';

class DownloadsActions {
	/* superseded-retry confirm */
	retryConfirmOpen = $state(false);
	private pendingRetryId: number | null = null;

	/* delete confirm */
	deleteConfirmOpen = $state(false);
	/** The row being deleted — the dialog reads its status/superseded to decide which options apply. */
	deleteTarget = $state<DownloadItem | null>(null);
	private pendingDeleteId: number | null = null;

	/* episode-details dialog (the download whose episode details are open) */
	episodeItem = $state<DownloadItem | null>(null);
	openEpisode(item: DownloadItem): void {
		this.episodeItem = item;
	}
	closeEpisode(): void {
		this.episodeItem = null;
	}

	/** Start a retry: check supersession first, then confirm-or-go. */
	async retry(item: DownloadItem): Promise<void> {
		try {
			const check = await checkDownloadRetry(item.id);
			if (check.superseded) {
				this.pendingRetryId = item.id;
				this.retryConfirmOpen = true;
				return;
			}
			await this.doRetry(item.id);
		} catch {
			/* apiFetch already toasted */
		}
	}

	/** Confirm pressed on the superseded dialog. */
	async confirmRetry(): Promise<void> {
		const id = this.pendingRetryId;
		this.pendingRetryId = null;
		if (id != null) await this.doRetry(id);
	}

	private async doRetry(id: number): Promise<void> {
		try {
			await retryDownload(id);
			notifySuccess('Retry queued');
			downloads.reconcileSoon();
		} catch {
			/* apiFetch already toasted */
		}
	}

	/** Open the delete confirm for a row. */
	requestDelete(item: DownloadItem): void {
		this.pendingDeleteId = item.id;
		this.deleteTarget = item;
		this.deleteConfirmOpen = true;
	}

	/** Confirm pressed on the delete dialog — the dialog supplies the per-target options. */
	async confirmDelete(opts: DeleteDownloadRequest): Promise<void> {
		const id = this.pendingDeleteId;
		this.pendingDeleteId = null;
		this.deleteTarget = null;
		if (id == null) return;
		try {
			await deleteDownload(id, opts);
			downloads.removeLocal(id);
			downloads.reconcileSoon(); // prune same-hash siblings the backend removed
			notifySuccess('Download deleted');
		} catch {
			/* apiFetch already toasted */
		}
	}

	/* revert (override) confirm */
	revertConfirmOpen = $state(false);
	private pendingRevert: DownloadItem | null = null;

	/** Open the override confirm for a superseded+imported download. */
	requestRevert(item: DownloadItem): void {
		this.pendingRevert = item;
		this.revertConfirmOpen = true;
	}

	/** Confirm pressed on the revert dialog → override the download's torrent (id unchanged). */
	async confirmRevert(discardFuture: boolean): Promise<void> {
		const item = this.pendingRevert;
		this.pendingRevert = null;
		if (item == null) return;
		try {
			await overrideTorrent(item.torrent.id, { discard_future_torrents: discardFuture });
			downloads.applyRevert(item.id);
			downloads.reconcileSoon();
			notifySuccess('Reverting to this release');
		} catch {
			/* apiFetch already toasted */
		}
	}
}

export const downloadsActions = new DownloadsActions();
