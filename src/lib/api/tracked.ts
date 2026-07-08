/* =============================================================================
 * SABERR TRACKED-ANIME API CALLS
 * -----------------------------------------------------------------------------
 * Thin function per endpoint.
 *   - GET  `/tracked-anime`                       whole list + releasing-not-tracked counts
 *   - POST `/tracked-anime`                        create
 *   - GET  `/tracked-anime/{id}`                   tracked anime + episodes (detail page)
 *   - PUT/DELETE `/tracked-anime/{id}`             update / delete
 *   - POST `/tracked-anime/{id}/archive`           archive (204)
 *   - POST `/tracked-anime/{id}/unarchive`         unarchive (204, not in spec; mirrors archive)
 *   - POST `/tracked-anime/batch-archive|delete`   batch by anilist ids (204)
 *   - GET  `/tracked-anime/{id}/episodes/{n}`      one episode + its torrents (expand)
 * The list endpoint supports `force_freshness` (set on a user force-refresh).
 * ========================================================================== */

import { apiFetch } from './client';
import type {
	TrackedAnimeCreateRequest,
	TrackedAnimeEpisodeUpdateRequest,
	TrackedAnimeItem,
	TrackedAnimeItemEpisodeDetails,
	TrackedAnimeItemEpisodeList,
	TrackedAnimeItemWithEpisodes,
	TrackedAnimeListResponse,
	TrackedAnimeStatus,
	TrackedAnimeUpdateRequest
} from './types';

/** Fetch the full tracked list. `forceFreshness` on a user force-refresh; `status` for archived. */
export function listTrackedAnime(
	status: TrackedAnimeStatus = 'ACTIVE',
	forceFreshness = false,
	userInitiated = true
): Promise<TrackedAnimeListResponse> {
	const qs = new URLSearchParams({ status });
	if (forceFreshness) qs.set('force_freshness', 'true');
	return apiFetch<TrackedAnimeListResponse>(`/api/v1/tracked-anime?${qs}`, { userInitiated });
}

/** One tracked anime. `withEpisodes:false` skips loading episodes — ⚠️ its episode list
 *  is then EMPTY; never feed that into anything caching real episodes. */
export function getTrackedAnime(
	id: number,
	forceFreshness = false,
	withEpisodes = true
): Promise<TrackedAnimeItemWithEpisodes> {
	const qs = new URLSearchParams();
	if (forceFreshness) qs.set('force_freshness', 'true');
	if (!withEpisodes) qs.set('with_episodes', 'false');
	const suffix = qs.size ? `?${qs}` : '';
	return apiFetch<TrackedAnimeItemWithEpisodes>(`/api/v1/tracked-anime/${id}${suffix}`);
}

/** Look up an ARCHIVED tracked anime by anilist id (Track dialog offers Unarchive vs a
 *  duplicate create). null when not archived; silent — caller treats failure as "not archived". */
export async function findArchivedTrackedAnime(
	anilistId: number
): Promise<TrackedAnimeItem | null> {
	const qs = new URLSearchParams({ status: 'ARCHIVED', anilist_id: String(anilistId) });
	const res = await apiFetch<TrackedAnimeListResponse>(`/api/v1/tracked-anime?${qs}`, {
		userInitiated: false
	});
	return res.tracked_anime[0] ?? null;
}

/** Start tracking an anime (204, no body). */
export async function createTrackedAnime(body: TrackedAnimeCreateRequest): Promise<void> {
	await apiFetch<void>('/api/v1/tracked-anime', { method: 'POST', body, unwrap: false });
}

/** Update a tracked anime's settings (full body; `release_profile: null` resets to default). */
export function updateTrackedAnime(
	id: number,
	body: TrackedAnimeUpdateRequest
): Promise<TrackedAnimeItem> {
	return apiFetch<TrackedAnimeItem>(`/api/v1/tracked-anime/${id}`, { method: 'PUT', body });
}

/** Permanently delete a tracked anime (204 on success). */
export async function deleteTrackedAnime(id: number): Promise<void> {
	await apiFetch<void>(`/api/v1/tracked-anime/${id}`, { method: 'DELETE', unwrap: false });
}

/** Archive a tracked anime (204 on success). */
export async function archiveTrackedAnime(id: number): Promise<void> {
	await apiFetch<void>(`/api/v1/tracked-anime/${id}/archive`, { method: 'POST', unwrap: false });
}

/** Unarchive a tracked anime (204 on success; endpoint mirrors archive). */
export async function unarchiveTrackedAnime(id: number): Promise<void> {
	await apiFetch<void>(`/api/v1/tracked-anime/${id}/unarchive`, { method: 'POST', unwrap: false });
}

/** Batch-archive tracked anime by anilist id (204 on success). */
export async function batchArchiveTrackedAnime(anilistIds: number[]): Promise<void> {
	await apiFetch<void>('/api/v1/tracked-anime/batch-archive', {
		method: 'POST',
		body: { anilist_ids: anilistIds },
		unwrap: false
	});
}

/** Batch-delete tracked anime by anilist id (204 on success). */
export async function batchDeleteTrackedAnime(anilistIds: number[]): Promise<void> {
	await apiFetch<void>('/api/v1/tracked-anime/batch-delete', {
		method: 'POST',
		body: { anilist_ids: anilistIds },
		unwrap: false
	});
}

/** Fetch a window of episodes (offset/limit) for the detail page's show-more paging. */
export function listTrackedAnimeEpisodes(
	id: number,
	offset: number,
	limit: number,
	forceFreshness = false
): Promise<TrackedAnimeItemEpisodeList> {
	const qs = new URLSearchParams({ offset: String(offset), limit: String(limit) });
	if (forceFreshness) qs.set('force_freshness', 'true');
	return apiFetch<TrackedAnimeItemEpisodeList>(`/api/v1/tracked-anime/${id}/episodes?${qs}`);
}

/** Fetch one episode with its torrents (loaded when an episode row is expanded). */
export function getTrackedAnimeEpisodeDetails(
	id: number,
	episodeNumber: number,
	forceFreshness = false
): Promise<TrackedAnimeItemEpisodeDetails> {
	const qs = forceFreshness ? '?force_freshness=true' : '';
	return apiFetch<TrackedAnimeItemEpisodeDetails>(
		`/api/v1/tracked-anime/${id}/episodes/${episodeNumber}${qs}`,
		{ userInitiated: false }
	);
}

/** Toggle an episode's auto-discard flag (204 on success). */
export async function updateTrackedAnimeEpisode(
	id: number,
	episodeNumber: number,
	body: TrackedAnimeEpisodeUpdateRequest
): Promise<void> {
	await apiFetch<void>(`/api/v1/tracked-anime/${id}/episodes/${episodeNumber}`, {
		method: 'PUT',
		body,
		unwrap: false
	});
}
