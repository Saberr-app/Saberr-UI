/* =============================================================================
 * SABERR API CONFIG — backend base URL + URL builders. Set the URL in `.env`.
 * ========================================================================== */

/**
 * Backend base URL, baked in at **build time** (no runtime env). Unset/empty ⇒ every
 * API + relative asset URL resolves against the frontend's own origin (the backend-hosted
 * build wants this). `build-be` forces it empty; `dev`/`build`/`preview` use `.env`.
 */
export const API_BASE_URL: string | null = import.meta.env.VITE_API_BASE_URL || null;

/** Base with any trailing slash removed; `''` ⇒ relative to the frontend origin. */
const NORMALIZED_BASE = (API_BASE_URL ?? '').replace(/\/+$/, '');

export function apiUrl(path: string): string {
	return NORMALIZED_BASE + (path.startsWith('/') ? path : '/' + path);
}

/**
 * Resolve a URL the backend handed us. Absolute (`scheme:` or `//host`) → untouched;
 * relative → resolved against the base. Nullish → null.
 */
export function resolveBackendUrl(url: string | null | undefined): string | null {
	if (!url) return null;
	if (url.startsWith('//') || /^[a-z][a-z\d+\-.]*:/i.test(url)) return url;
	return NORMALIZED_BASE + (url.startsWith('/') ? url : '/' + url);
}
