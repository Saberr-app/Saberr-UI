/* =============================================================================
 * SABERR TRACKED-LIST BANNER DISMISSAL
 * -----------------------------------------------------------------------------
 * "Don't show again" persists in the browser for up to a month (per banner key);
 * the plain X is in-memory only (the page holds that state). Stale entries are
 * cleaned on read.
 * ========================================================================== */

export type TrackedBannerKey = 'not_on_list' | 'releasing' | 'finished';

const PREFIX = 'saberr_tracked_banner_';
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export function isBannerDismissed(key: TrackedBannerKey): boolean {
	if (typeof localStorage === 'undefined') return false;
	const raw = localStorage.getItem(PREFIX + key);
	if (!raw) return false;
	const ts = Number(raw);
	if (!ts || Date.now() - ts > MONTH_MS) {
		localStorage.removeItem(PREFIX + key);
		return false;
	}
	return true;
}

export function dismissBannerForMonth(key: TrackedBannerKey): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(PREFIX + key, String(Date.now()));
}
