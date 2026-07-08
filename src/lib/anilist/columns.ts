/* =============================================================================
 * SABERR TABLE COLUMNS — registry for the List/Compact views (Browse + user list expose
 * different columns). Owns per-column metadata (label, contexts, defaults, locks, align).
 * `lockedIn` = mandatory (always visible, can't be toggled).
 * ========================================================================== */

export type CollectionContext = 'browse' | 'userlist' | 'tracked';

export type ColumnId =
	| 'title'
	| 'format'
	| 'airing'
	| 'meanScore'
	| 'popularity'
	| 'startDate'
	| 'endDate'
	| 'season'
	| 'episodes'
	| 'next'
	| 'genres'
	| 'studio'
	| 'country'
	| 'myStatus'
	| 'tracked'
	| 'progress'
	| 'myScore'
	| 'started'
	| 'completed'
	| 'repeat'
	| 'private'
	| 'notes'
	| 'structure'
	| 'trackedEpisodes'
	| 'episodeProgress'
	| 'showName';

/** Click-to-sort adapter for the table header. `key`/`dir` reflect the active sort (namespace-agnostic
 *  string, so both the client `SortKey` and server `UserAnimeListSortBy` fit); `sortKeyFor` returns the
 *  sort key a column maps to (null = not sortable in this context); `onSort` toggles/switches. */
export interface ColumnSort {
	key: string;
	dir: 'asc' | 'desc';
	sortKeyFor: (col: ColumnId) => string | null;
	onSort: (col: ColumnId) => void;
}

export interface ColumnDef {
	id: ColumnId;
	label: string;
	/** Per-context label override (e.g. mean score = "Score" vs "Anime score"). */
	labelBy?: Partial<Record<CollectionContext, string>>;
	contexts: CollectionContext[];
	defaultOn: CollectionContext[];
	/** Contexts where this column is mandatory (always shown, not toggleable). */
	lockedIn?: CollectionContext[];
	align?: 'left' | 'right' | 'center';
}

// Browse order; user-list-only columns interleaved where sensible (filtered per context).
export const COLUMNS: ColumnDef[] = [
	{
		id: 'title',
		label: 'Title',
		contexts: ['browse', 'userlist', 'tracked'],
		defaultOn: ['browse', 'userlist', 'tracked'],
		lockedIn: ['browse', 'userlist', 'tracked']
	},
	{
		id: 'structure',
		label: 'Structure',
		contexts: ['tracked'],
		defaultOn: ['tracked'],
		align: 'center'
	},
	{
		id: 'trackedEpisodes',
		label: 'Tracked episodes',
		contexts: ['tracked'],
		defaultOn: ['tracked'],
		align: 'center'
	},
	{
		id: 'episodeProgress',
		label: 'Coverage',
		contexts: ['tracked'],
		defaultOn: ['tracked']
	},
	{
		id: 'showName',
		label: 'Show name',
		contexts: ['tracked'],
		defaultOn: []
	},
	{
		id: 'format',
		label: 'Format',
		labelBy: { userlist: 'Type' },
		contexts: ['browse', 'userlist', 'tracked'],
		defaultOn: ['browse', 'userlist']
	},
	{
		id: 'airing',
		label: 'Status',
		contexts: ['browse', 'userlist', 'tracked'],
		defaultOn: ['browse', 'tracked']
	},
	{
		id: 'meanScore',
		label: 'Score',
		labelBy: { userlist: 'Anime score' },
		contexts: ['browse', 'userlist', 'tracked'],
		defaultOn: ['browse', 'userlist'],
		align: 'center'
	},
	{
		id: 'myScore',
		label: 'My score',
		contexts: ['userlist'],
		defaultOn: ['userlist'],
		align: 'center'
	},
	{ id: 'progress', label: 'Progress', contexts: ['userlist'], defaultOn: ['userlist'] },
	{ id: 'popularity', label: 'Popularity', contexts: ['browse'], defaultOn: [], align: 'right' },
	{ id: 'startDate', label: 'Start date', contexts: ['browse', 'tracked'], defaultOn: [] },
	{ id: 'endDate', label: 'End date', contexts: ['browse', 'tracked'], defaultOn: [] },
	{
		id: 'season',
		label: 'Season',
		contexts: ['browse', 'userlist', 'tracked'],
		defaultOn: ['userlist', 'tracked']
	},
	{
		id: 'episodes',
		label: 'Episodes',
		contexts: ['browse', 'userlist', 'tracked'],
		defaultOn: ['browse', 'tracked'],
		align: 'center'
	},
	{
		id: 'next',
		label: 'Next episode',
		contexts: ['browse', 'userlist', 'tracked'],
		defaultOn: ['browse', 'userlist', 'tracked']
	},
	{ id: 'genres', label: 'Genres', contexts: ['browse'], defaultOn: [] },
	{ id: 'studio', label: 'Studio', contexts: ['browse'], defaultOn: [] },
	{ id: 'country', label: 'Country', contexts: ['browse'], defaultOn: [], align: 'center' },
	{ id: 'started', label: 'Started', contexts: ['userlist'], defaultOn: [] },
	{ id: 'completed', label: 'Completed', contexts: ['userlist'], defaultOn: [] },
	{ id: 'repeat', label: 'Rewatches', contexts: ['userlist'], defaultOn: [], align: 'center' },
	{ id: 'private', label: 'Private', contexts: ['userlist'], defaultOn: [], align: 'center' },
	{ id: 'notes', label: 'Notes', contexts: ['userlist'], defaultOn: [] },
	{
		id: 'myStatus',
		label: 'My list',
		labelBy: { tracked: 'User status' },
		contexts: ['browse', 'userlist', 'tracked'],
		defaultOn: ['browse', 'tracked'],
		lockedIn: ['browse'],
		align: 'left'
	},
	{
		id: 'tracked',
		label: 'Tracked',
		contexts: ['browse', 'userlist'],
		defaultOn: ['browse', 'userlist'],
		lockedIn: ['browse'],
		align: 'center'
	}
];

/** Display order for the tracked-list table. */
const TRACKED_COLUMN_ORDER: ColumnId[] = [
	'title',
	'structure',
	'trackedEpisodes',
	'episodeProgress',
	'next',
	'season',
	'showName',
	'episodes',
	'airing',
	'meanScore',
	'startDate',
	'endDate',
	'format',
	'myStatus'
];

const byId = new Map(COLUMNS.map((c) => [c.id, c]));

export const columnDef = (id: ColumnId): ColumnDef | undefined => byId.get(id);

export const columnLabel = (c: ColumnDef, ctx: CollectionContext): string =>
	c.labelBy?.[ctx] ?? c.label;

export const isColumnLocked = (c: ColumnDef, ctx: CollectionContext): boolean =>
	c.lockedIn?.includes(ctx) ?? false;

/** Columns available for a context. Tracked uses its own fixed order. */
export const columnsFor = (ctx: CollectionContext): ColumnDef[] => {
	const available = COLUMNS.filter((c) => c.contexts.includes(ctx));
	if (ctx !== 'tracked') return available;
	return [...available].sort(
		(a, b) => TRACKED_COLUMN_ORDER.indexOf(a.id) - TRACKED_COLUMN_ORDER.indexOf(b.id)
	);
};

/** Default visible column ids for a context, in registry order. */
export const defaultColumnIds = (ctx: CollectionContext): ColumnId[] =>
	columnsFor(ctx)
		.filter((c) => c.defaultOn.includes(ctx))
		.map((c) => c.id);
