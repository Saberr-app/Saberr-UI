/* =============================================================================
 * SABERR API ERRORS
 * -----------------------------------------------------------------------------
 * Normalized error for everything the HTTP client throws. Missing `detail`/`code` ⇒ the
 * body came from a proxy/middleware, not the backend → generic. Network = status 0.
 * ========================================================================== */

import type { ApiErrorCode } from './types';

export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export class ApiError extends Error {
	readonly status: number;
	readonly code: ApiErrorCode | null;
	readonly detail: string;
	/** True when the backend itself did not produce the body (proxy/middleware/network). */
	readonly isGeneric: boolean;

	constructor(status: number, code: ApiErrorCode | null, detail: string | null) {
		const isGeneric = !code || !detail;
		const message = detail ?? GENERIC_ERROR_MESSAGE;
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.code = code ?? null;
		this.detail = message;
		this.isGeneric = isGeneric;
	}
}

export function isApiError(e: unknown): e is ApiError {
	return e instanceof ApiError;
}

/** The 401 codes that mean "the session is invalid — clear token and go to login". */
export const TOKEN_INVALIDATING_CODES = new Set<ApiErrorCode>([
	'MALFORMED_AUTH_HEADER',
	'TOKEN_EXPIRED',
	'INVALID_TOKEN'
]);
