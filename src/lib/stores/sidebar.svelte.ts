/* =============================================================================
 * SABERR SIDEBAR STORE (runes) — desktop sidebar collapsed/expanded pref, persisted to
 * localStorage. The mobile drawer is unaffected (always full).
 * ========================================================================== */

import { browser } from '$app/environment';

const STORAGE_KEY = 'saberr_sidebar_collapsed';

class SidebarStore {
	/** Whether the desktop sidebar is the icon-only rail. */
	collapsed = $state(browser && localStorage.getItem(STORAGE_KEY) === 'true');

	/** Flip collapsed/expanded and persist the choice. */
	toggle(): void {
		this.collapsed = !this.collapsed;
		if (browser) localStorage.setItem(STORAGE_KEY, String(this.collapsed));
	}
}

export const sidebar = new SidebarStore();
