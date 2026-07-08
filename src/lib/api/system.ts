/* =============================================================================
 * SABERR SYSTEM API CALLS
 * -----------------------------------------------------------------------------
 * Whole-app lifecycle actions. Kept silent (`userInitiated:false`) so the caller
 * owns the messaging — a graceful shutdown may drop the connection mid-response.
 * ========================================================================== */

import { apiFetch } from './client';
import type { AppReleaseItem, BackupItem, BackupListResponse, SystemStats } from './types';

/** Ask the backend to shut itself down. */
export function shutdownSystem(): Promise<void> {
	return apiFetch<void>('/api/v1/system/shutdown', {
		method: 'POST',
		unwrap: false,
		userInitiated: false
	});
}

/** Fetch app/uptime/disk stats for the System page. (GET — the spec mislabels it POST.) */
export function getSystemStats(): Promise<SystemStats> {
	return apiFetch<SystemStats>('/api/v1/system/stats');
}

/** Fetch the latest upstream release (for the About page's update check). Pass
 *  `userInitiated:false` for the implicit on-entry check so a failure stays silent;
 *  the manual "Check for updates" click leaves it default (true) so errors toast. */
export function getLatestAppRelease(userInitiated = true): Promise<AppReleaseItem> {
	return apiFetch<AppReleaseItem>('/api/v1/system/app-releases/latest', { userInitiated });
}

/** Fetch the currently-installed release's notes (About page version chip). */
export function getCurrentAppRelease(): Promise<AppReleaseItem> {
	return apiFetch<AppReleaseItem>('/api/v1/system/app-releases/current');
}

/** List all backups (unordered — the UI sorts newest-first). */
export function getBackups(): Promise<BackupListResponse> {
	return apiFetch<BackupListResponse>('/api/v1/system/backups');
}

/** Create a fresh backup of the current data. Returns the new archive's metadata. */
export function createBackup(): Promise<BackupItem> {
	return apiFetch<BackupItem>('/api/v1/system/backups', { method: 'POST' });
}

/** Schedule `filename` to be restored on the next app restart (204). */
export function restoreBackup(filename: string): Promise<void> {
	return apiFetch<void>(`/api/v1/system/backups/${encodeURIComponent(filename)}/restore`, {
		method: 'POST',
		unwrap: false
	});
}

/** Delete a backup archive (204). */
export function deleteBackup(filename: string): Promise<void> {
	return apiFetch<void>(`/api/v1/system/backups/${encodeURIComponent(filename)}`, {
		method: 'DELETE',
		unwrap: false
	});
}
