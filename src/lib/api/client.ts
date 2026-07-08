/* =============================================================================
 * SABERR HTTP CLIENT
 * -----------------------------------------------------------------------------
 * Single entry point for backend calls. Responsibilities:
 *   - attach `Authorization: Bearer <token>` (unless `skipAuth`, e.g. login)
 *   - unwrap the top-level `data` envelope (toggle with `unwrap: false`)
 *   - normalize failures into `ApiError` and apply global handling:
 *       * 401 auth codes -> clear token (where applicable) + route to /login
 *       * other errors on user-initiated calls -> toast the `detail`
 *   - background work passes `userInitiated: false` to stay silent
 * ========================================================================== */

import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { apiUrl } from '$lib/config/api';
import { getToken, clearToken } from '$lib/stores/auth';
import { ApiError, GENERIC_ERROR_MESSAGE, TOKEN_INVALIDATING_CODES } from './errors';

export interface RequestOptions {
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	/** JSON-serializable request body. */
	body?: unknown;
	/** Skip the Authorization header (login only). */
	skipAuth?: boolean;
	/** Unwrap the top-level `data` field (default true). Set false for un-wrapped endpoints. */
	unwrap?: boolean;
	/**
	 * Whether a user is actively waiting on this request. User-initiated failures
	 * are toasted; background ones (polling) are not. Default true.
	 */
	userInitiated?: boolean;
	signal?: AbortSignal;
}

interface ErrorBody {
	code?: string;
	/** Backend `ErrorResponse.detail` is a string; FastAPI's default 422 makes it an array. */
	detail?: unknown;
}

/** Perform an API call. Resolves with the (optionally unwrapped) body, or throws `ApiError`. */
export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
	const {
		method = 'GET',
		body,
		skipAuth = false,
		unwrap = true,
		userInitiated = true,
		signal
	} = opts;

	const headers: Record<string, string> = { Accept: 'application/json' };
	if (body !== undefined) headers['Content-Type'] = 'application/json';
	if (!skipAuth) {
		const token = getToken();
		if (token) headers['Authorization'] = `Bearer ${token}`;
	}

	let res: Response;
	try {
		res = await fetch(apiUrl(path), {
			method,
			headers,
			body: body !== undefined ? JSON.stringify(body) : undefined,
			signal
		});
	} catch (e) {
		// Aborted requests are expected (e.g. polling teardown) — surface quietly.
		if (signal?.aborted) throw e;
		const err = new ApiError(0, null, null);
		if (userInitiated) notify(GENERIC_ERROR_MESSAGE);
		throw err;
	}

	const payload = await readJson(res);

	if (!res.ok) {
		const errBody = (payload ?? {}) as ErrorBody;
		// Only a string `detail` is a real backend message; FastAPI's default 422 ships an
		// array of validation errors — treat that as generic (ignore those).
		const detail = typeof errBody.detail === 'string' ? errBody.detail : null;
		const err = new ApiError(res.status, errBody.code ?? null, detail);
		handleError(err, userInitiated);
		throw err;
	}

	return (unwrap ? (payload as { data: T })?.data : (payload as T)) as T;
}

async function readJson(res: Response): Promise<unknown> {
	const text = await res.text();
	if (!text) return null;
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

/** Global side effects for a failed request: auth routing + toasts. */
function handleError(err: ApiError, userInitiated: boolean): void {
	if (err.status === 401) {
		// UNAUTHORIZED is expected to be caught explicitly by the caller (e.g. wrong
		// login credentials, or a 3rd-party action) — don't redirect or toast here.
		if (err.code === 'UNAUTHORIZED') return;

		// MISSING/MALFORMED/EXPIRED/INVALID auth header -> session is unusable.
		if (err.code && TOKEN_INVALIDATING_CODES.has(err.code)) clearToken();
		if (browser) goto('/login');
		return;
	}

	if (userInitiated) notify(err.detail);
}

/** Lazy-load the toast helper so this module stays import-safe in non-browser paths. */
function notify(message: string): void {
	if (!browser) return;
	import('./notify').then(({ notifyError }) => notifyError(message));
}
