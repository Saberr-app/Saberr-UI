/* =============================================================================
 * SABERR RSS TORRENTS API CALLS
 * -----------------------------------------------------------------------------
 * Thin function per endpoint. `/torrents/search` is a frontend-driven search (distinct
 * from the backend pull/consume task whose progress shows via `/pull-status`). The list
 * GET + pull-status run silent; user actions (search/check/discard/download) surface errors.
 * ========================================================================== */

import { apiFetch } from './client';
import type {
	TorrentDownloadRequest,
	TorrentDownloadResponse,
	TorrentListResponse,
	TorrentOverrideRequest,
	TorrentOverrideResponse,
	TorrentSearchRequest,
	TorrentPullStatus
} from './types';

/** Fetch the cached torrent list + pull status. Silent by default (background refresh). */
export function listTorrents(userInitiated = false): Promise<TorrentListResponse> {
	return apiFetch<TorrentListResponse>('/api/v1/torrents', { userInitiated });
}

/** Poll the pull status (every 2s while in-page). Always silent. */
export function getPullStatus(): Promise<TorrentPullStatus> {
	return apiFetch<TorrentPullStatus>('/api/v1/torrents/pull-status', { userInitiated: false });
}

/** `query` = custom filtered search; `release_groups`-only = "Check for torrents". Same shape as GET `/torrents`. */
export function searchTorrents(body: TorrentSearchRequest): Promise<TorrentListResponse> {
	return apiFetch<TorrentListResponse>('/api/v1/torrents/search', { method: 'POST', body });
}

/** Discard torrents by magnet hash (204 → resolves on success). */
export async function discardTorrents(magnetHashes: string[]): Promise<void> {
	await apiFetch<void>('/api/v1/torrents/discard', {
		method: 'POST',
		body: { magnet_hashes: magnetHashes },
		unwrap: false
	});
}

/** Download/import one torrent (one per call). `userInitiated:false` for the sequential
 *  multi-download (failures show in the progress counts, not a toast per item). */
export function downloadTorrent(
	body: TorrentDownloadRequest,
	userInitiated = true
): Promise<TorrentDownloadResponse> {
	return apiFetch<TorrentDownloadResponse>('/api/v1/torrents/download', {
		method: 'POST',
		body,
		userInitiated
	});
}

/** Force a torrent into downloading, replacing the episode's existing download/import. Returns the
 *  resulting download id (unchanged if a download already existed — it flips back to pending). */
export function overrideTorrent(
	torrentId: number,
	body: TorrentOverrideRequest,
	userInitiated = true
): Promise<TorrentOverrideResponse> {
	return apiFetch<TorrentOverrideResponse>(`/api/v1/torrents/${torrentId}/override`, {
		method: 'POST',
		body,
		userInitiated
	});
}
