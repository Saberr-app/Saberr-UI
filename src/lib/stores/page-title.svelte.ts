/* =============================================================================
 * SABERR PAGE-TITLE OVERRIDE — lets a dynamic page (e.g. a tracked-anime detail) feed its title to
 * the single `<title>` the app layout owns. One source of truth avoids competing `<svelte:head>`
 * titles (which don't reliably revert when a child page unmounts). Null ⇒ fall back to the nav-
 * derived title. A page sets it in an `$effect` and clears it (null) on teardown.
 * ========================================================================== */

let override = $state<string | null>(null);

export const pageTitleOverride = {
	get value(): string | null {
		return override;
	},
	set(v: string | null): void {
		override = v;
	}
};
