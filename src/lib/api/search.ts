/* =============================================================================
 * SABERR GLOBAL SEARCH API
 * -----------------------------------------------------------------------------
 * The header search box's anime source. ⚠️ This is **POST** despite the openapi
 * ref labelling it GET-with-body (browsers can't send a GET body anyway).
 * ========================================================================== */

import { apiFetch } from './client';
import type { AnimeResult, SearchResponse, SearchTVDBResponse, TVDBSeriesResult } from './types';

/** Search anime by free text. Returns the (capped, backend-ranked) hit list. */
export async function searchAnime(query: string, signal?: AbortSignal): Promise<AnimeResult[]> {
	const res = await apiFetch<SearchResponse>('/api/v1/search', {
		method: 'POST',
		body: { query },
		// Background-style: the search box owns its own error UI, no global toast.
		userInitiated: false,
		signal
	});
	return res.anime;
}

/** Search TVDB series by free text (min 3 chars). Owns its own error UI, no global toast. */
export async function searchTvdb(query: string, signal?: AbortSignal): Promise<TVDBSeriesResult[]> {
	const res = await apiFetch<SearchTVDBResponse>('/api/v1/search/tvdb', {
		method: 'POST',
		body: { query },
		userInitiated: false,
		signal
	});
	return res.tvdb_series;
}
