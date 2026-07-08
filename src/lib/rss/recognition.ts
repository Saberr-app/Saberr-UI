/* =============================================================================
 * SABERR RSS — RECOGNITION. RECOGNIZED ⟺ `anilist_id` + non-empty `anilist_episode_numbers` +
 * explicit non-null encoding/resolution/release_group (`missing_required` is ignored — we check
 * the three ourselves). Only recognized + tracked rows are selectable/discardable/downloadable
 * (download + discard need a `tracked_anime_id`).
 * ========================================================================== */

import type { RSSTorrentResolvedAttributes, TorrentListItem } from '$lib/api/types';

/** Explicit attrs present with the three required fields → enough to build a download. */
export function explicitComplete(
	ex: RSSTorrentResolvedAttributes | null | undefined
): ex is RSSTorrentResolvedAttributes {
	return ex != null && ex.encoding != null && ex.resolution != null && ex.release_group != null;
}

export function isRecognized(item: TorrentListItem): boolean {
	return (
		item.anilist_id != null &&
		item.anilist_episode_numbers.length > 0 &&
		explicitComplete(item.rss_torrent.explicit_resolved_attributes)
	);
}

export function isTracked(item: TorrentListItem): boolean {
	return item.tracked_anime_id != null;
}

/** Tracked AND at least one parsed episode falls in the tracked range (≥ `tracked_from_episode`).
 *  Drives tiering/grouping/grey-out only — out-of-range tracked rows stay selectable/downloadable. */
export function isInTrackedRange(item: TorrentListItem): boolean {
	return (
		isTracked(item) &&
		item.tracked_from_episode != null &&
		item.anilist_episode_numbers.some((e) => e >= item.tracked_from_episode!)
	);
}

/** Rows that participate in selection + batch Discard/Download (recognized AND tracked). */
export function isSelectable(item: TorrentListItem): boolean {
	return isRecognized(item) && isTracked(item);
}

/** Discardable: selectable and not already imported (a processed download can't be discarded). */
export function isDiscardable(item: TorrentListItem): boolean {
	return isSelectable(item) && item.download?.status !== 'PROCESSED';
}

/** Backend wants this torrent (seeds the user's selection) unless it already downloaded. */
export function isAutoSelected(item: TorrentListItem): boolean {
	return item.selected && item.download == null && isSelectable(item);
}

export function hasErrorNote(item: TorrentListItem): boolean {
	return item.notes.some((n) => n.is_error);
}
