/* =============================================================================
 * SABERR SETTINGS / SERVICE API CALLS
 * -----------------------------------------------------------------------------
 * One thin function per backend endpoint. PUT calls echo the saved section (callers
 * adopt it). Test/connect calls are 204→true; failures throw (the client toasts detail).
 * ========================================================================== */

import { apiFetch } from './client';
import type {
	GeneralSettings,
	ProfileSettings,
	RssSettings,
	ProcessingSettings,
	DiscordSettings,
	QbitSettings,
	QbitSettingsUpdate,
	QbitConnection,
	AnilistLoginRequest,
	AnilistLoginResponse,
	AnilistUserData
} from './types';

/* --- Per-section saves (PUT, return the saved section) ---------------------- */

export const updateGeneral = (body: GeneralSettings) =>
	apiFetch<GeneralSettings>('/api/v1/settings/general', { method: 'PUT', body });

export const updateProfile = (body: ProfileSettings) =>
	apiFetch<ProfileSettings>('/api/v1/settings/profile', { method: 'PUT', body });

export const updateRss = (body: RssSettings) =>
	apiFetch<RssSettings>('/api/v1/settings/rss', { method: 'PUT', body });

export const updateProcessing = (body: ProcessingSettings) =>
	apiFetch<ProcessingSettings>('/api/v1/settings/processing', { method: 'PUT', body });

export const updateDiscord = (body: DiscordSettings) =>
	apiFetch<DiscordSettings>('/api/v1/settings/discord', { method: 'PUT', body });

export const updateQbit = (body: QbitSettingsUpdate) =>
	apiFetch<QbitSettings>('/api/v1/settings/qbit/service', { method: 'PUT', body });

/* --- Connection / path tests (204 on success → true) ----------------------- */

export async function testQbit(body: QbitConnection): Promise<boolean> {
	await apiFetch<void>('/api/v1/settings/qbit/test', { method: 'POST', body, unwrap: false });
	return true;
}

export async function testDiscord(webhookUrl: string): Promise<boolean> {
	await apiFetch<void>('/api/v1/settings/discord/test', {
		method: 'POST',
		body: { webhook_url: webhookUrl },
		unwrap: false
	});
	return true;
}

export async function validatePath(path: string, validateWritable = false): Promise<boolean> {
	await apiFetch<void>('/api/v1/system/validate-path', {
		method: 'POST',
		body: { path, validate_writable: validateWritable },
		unwrap: false
	});
	return true;
}

/* --- AniList connect flow --------------------------------------------------- */

/** Verify a token and resolve the account's username (so the user can confirm). */
export function anilistTest(token: string): Promise<AnilistLoginResponse> {
	const body: AnilistLoginRequest = { anilist_user_token: token };
	return apiFetch<AnilistLoginResponse>('/api/v1/settings/anilist/test', { method: 'POST', body });
}

/** Commit the connection (may take a few seconds). Echoes back the account profile. */
export function anilistAuthenticate(token: string): Promise<AnilistUserData> {
	const body: AnilistLoginRequest = { anilist_user_token: token };
	return apiFetch<AnilistUserData>('/api/v1/settings/anilist/authenticate', {
		method: 'POST',
		body
	});
}

/** Disconnect AniList (removes the synced anime list on the backend). 204 on success. */
export async function anilistLogout(): Promise<void> {
	await apiFetch<void>('/api/v1/settings/anilist/logout', { method: 'POST', unwrap: false });
}
