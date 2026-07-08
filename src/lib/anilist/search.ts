/* =============================================================================
 * SABERR BROWSE SEARCH FORM — the Search tab is server-driven: controls edit a draft
 * `SearchForm` committed on submit. Models the form, the friendly sort options (base key + dir,
 * since the API encodes direction in the enum), and the translation to `listAnime` params.
 * The `/anime` API only takes INCLUDE arrays for status/format/source (include+exclude for genres/tags).
 * ========================================================================== */

import type {
	AnilistAnimeFormat,
	AnilistAnimeSeason,
	AnilistAnimeSource,
	AnilistAnimeStatus,
	AnimeSortBy
} from '$lib/api/types';
import { emptyFilter, type FilterState, type TriSet } from './collection';

/** Base sort keys offered in Search (asc/desc handled separately). */
export type SearchSortKey =
	| 'TRENDING'
	| 'POPULARITY'
	| 'SCORE'
	| 'FAVOURITES'
	| 'TITLE_ROMAJI'
	| 'START_DATE'
	| 'END_DATE'
	| 'EPISODES'
	| 'UPDATED_AT';

export const SEARCH_SORT_OPTIONS: { value: SearchSortKey; label: string }[] = [
	{ value: 'TRENDING', label: 'Trending' },
	{ value: 'POPULARITY', label: 'Popularity' },
	{ value: 'SCORE', label: 'Score' },
	{ value: 'FAVOURITES', label: 'Favourites' },
	{ value: 'TITLE_ROMAJI', label: 'Title' },
	{ value: 'START_DATE', label: 'Start date' },
	{ value: 'END_DATE', label: 'End date' },
	{ value: 'EPISODES', label: 'Episodes' },
	{ value: 'UPDATED_AT', label: 'Last updated' }
];

export type SortDir = 'asc' | 'desc';

/** Combine a base key + direction into the API's `AnimeSortBy` value. */
export function toAnimeSortBy(key: SearchSortKey, dir: SortDir): AnimeSortBy {
	return (dir === 'desc' ? `${key}_DESC` : key) as AnimeSortBy;
}

export interface SearchForm {
	query: string;
	season: AnilistAnimeSeason | null;
	seasonYear: number | null;
	sortKey: SearchSortKey;
	sortDir: SortDir;
	filter: FilterState;
}

/** Default search shown on tab open: trending, descending, no other constraints. */
export const defaultSearchForm = (): SearchForm => ({
	query: '',
	season: null,
	seasonYear: null,
	sortKey: 'TRENDING',
	sortDir: 'desc',
	filter: emptyFilter()
});

const includes = (s: TriSet) => Object.keys(s).filter((k) => s[k] === 'include');
const excludes = (s: TriSet) => Object.keys(s).filter((k) => s[k] === 'exclude');

/** On-list membership tri-state from the checkbox pair (both/neither = either). */
function onListFilter(f: FilterState): boolean | null {
	if (f.onList && !f.notOnList) return true;
	if (f.notOnList && !f.onList) return false;
	return null;
}

/** Translate a search form into `listAnime` params (filters → include/exclude). */
export function searchToListParams(form: SearchForm) {
	const f = form.filter;
	return {
		query: form.query.trim() || undefined,
		season: form.season,
		seasonYear: form.seasonYear,
		statuses: includes(f.status) as AnilistAnimeStatus[],
		formats: includes(f.formats) as AnilistAnimeFormat[],
		sources: includes(f.sources) as AnilistAnimeSource[],
		genres: includes(f.genres),
		excludeGenres: excludes(f.genres),
		tags: includes(f.tags),
		excludeTags: excludes(f.tags),
		onList: onListFilter(f),
		sortBy: [toAnimeSortBy(form.sortKey, form.sortDir)]
	};
}
