/* =============================================================================
 * SABERR RSS — GROUPING ("By episode"). Groups recognized torrents by unique
 * (anilist_id · episode set · part · ceiling). Label "{title} — Episode(s) X[-Y] [Part A[/B]]".
 * Recognized section only; the unrecognized section is always flat.
 * ========================================================================== */

import type { TorrentListItem } from '$lib/api/types';
import { resolveTitle, partSuffix } from './resolve';

export interface TorrentGroup {
	key: string;
	label: string;
	items: TorrentListItem[];
	/** Any member is tracked (drives group ordering + the neutral/tracked styling). */
	tracked: boolean;
	/** Any member is selected (floats the group to the top tier). */
	hasSelected: boolean;
	/** Any member already imported (drives the aggregate status dot). */
	hasImported: boolean;
}

export function groupKey(item: TorrentListItem): string {
	return [
		item.anilist_id,
		[...item.anilist_episode_numbers].sort((a, b) => a - b).join(','),
		item.anilist_episode_part ?? 0,
		item.anilist_episode_part_ceiling ?? 0
	].join('|');
}

export function groupLabel(item: TorrentListItem): string {
	const title = resolveTitle(item).value;
	const eps = [...item.anilist_episode_numbers].sort((a, b) => a - b);
	const min = eps[0];
	const max = eps[eps.length - 1];
	const epText = min === max ? `Episode ${min}` : `Episodes ${min}-${max}`;
	return `${title} — ${epText}${partSuffix(item.anilist_episode_part, item.anilist_episode_part_ceiling)}`;
}
