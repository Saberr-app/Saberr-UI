/* =============================================================================
 * SABERR COLLECTION ENGINE — pure client search/filter/group/sort over AnimeRows (Browse
 * Season View; server-driven Search/user-list bypass this). Sort: single key + dir, tie-break
 * title, missing-attr rows sink. Group: fixed-order collapsible sections. Filter: tri-state chips.
 * ========================================================================== */

import type {
	AnilistAnimeFormat,
	AnilistAnimeSource,
	AnilistAnimeStatus,
	AnilistDate
} from '$lib/api/types';
import { ANILIST_ANIME_FORMATS, ANILIST_ANIME_SOURCES } from '$lib/api/types';
import type { AnimeRow } from './row';
import { displayTitle } from './titles';
import { airingStatusLabel, formatLabel } from './enums';
import {
	AIRING_STATUS_ACCENT,
	FORMAT_ACCENT,
	MUTED_ACCENT,
	WATCH_STATUS_ACCENT,
	type Accent
} from './colors';

/* --- Search ---------------------------------------------------------------- */

export function searchRows(rows: AnimeRow[], query: string): AnimeRow[] {
	const q = query.trim().toLowerCase();
	if (!q) return rows;
	return rows.filter((r) => {
		const hay = [r.english_title, r.romaji_title, r.native_title, ...r.synonyms]
			.filter(Boolean)
			.map((s) => (s as string).toLowerCase());
		return hay.some((s) => s.includes(q));
	});
}

/* --- Sort ------------------------------------------------------------------ */

export type SortKey = 'title' | 'popularity' | 'score' | 'airdate' | 'next' | 'episodes';
export interface SortState {
	key: SortKey;
	dir: 'asc' | 'desc';
}

export const SORT_LABELS: Record<SortKey, string> = {
	title: 'Title',
	popularity: 'Popularity',
	score: 'Score',
	airdate: 'Air date',
	next: 'Next episode',
	episodes: 'Episodes'
};

const titleKey = (r: AnimeRow) => displayTitle(r).toLowerCase();

function startOrd(d: AnilistDate | null): number | null {
	if (!d || d.year == null) return null;
	return d.year * 10000 + (d.month ?? 1) * 100 + (d.day ?? 1);
}

function sortValue(r: AnimeRow, key: SortKey): number | null {
	switch (key) {
		case 'popularity':
			return r.popularity ?? null;
		case 'score':
			return r.meanScore && r.meanScore > 0 ? r.meanScore : null;
		case 'airdate':
			return startOrd(r.startDate);
		case 'next': {
			// Sort on the displayed value: only a future airing renders a countdown, so treat
			// past/missing as null (they sink instead of being pulled up by a small timestamp).
			const at = r.nextEpisode?.airing_at ?? null;
			return at != null && at > Date.now() / 1000 ? at : null;
		}
		case 'episodes':
			return r.episodes ?? null;
		default:
			return null;
	}
}

export function sortRows(rows: AnimeRow[], sort: SortState): AnimeRow[] {
	const out = [...rows];
	out.sort((a, b) => {
		if (sort.key === 'title') {
			const c = titleKey(a).localeCompare(titleKey(b));
			return sort.dir === 'asc' ? c : -c;
		}
		const va = sortValue(a, sort.key);
		const vb = sortValue(b, sort.key);
		if (va == null && vb == null) return titleKey(a).localeCompare(titleKey(b));
		if (va == null) return 1; // missing → bottom regardless of direction
		if (vb == null) return -1;
		if (va !== vb) return sort.dir === 'asc' ? va - vb : vb - va;
		return titleKey(a).localeCompare(titleKey(b)); // tie-break: title asc
	});
	return out;
}

/* --- Group ----------------------------------------------------------------- */

export type GroupKey = 'none' | 'list_status' | 'airing_status' | 'format';

export const GROUP_LABELS: Record<GroupKey, string> = {
	none: 'None',
	list_status: 'List status',
	airing_status: 'Airing status',
	format: 'Format'
};

export interface RowGroup {
	id: string;
	label: string;
	accent: Accent;
	rows: AnimeRow[];
}

/** Ordered bucket definitions per group mode. */
function bucketsFor(
	key: GroupKey
): Array<{ id: string; label: string; accent: Accent; match: (r: AnimeRow) => boolean }> {
	if (key === 'list_status') {
		return [
			{
				id: 'watching',
				label: 'Watching',
				accent: WATCH_STATUS_ACCENT.CURRENT,
				match: (r) => r.entry?.status === 'CURRENT' || r.entry?.status === 'REPEATING'
			},
			{
				id: 'planning',
				label: 'Planning',
				accent: WATCH_STATUS_ACCENT.PLANNING,
				match: (r) => r.entry?.status === 'PLANNING'
			},
			{
				id: 'paused',
				label: 'On hold',
				accent: WATCH_STATUS_ACCENT.PAUSED,
				match: (r) => r.entry?.status === 'PAUSED'
			},
			{
				id: 'completed',
				label: 'Completed',
				accent: WATCH_STATUS_ACCENT.COMPLETED,
				match: (r) => r.entry?.status === 'COMPLETED'
			},
			{
				id: 'dropped',
				label: 'Dropped',
				accent: WATCH_STATUS_ACCENT.DROPPED,
				match: (r) => r.entry?.status === 'DROPPED'
			},
			{ id: 'none', label: 'Not on list', accent: MUTED_ACCENT, match: (r) => r.entry == null }
		];
	}
	if (key === 'airing_status') {
		const order: AnilistAnimeStatus[] = [
			'FINISHED',
			'RELEASING',
			'NOT_YET_RELEASED',
			'CANCELLED',
			'HIATUS'
		];
		return order.map((s) => ({
			id: s,
			label: airingStatusLabel(s),
			accent: AIRING_STATUS_ACCENT[s],
			match: (r: AnimeRow) => r.airingStatus === s
		}));
	}
	// format
	const order: AnilistAnimeFormat[] = ['TV', 'ONA', 'OVA', 'SPECIAL', 'MOVIE', 'TV_SHORT', 'MUSIC'];
	return order.map((f) => ({
		id: f,
		label: formatLabel(f),
		accent: FORMAT_ACCENT[f],
		match: (r: AnimeRow) => r.format === f
	}));
}

/** Partition already-sorted rows into ordered, non-empty groups. */
export function groupRows(rows: AnimeRow[], key: GroupKey): RowGroup[] {
	if (key === 'none') {
		return [{ id: 'all', label: '', accent: MUTED_ACCENT, rows }];
	}
	const buckets = bucketsFor(key);
	return buckets
		.map((b) => ({ id: b.id, label: b.label, accent: b.accent, rows: rows.filter(b.match) }))
		.filter((g) => g.rows.length > 0);
}

/* --- Filter ---------------------------------------------------------------- */

export type TriState = 'include' | 'exclude';
export type TriSet = Record<string, TriState>;

export interface FilterState {
	/** Include adult titles (default false = exclude). */
	adult: boolean;
	onList: boolean;
	notOnList: boolean;
	tracked: boolean;
	notTracked: boolean;
	status: TriSet;
	formats: TriSet;
	sources: TriSet;
	genres: TriSet;
	tags: TriSet;
}

export const emptyFilter = (): FilterState => ({
	adult: false,
	onList: false,
	notOnList: false,
	tracked: false,
	notTracked: false,
	status: {},
	formats: {},
	sources: {},
	genres: {},
	tags: {}
});

/** Cycle a tri-state value: off → include → exclude → off. */
export function cycleTri(set: TriSet, value: string): TriSet {
	const next = { ...set };
	const cur = next[value];
	if (cur === undefined) next[value] = 'include';
	else if (cur === 'include') next[value] = 'exclude';
	else delete next[value];
	return next;
}

/** Toggle an include-only value: off → include → off (Search filters; `/anime` has no exclude param). */
export function cycleTriInclude(set: TriSet, value: string): TriSet {
	const next = { ...set };
	if (next[value] === 'include') delete next[value];
	else next[value] = 'include';
	return next;
}

const triCount = (s: TriSet) => Object.keys(s).length;

/** Number of active filter constraints (drives the Filter button badge). */
export function filterCount(f: FilterState): number {
	let n = 0;
	if (f.adult) n++;
	if (f.onList) n++;
	if (f.notOnList) n++;
	if (f.tracked) n++;
	if (f.notTracked) n++;
	n += triCount(f.status) + triCount(f.formats) + triCount(f.sources);
	n += triCount(f.genres) + triCount(f.tags);
	return n;
}

export const isFilterActive = (f: FilterState): boolean => filterCount(f) > 0;

function matchTriSingle(value: string | null, set: TriSet): boolean {
	const includes = Object.keys(set).filter((k) => set[k] === 'include');
	const excludes = Object.keys(set).filter((k) => set[k] === 'exclude');
	if (value != null && excludes.includes(value)) return false;
	if (includes.length > 0) return value != null && includes.includes(value);
	return true;
}

function matchTriMulti(values: string[], set: TriSet): boolean {
	for (const k of Object.keys(set)) {
		const has = values.includes(k);
		if (set[k] === 'include' && !has) return false;
		if (set[k] === 'exclude' && has) return false;
	}
	return true;
}

export function matchesFilter(r: AnimeRow, f: FilterState): boolean {
	if (!f.adult && r.isAdult) return false;

	const on = r.entry != null;
	if (f.onList && !f.notOnList && !on) return false;
	if (f.notOnList && !f.onList && on) return false;

	const tracked = r.trackedAnimeId != null;
	if (f.tracked && !f.notTracked && !tracked) return false;
	if (f.notTracked && !f.tracked && tracked) return false;

	if (!matchTriSingle(r.airingStatus, f.status)) return false;
	if (!matchTriSingle(r.format, f.formats)) return false;
	if (!matchTriSingle(r.source, f.sources)) return false;
	if (!matchTriMulti(r.genres, f.genres)) return false;
	if (
		!matchTriMulti(
			r.tags.map((t) => t.name),
			f.tags
		)
	)
		return false;

	return true;
}

export const filterRows = (rows: AnimeRow[], f: FilterState): AnimeRow[] =>
	rows.filter((r) => matchesFilter(r, f));

/* --- Present-option pruning (Season View) ---------------------------------- */

export interface PresentOptions {
	statuses: AnilistAnimeStatus[];
	formats: AnilistAnimeFormat[];
	sources: AnilistAnimeSource[];
	genres: string[];
	tags: string[];
}

/** Which option values actually appear in the loaded rows (to prune filters). */
export function presentOptions(rows: AnimeRow[]): PresentOptions {
	const statuses = new Set<AnilistAnimeStatus>();
	const formats = new Set<AnilistAnimeFormat>();
	const sources = new Set<AnilistAnimeSource>();
	const genres = new Set<string>();
	const tags = new Set<string>();
	for (const r of rows) {
		statuses.add(r.airingStatus);
		if (r.format) formats.add(r.format);
		if (r.source) sources.add(r.source);
		for (const g of r.genres) genres.add(g);
		for (const t of r.tags) tags.add(t.name);
	}
	return {
		statuses: [...statuses],
		formats: ANILIST_ANIME_FORMATS.filter((f) => formats.has(f)),
		sources: ANILIST_ANIME_SOURCES.filter((s) => sources.has(s)),
		genres: [...genres].sort((a, b) => a.localeCompare(b)),
		tags: [...tags]
	};
}
