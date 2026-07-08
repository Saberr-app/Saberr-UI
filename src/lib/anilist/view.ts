/* =============================================================================
 * SABERR COLLECTION VIEW MODES — shared by Browse + user list. `card`/`mega`/`poster` are grids;
 * `list`/`compact` are tables (list has a thumbnail column, compact doesn't).
 * ========================================================================== */

import type { IconName } from '$lib/config/icons';

export type ViewMode = 'card' | 'mega' | 'poster' | 'list' | 'compact';

export const VIEW_MODES: { mode: ViewMode; label: string; icon: IconName }[] = [
	{ mode: 'card', label: 'Card', icon: 'view-card' },
	{ mode: 'mega', label: 'Mega', icon: 'view-mega' },
	{ mode: 'poster', label: 'Poster', icon: 'view-poster' },
	{ mode: 'list', label: 'List', icon: 'view-list' },
	{ mode: 'compact', label: 'Compact', icon: 'view-compact' }
];

/** Whether a view mode is a table (uses the column system). */
export const isTableView = (v: ViewMode): boolean => v === 'list' || v === 'compact';
