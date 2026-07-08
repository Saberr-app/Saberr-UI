/* =============================================================================
 * SABERR CONTEXT-MENU COORDINATOR (runes) — per-item menus are independent bits-ui
 * instances; this singleton keeps only ONE open at a time (bits-ui won't dismiss across
 * instances on long-press) and records the close time so the dismissing tap is swallowed.
 * ========================================================================== */

class ContextMenuController {
	/** Identity of the currently open menu, or null when none is open. */
	openId = $state<symbol | null>(null);
	/** When a menu most recently closed (ms) — drives the dismiss-tap suppression. */
	private closedAt = 0;

	open(id: symbol): void {
		this.openId = id;
	}

	/** Mark `id` closed — but only if it's the menu we currently think is open. */
	close(id: symbol): void {
		if (this.openId === id) {
			this.openId = null;
			this.closedAt = Date.now();
		}
	}

	/** Force any open menu shut (the item handles dismissing it on tap/click). */
	closeAll(): void {
		if (this.openId !== null) this.closedAt = Date.now();
		this.openId = null;
	}

	get isOpen(): boolean {
		return this.openId !== null;
	}

	/** True when a menu was open within the last `ms` — the dismissing click lands here. */
	recentlyClosed(ms = 300): boolean {
		return Date.now() - this.closedAt < ms;
	}
}

export const contextMenu = new ContextMenuController();
