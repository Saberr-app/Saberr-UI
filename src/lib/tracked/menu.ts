/* =============================================================================
 * SABERR TRACKING MENU CONTROL — per-row tracking actions the anime menus render when a
 * collection has tracking enabled. `AnimeCollection` builds one per row + owns the dialogs.
 * Archive/Unarchive/Delete are tracked-page only (null elsewhere).
 * ========================================================================== */

export interface TrackingMenuCtl {
	/** Tracking id when the anime is tracked; null when it isn't. */
	trackedAnimeId: number | null;
	/** Open the create dialog (shown when not tracked). */
	onTrack: () => void;
	/** Open the edit dialog (shown when tracked). */
	onEditTracking: () => void;
	/** Link to the tracked detail page, or null to hide the item. */
	gotoHref: string | null;
	/** Link to the anime's Browse detail ("Go to anime"), or null to hide the item. */
	animeHref: string | null;
	/** Deep-link to RSS search for this anime's torrents, or null to hide (shown whenever tracked). */
	searchTorrentsHref: string | null;
	/** Tracked page only — open the archive confirm. */
	onArchive: (() => void) | null;
	/** Tracked page only — unarchive (archived view). */
	onUnarchive: (() => void) | null;
	/** Tracked page only — open the delete confirm. */
	onDelete: (() => void) | null;
	/** True when viewing the archived list (show Unarchive instead of Archive). */
	archived: boolean;
}
