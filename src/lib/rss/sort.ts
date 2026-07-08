/* =============================================================================
 * SABERR RSS — SORTING & ARRANGEMENT. Default created_at desc. Rows are PRIMARY-sorted into
 * tiers (selected → tracked → untracked) — never inverted by direction — then by the chosen column.
 * When grouped, the sort applies within each group; group order only changes when sorting by title.
 * ========================================================================== */

import type { SortDirection, TorrentListItem } from '$lib/api/types';
import { isInTrackedRange } from './recognition';
import { resolveTitle } from './resolve';
import { groupKey, groupLabel, type TorrentGroup } from './group';

export type SortKey = 'title' | 'episode' | 'size' | 'seed' | 'downloads' | 'created';

export interface SortState {
	key: SortKey;
	dir: SortDirection;
}

export const DEFAULT_SORT: SortState = { key: 'created', dir: 'desc' };

/** Numeric/string value for the column comparison (tie-break handled by caller). */
function columnValue(item: TorrentListItem, key: SortKey): number | string {
	const r = item.rss_torrent;
	switch (key) {
		case 'title':
			return resolveTitle(item).value.toLowerCase();
		case 'episode': {
			if (item.anilist_episode_numbers.length) return Math.min(...item.anilist_episode_numbers);
			const ex = r.explicit_resolved_attributes?.episode_number;
			const fz = r.fuzzy_resolved_attributes?.episode_number;
			return ex ?? fz ?? 0;
		}
		case 'size':
			return r.size;
		case 'seed':
			return r.seeders;
		case 'downloads':
			return r.downloads;
		case 'created':
			return Date.parse(r.created_at) || 0;
	}
}

function cmp(a: number | string, b: number | string): number {
	if (typeof a === 'string' || typeof b === 'string') return String(a).localeCompare(String(b));
	return a - b;
}

/** Predicate telling whether a row is currently selected (for the top tier). */
export type SelectedPredicate = (item: TorrentListItem) => boolean;

/** Row comparator: three tiers (selected, tracked, untracked) each sorted by the chosen column;
 *  tiers never inverted by direction, created_at desc the tie-break. */
export function compareItems(
	a: TorrentListItem,
	b: TorrentListItem,
	sort: SortState,
	isSelected?: SelectedPredicate
): number {
	const ra = tier(a, isSelected);
	const rb = tier(b, isSelected);
	if (ra !== rb) return ra - rb;

	let c = cmp(columnValue(a, sort.key), columnValue(b, sort.key));
	if (sort.dir === 'desc') c = -c;
	if (c !== 0) return c;

	// Stable tie-break: newest first.
	return (Date.parse(b.rss_torrent.created_at) || 0) - (Date.parse(a.rss_torrent.created_at) || 0);
}

/** Tier rank (lower = higher in the list): 0 selected, 1 in-range tracked, 2 the rest.
 *  Out-of-range tracked rows tier with untracked (but stay selectable). */
function tier(item: TorrentListItem, isSelected?: SelectedPredicate): number {
	if (isSelected?.(item)) return 0;
	return isInTrackedRange(item) ? 1 : 2;
}

/** Sort a flat section of rows. */
export function arrangeFlat(
	items: TorrentListItem[],
	sort: SortState,
	isSelected?: SelectedPredicate
): TorrentListItem[] {
	return [...items].sort((a, b) => compareItems(a, b, sort, isSelected));
}

/** Ordered groups for the recognized section: items sort within each group; groups go selected-first,
 *  tracked-first, then title (when sorting by title) or first-appearance order. */
export function arrangeGroups(
	items: TorrentListItem[],
	sort: SortState,
	isSelected?: SelectedPredicate
): TorrentGroup[] {
	const order = new Map<string, number>();
	const buckets = new Map<string, TorrentListItem[]>();
	for (const it of items) {
		const k = groupKey(it);
		if (!buckets.has(k)) {
			buckets.set(k, []);
			order.set(k, order.size);
		}
		buckets.get(k)!.push(it);
	}

	const groups: TorrentGroup[] = [...buckets.entries()].map(([key, groupItems]) => ({
		key,
		label: groupLabel(groupItems[0]),
		items: [...groupItems].sort((a, b) => compareItems(a, b, sort, isSelected)),
		tracked: groupItems.some(isInTrackedRange),
		hasSelected: isSelected ? groupItems.some(isSelected) : false,
		hasImported: groupItems.some((t) => t.download?.status === 'PROCESSED')
	}));

	groups.sort((a, b) => {
		if (a.hasSelected !== b.hasSelected) return a.hasSelected ? -1 : 1;
		if (a.tracked !== b.tracked) return a.tracked ? -1 : 1;
		if (sort.key === 'title') {
			const c = a.label.localeCompare(b.label);
			return sort.dir === 'desc' ? -c : c;
		}
		return (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0);
	});

	return groups;
}
