/* =============================================================================
 * SABERR DOWNLOADS API CALLS
 * -----------------------------------------------------------------------------
 * Downloads feed: paginated list (optional repeated `statuses`, server newest-first),
 * single `?id=` fetch, + delete/retry/retry-check. The live stream lives in its store.
 * ========================================================================== */

import { apiFetch } from './client';
import type {
	DeleteDownloadRequest,
	DownloadItem,
	DownloadListResponse,
	DownloadRetryCheck,
	TorrentDownloadStatus
} from './types';

export interface ListDownloadsParams {
	offset?: number;
	limit?: number;
	/** Repeated `statuses` filter; empty = all. */
	statuses?: TorrentDownloadStatus[];
}

/** Fetch a page of downloads. `userInitiated:false` for background reconciles. */
export function listDownloads(
	params: ListDownloadsParams = {},
	userInitiated = true
): Promise<DownloadListResponse> {
	const { offset = 0, limit = 50, statuses = [] } = params;
	const qs = new URLSearchParams();
	qs.set('offset', String(offset));
	qs.set('limit', String(limit));
	for (const s of statuses) qs.append('statuses', s);
	return apiFetch<DownloadListResponse>(`/api/v1/downloads?${qs}`, { userInitiated });
}

/** Fetch one download (the `?id=` single view). */
export function getDownload(id: number): Promise<DownloadItem> {
	return apiFetch<DownloadItem>(`/api/v1/downloads/${id}`);
}

/** Delete a download (204) with per-target options. The backend cascades to all same-hash downloads. */
export function deleteDownload(id: number, body: DeleteDownloadRequest): Promise<void> {
	return apiFetch<void>(`/api/v1/downloads/${id}/delete`, {
		method: 'POST',
		body,
		unwrap: false
	});
}

/** Retry a failed/deleted/discarded download (204). */
export function retryDownload(id: number): Promise<void> {
	return apiFetch<void>(`/api/v1/downloads/${id}/retry`, { method: 'POST', unwrap: false });
}

/** Pre-retry check — `superseded` ⇒ confirm before replacing a newer download. */
export function checkDownloadRetry(id: number): Promise<DownloadRetryCheck> {
	return apiFetch<DownloadRetryCheck>(`/api/v1/downloads/${id}/retry/check`, { method: 'POST' });
}
