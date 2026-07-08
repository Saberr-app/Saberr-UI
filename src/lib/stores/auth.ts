/* =============================================================================
 * SABERR AUTH — token lifecycle. JWT + expiry (unix s) in localStorage, sent as
 * `Bearer <token>`. getToken() self-expires; watchExpiry() redirects to /login at lapse;
 * ========================================================================== */

import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { apiFetch } from '$lib/api/client';
import type { LoginRequest, LoginResponse } from '$lib/api/types';

const TOKEN_KEY = 'saberr_token';
const EXPIRES_KEY = 'saberr_token_expires_at';
const LAST_USERNAME_KEY = 'saberr_last_username';

let expiryTimer: ReturnType<typeof setTimeout> | undefined;

function nowSeconds(): number {
	return Math.floor(Date.now() / 1000);
}

export function getExpiresAt(): number | null {
	if (!browser) return null;
	const raw = localStorage.getItem(EXPIRES_KEY);
	return raw ? Number(raw) : null;
}

/** The last username that successfully signed in, for autofilling the login form. */
export function getLastUsername(): string {
	if (!browser) return '';
	return localStorage.getItem(LAST_USERNAME_KEY) ?? '';
}

/** Remember the username after a successful sign-in (never the password). */
export function setLastUsername(username: string): void {
	if (!browser || !username) return;
	localStorage.setItem(LAST_USERNAME_KEY, username);
}

/** The current token, or null if missing/expired. Expired tokens are cleared. */
export function getToken(): string | null {
	if (!browser) return null;
	const token = localStorage.getItem(TOKEN_KEY);
	if (!token) return null;

	const expiresAt = getExpiresAt();
	if (expiresAt !== null && expiresAt <= nowSeconds()) {
		clearToken();
		return null;
	}
	return token;
}

export function isAuthed(): boolean {
	return getToken() !== null;
}

function setSession(token: string, expiresAt: number): void {
	if (!browser) return;
	localStorage.setItem(TOKEN_KEY, token);
	localStorage.setItem(EXPIRES_KEY, String(expiresAt));
	watchExpiry();
}

export function clearToken(): void {
	if (!browser) return;
	localStorage.removeItem(TOKEN_KEY);
	localStorage.removeItem(EXPIRES_KEY);
	if (expiryTimer) clearTimeout(expiryTimer);
}

/** Authenticate. Throws `ApiError` (login page catches UNAUTHORIZED for "wrong credentials"). */
export async function login(credentials: LoginRequest): Promise<void> {
	const res = await apiFetch<LoginResponse>('/api/v1/login', {
		method: 'POST',
		body: credentials,
		skipAuth: true,
		unwrap: false // login response is not data-wrapped
	});
	setSession(res.token, res.expires_at);
	setLastUsername(credentials.username);
}

export function logout(): void {
	clearToken();
}

/** Schedule a /login redirect for the instant the token expires. Safe to call repeatedly. */
export function watchExpiry(): void {
	if (!browser) return;
	if (expiryTimer) clearTimeout(expiryTimer);

	const expiresAt = getExpiresAt();
	if (expiresAt === null) return;

	const msUntilExpiry = (expiresAt - nowSeconds()) * 1000;
	if (msUntilExpiry <= 0) {
		clearToken();
		goto('/login');
		return;
	}
	// setTimeout caps near ~24.8 days; clamp and let it re-arm on the next tick.
	const delay = Math.min(msUntilExpiry, 2_000_000_000);
	expiryTimer = setTimeout(() => {
		if (delay < msUntilExpiry) {
			watchExpiry(); // not actually expired yet — reschedule
		} else {
			clearToken();
			goto('/login');
		}
	}, delay);
}
