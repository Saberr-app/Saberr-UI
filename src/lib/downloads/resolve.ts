/* =============================================================================
 * SABERR DOWNLOADS DISPLAY HELPERS — turn a `DownloadItem` into display text/chips, plus the live
 * overlay merging a streamed `DownloadStreamItem` (qbit FLATTENED) back onto the nested-qbit shape.
 * Status colors/labels reused from `tracked/status.ts` + `tracked/qbit.ts`.
 * ========================================================================== */

import type { Download, DownloadItem, DownloadStreamItem } from '$lib/api/types';
import { displayTitle, secondaryTitle } from '$lib/anilist/titles';
import { joinEpisodes, partSuffix } from '$lib/rss/resolve';

/** AniList titles wrapper from a download's `anime` block. */
function titled(item: DownloadItem) {
	return {
		english_title: item.anime.anilist_english_title,
		romaji_title: item.anime.anilist_romaji_title,
		native_title: item.anime.anilist_native_title
	};
}

export function downloadTitle(item: DownloadItem): string {
	return displayTitle(titled(item));
}

export function downloadSecondaryTitle(item: DownloadItem): string | null {
	return secondaryTitle(titled(item));
}

/** "Episode 5" / "Episodes 1-3" (+ " Part 1/2"), or null when no episodes are known. */
export function downloadEpisode(item: DownloadItem): string | null {
	const eps = joinEpisodes(item.anilist_episode_numbers);
	if (!eps) return null;
	const plural = eps.includes('-') ? 's' : '';
	return `Episode${plural} ${eps}${partSuffix(item.anilist_episode_part, item.anilist_episode_part_ceiling)}`;
}

/** Spec tag chips: release group, resolution, encoding, source (excl. "Other"),
 *  language code, `vN` when version > 1, `Repack` when flagged. */
export function downloadSpecChips(item: DownloadItem): string[] {
	const t = item.torrent;
	const chips: string[] = [];
	if (t.release_group) chips.push(t.release_group);
	if (t.resolution) chips.push(t.resolution);
	if (t.encoding) chips.push(t.encoding);
	if (t.source && t.source !== 'Other') chips.push(t.source);
	if (t.language_code) chips.push(t.language_code);
	if (t.version_number > 1) chips.push(`v${t.version_number}`);
	if (t.repack_indicator) chips.push('Repack');
	return chips;
}

/** Overlay the latest streamed fields onto a download (qbit flattened → nested); no tick → unchanged. */
export function applyLive(item: DownloadItem, live: DownloadStreamItem | undefined): DownloadItem {
	if (!live) return item;
	return {
		...item,
		status: live.status,
		status_details: live.status_details,
		download_directory_path: live.download_directory_path,
		source_path: live.source_path,
		destination_path: live.destination_path,
		copied_to_destination_path_at: live.copied_to_destination_path_at,
		qbit_status: { status: live.qbit_status, progress: live.qbit_progress, eta: live.qbit_eta }
	};
}

/** Overlay a tick onto a tracked/RSS `Download` (flat qbit). Used by the episode dialog + RSS rows;
 *  null download or no tick → unchanged. */
export function applyLiveToDownload(
	download: Download | null,
	live: DownloadStreamItem | undefined
): Download | null {
	if (!download || !live) return download;
	return {
		...download,
		status: live.status,
		status_details: live.status_details,
		download_directory_path: live.download_directory_path,
		destination_path: live.destination_path,
		copied_to_destination_path_at: live.copied_to_destination_path_at,
		qbit_status: live.qbit_status,
		qbit_progress: live.qbit_progress,
		qbit_eta: live.qbit_eta
	};
}
