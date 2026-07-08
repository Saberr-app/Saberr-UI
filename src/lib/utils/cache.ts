/* =============================================================================
 * SABERR CLIENT CACHE FRESHNESS — in-memory caches refetch past this TTL.
 * ========================================================================== */

export const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/** True when a cache entry recorded at `loadedAt` (ms) is missing or expired. */
export const isStale = (loadedAt: number | null | undefined): boolean =>
	loadedAt == null || Date.now() - loadedAt > CACHE_TTL_MS;
