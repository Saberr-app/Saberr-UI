/* =============================================================================
 * SABERR CREDENTIALS / PASSWORD-RESET API
 * -----------------------------------------------------------------------------
 * Five endpoints behind the windows-only credentials feature. The login-page
 * flows (status / setup / request / code-reset) run unauthed (`skipAuth`); the
 * logged-in change authenticates with the old password. All POSTs are 204.
 * ========================================================================== */

import { apiFetch } from './client';
import type { CredentialsStatus, CredentialsSetupRequest, ResetPasswordRequest } from './types';

/** Whether credentials exist + the app context. Unauthed; safe to call on the login page. */
export function getCredentialsStatus(): Promise<CredentialsStatus> {
	return apiFetch<CredentialsStatus>('/api/v1/credentials-status', {
		skipAuth: true,
		userInitiated: false
	});
}

/** Initial credentials setup (login page, unauthed). 204. */
export function setupCredentials(body: CredentialsSetupRequest): Promise<void> {
	return apiFetch<void>('/api/v1/credentials-setup', {
		method: 'POST',
		body,
		skipAuth: true,
		unwrap: false,
		userInitiated: false
	});
}

/** Ask the backend to generate a reset code (written to a file in the data dir). 204. */
export function requestPasswordReset(): Promise<void> {
	return apiFetch<void>('/api/v1/request-password-reset', {
		method: 'POST',
		skipAuth: true,
		unwrap: false,
		userInitiated: false
	});
}

/** Reset the password with a reset code (login page, unauthed). 204. */
export function resetPasswordWithCode(reset_code: string, new_password: string): Promise<void> {
	const body: ResetPasswordRequest = { reset_code, old_password: null, new_password };
	return apiFetch<void>('/api/v1/reset-password', {
		method: 'POST',
		body,
		skipAuth: true,
		unwrap: false,
		userInitiated: false
	});
}

/** Change the password while logged in, authenticating with the old one. 204. */
export function changePassword(old_password: string, new_password: string): Promise<void> {
	const body: ResetPasswordRequest = { reset_code: null, old_password, new_password };
	return apiFetch<void>('/api/v1/reset-password', {
		method: 'POST',
		body,
		unwrap: false,
		userInitiated: false
	});
}
