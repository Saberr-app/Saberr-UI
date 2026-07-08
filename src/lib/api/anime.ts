/* =============================================================================
 * SABERR ANIME / BROWSE / USER-LIST API CALLS
 * -----------------------------------------------------------------------------
 * Thin function per endpoint.
 *   - `/anime`            Browse search + season view (server forces page size 50)
 *   - `/anime/{id}`       Full anime + the user's entry + tracked id
 *   - `/anime/anilist-metadata`  all genres/tags for filters
 *   - `/anime-list`       The user's list (caller controls page size)
 *   - PUT/DELETE `/anime-list/{id}`  update / remove a list entry
 * Array filters are repeated query params (same pattern as notifications/audit).
 * ========================================================================== */

import { apiFetch } from './client';
import type {
	AnilistAnimeFormat,
	AnilistAnimeSeason,
	AnilistAnimeSource,
	AnilistAnimeStatus,
	AnilistAnimeUserStatus,
	AnilistMetadataResponse,
	AnimeExtras,
	AnimeItemWithUserEntry,
	AnimeListResponse,
	AnimeTitlesResponse,
	AnimeSortBy,
	SortDirection,
	UserAnimeBatchUpdateRequestData,
	UserAnimeBatchUpdateResponse,
	UserAnimeListItem,
	UserAnimeListResponse,
	UserAnimeListSortBy,
	UserAnimeUpdateRequest,
	UserAnimeUpdateResponse
} from './types';

/* --- Browse: `/anime` ------------------------------------------------------- */

export interface ListAnimeParams {
	query?: string | null;
	statuses?: AnilistAnimeStatus[];
	season?: AnilistAnimeSeason | null;
	seasonYear?: number | null;
	formats?: AnilistAnimeFormat[];
	sources?: AnilistAnimeSource[];
	genres?: string[];
	tags?: string[];
	excludeGenres?: string[];
	excludeTags?: string[];
	/** Membership filter: true = on the user's list, false = not, null/undefined = either. */
	onList?: boolean | null;
	sortBy?: AnimeSortBy[];
	/** 1-based page; server forces a page size of 50. */
	page?: number;
	forceFreshness?: boolean;
	/** Background (poll-like) calls pass false to stay silent on failure. */
	userInitiated?: boolean;
}

/** Fetch a page of anime (Browse season view loops pages; search paginates). */
export function listAnime(params: ListAnimeParams = {}): Promise<AnimeListResponse> {
	const {
		query,
		statuses = [],
		season,
		seasonYear,
		formats = [],
		sources = [],
		genres = [],
		tags = [],
		excludeGenres = [],
		excludeTags = [],
		onList = null,
		sortBy = [],
		page = 1,
		forceFreshness = false,
		userInitiated = true
	} = params;

	const qs = new URLSearchParams();
	if (query) qs.set('query', query);
	for (const s of statuses) qs.append('statuses', s);
	if (season) qs.set('season', season);
	if (seasonYear != null) qs.set('season_year', String(seasonYear));
	for (const f of formats) qs.append('formats', f);
	for (const s of sources) qs.append('sources', s);
	for (const g of genres) qs.append('genres', g);
	for (const t of tags) qs.append('tags', t);
	for (const g of excludeGenres) qs.append('exclude_genres', g);
	for (const t of excludeTags) qs.append('exclude_tags', t);
	if (onList != null) qs.set('on_list', String(onList));
	for (const s of sortBy) qs.append('sort_by', s);
	qs.set('page', String(page));
	if (forceFreshness) qs.set('force_freshness', 'true');

	return apiFetch<AnimeListResponse>(`/api/v1/anime?${qs}`, { userInitiated });
}

/** Fetch a single anime with the user's entry + tracking state. */
export function getAnime(
	anilistId: number,
	forceFreshness = false
): Promise<AnimeItemWithUserEntry> {
	const qs = forceFreshness ? '?force_freshness=true' : '';
	return apiFetch<AnimeItemWithUserEntry>(`/api/v1/anime/${anilistId}${qs}`);
}

/** Candidate titles for an anime (folder-name suggestions). Silent on failure — the caller
 *  falls back to the anime's own titles. */
export function getAnimeTitles(anilistId: number): Promise<AnimeTitlesResponse> {
	return apiFetch<AnimeTitlesResponse>(`/api/v1/anime/${anilistId}/titles`, {
		userInitiated: false
	});
}

/** All genres/tags for building filters (cached by the metadata store, 1-week TTL). */
export function getAnilistMetadata(userInitiated = false): Promise<AnilistMetadataResponse> {
	return apiFetch<AnilistMetadataResponse>('/api/v1/anime/anilist-metadata', { userInitiated });
}

/** Relations / characters / staff for the anime detail view (best-effort, silent). */
export function getAnimeExtras(anilistId: number, forceFreshness = false): Promise<AnimeExtras> {
	const qs = forceFreshness ? '?force_freshness=true' : '';
	return apiFetch<AnimeExtras>(`/api/v1/anime/${anilistId}/extras${qs}`, { userInitiated: false });
}

/* --- User list: `/anime-list` ---------------------------------------------- */

export interface ListUserAnimeParams {
	query?: string | null;
	statuses?: AnilistAnimeUserStatus[];
	season?: AnilistAnimeSeason | null;
	seasonYear?: number | null;
	/** Tracked-status filter: true = tracked, false = not tracked, null/undefined = either. */
	isTracked?: boolean | null;
	/** Airing-status filter (RELEASING/FINISHED/…) — include-only, empty = any. */
	airingStatuses?: AnilistAnimeStatus[];
	/** Format filter (TV/MOVIE/…) — include-only, empty = any. */
	formats?: AnilistAnimeFormat[];
	sortBy?: UserAnimeListSortBy;
	sortDirection?: SortDirection;
	offset?: number;
	limit?: number;
	forceFreshness?: boolean;
	userInitiated?: boolean;
}

/** Fetch a page of the user's anime list (caller controls offset/limit). */
export function listUserAnime(params: ListUserAnimeParams = {}): Promise<UserAnimeListResponse> {
	const {
		query,
		statuses = [],
		season,
		seasonYear,
		isTracked = null,
		airingStatuses = [],
		formats = [],
		sortBy = 'season_and_year',
		sortDirection = 'desc',
		offset = 0,
		limit = 100,
		forceFreshness = false,
		userInitiated = true
	} = params;

	const qs = new URLSearchParams();
	if (query) qs.set('query', query);
	for (const s of statuses) qs.append('statuses', s);
	if (season) qs.set('season', season);
	if (seasonYear != null) qs.set('season_year', String(seasonYear));
	if (isTracked != null) qs.set('is_tracked', String(isTracked));
	for (const s of airingStatuses) qs.append('airing_statuses', s);
	for (const f of formats) qs.append('formats', f);
	qs.set('sort_by', sortBy);
	qs.set('sort_direction', sortDirection);
	qs.set('offset', String(offset));
	qs.set('limit', String(limit));
	if (forceFreshness) qs.set('force_freshness', 'true');

	return apiFetch<UserAnimeListResponse>(`/api/v1/anime-list?${qs}`, { userInitiated });
}

/** The user's single list entry (same shape as a `/anime-list` row). 404 when not on the
 *  list — pass `userInitiated:false` to keep that expected miss from toasting. */
export function getUserAnimeEntry(
	anilistId: number,
	userInitiated = true
): Promise<UserAnimeListItem> {
	return apiFetch<UserAnimeListItem>(`/api/v1/anime-list/${anilistId}`, { userInitiated });
}

/** Create/update the user's list entry for an anime (full PUT; echoes the saved entry). */
export function updateUserAnimeEntry(
	anilistId: number,
	body: UserAnimeUpdateRequest
): Promise<UserAnimeUpdateResponse> {
	return apiFetch<UserAnimeUpdateResponse>(`/api/v1/anime-list/${anilistId}`, {
		method: 'PUT',
		body
	});
}

/** Remove the user's list entry for an anime (204 on success). */
export async function deleteUserAnimeEntry(anilistId: number): Promise<void> {
	await apiFetch<void>(`/api/v1/anime-list/${anilistId}`, { method: 'DELETE', unwrap: false });
}

/* --- Batch update / delete -------------------------------------------------- */

/** Partial update across many entries (`data` = only the changed fields). Echoes them;
 *  the whole call 404/422s on any failure (no partial-result body). */
export function batchUpdateAnimeList(
	anilistIds: number[],
	data: UserAnimeBatchUpdateRequestData
): Promise<UserAnimeBatchUpdateResponse> {
	return apiFetch<UserAnimeBatchUpdateResponse>('/api/v1/anime-list/batch-update', {
		method: 'POST',
		body: { anilist_ids: anilistIds, data }
	});
}

/** Remove many entries at once (204 on success). */
export async function batchDeleteAnimeList(anilistIds: number[]): Promise<void> {
	await apiFetch<void>('/api/v1/anime-list/batch-delete', {
		method: 'POST',
		body: { anilist_ids: anilistIds },
		unwrap: false
	});
}
