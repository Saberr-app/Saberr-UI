/* =============================================================================
 * SABERR MAPPINGS API CALLS
 * -----------------------------------------------------------------------------
 * Stats + AniList↔TVDB override CRUD, and the blocking refresh. `refreshMappings`
 * resolves only when the backend finishes rebuilding relations/mappings — call
 * `getMappingStats` afterwards to show the fresh counts. (TVDB search lives in `search.ts`.)
 * ========================================================================== */

import { apiFetch } from './client';
import type {
	MappingOverrideItem,
	MappingOverrideListResponse,
	MappingOverrideRequest,
	MappingStatsResponse
} from './types';

/** Relation/mapping counts + last-refresh timestamps. */
export function getMappingStats(userInitiated = true): Promise<MappingStatsResponse> {
	return apiFetch<MappingStatsResponse>('/api/v1/mapping-stats', { userInitiated });
}

/** All mapping overrides (enriched with AniList + TVDB display data). */
export async function getMappingOverrides(): Promise<MappingOverrideItem[]> {
	const res = await apiFetch<MappingOverrideListResponse>('/api/v1/mapping-overrides');
	return res.mapping_overrides;
}

/** Create an override; echoes the stored, enriched item. 422 = validation error. */
export function createMappingOverride(body: MappingOverrideRequest): Promise<MappingOverrideItem> {
	return apiFetch<MappingOverrideItem>('/api/v1/mapping-overrides', { method: 'POST', body });
}

/** Update an override; echoes the stored, enriched item. */
export function updateMappingOverride(
	id: number,
	body: MappingOverrideRequest
): Promise<MappingOverrideItem> {
	return apiFetch<MappingOverrideItem>(`/api/v1/mapping-overrides/${id}`, { method: 'PUT', body });
}

/** Delete an override (204). */
export function deleteMappingOverride(id: number): Promise<void> {
	return apiFetch<void>(`/api/v1/mapping-overrides/${id}`, { method: 'DELETE', unwrap: false });
}

/** Rebuild anime-relations + AniList↔TVDB mappings (204). ⚠️ Blocks until finished. */
export function refreshMappings(): Promise<void> {
	return apiFetch<void>('/api/v1/mappings/refresh', { method: 'POST', unwrap: false });
}
