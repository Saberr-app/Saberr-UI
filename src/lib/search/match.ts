/* =============================================================================
 * SABERR GLOBAL-SEARCH MATCHER (pure) — partial, case-insensitive match of a query against
 * `SEARCH_INDEX`. Each entry scored by its strongest term (page > subpage > subtitle > section >
 * field), prefix matches beating mid-string. No state/IO.
 * ========================================================================== */

import {
	SEARCH_INDEX,
	KIND_PRIORITY,
	type SearchEntry,
	type MatchKind
} from '$lib/config/search-index';

export interface PageMatch {
	entry: SearchEntry;
	/** The strongest matching term's kind (drives whether we show a sub-line). */
	kind: MatchKind;
	/** The matched term text — shown underneath when it's settings detail. */
	matchedText: string;
	/** Lower is better. */
	score: number;
}

/** Kinds whose matched text is worth surfacing under the page row. */
const DETAIL_KINDS = new Set<MatchKind>(['subtitle', 'section', 'field']);

/** True when this match should render its matched text as a secondary line. */
export function showsDetail(m: PageMatch): boolean {
	return DETAIL_KINDS.has(m.kind);
}

/** Best (lowest) score for one entry against `q` (already lowercased), or null. */
function scoreEntry(entry: SearchEntry, q: string): PageMatch | null {
	let best: PageMatch | null = null;
	for (const term of entry.terms) {
		const idx = term.text.toLowerCase().indexOf(q);
		if (idx === -1) continue;
		// Priority band dominates; within a band, earlier matches and shorter terms win.
		const score = KIND_PRIORITY[term.kind] * 1000 + idx * 5 + term.text.length * 0.01;
		if (!best || score < best.score) {
			best = { entry, kind: term.kind, matchedText: term.text, score };
		}
	}
	return best;
}

/** All entries matching `query`, ranked best-first (unbounded). */
export function matchAll(query: string): PageMatch[] {
	const q = query.trim().toLowerCase();
	if (!q) return [];
	const matches: PageMatch[] = [];
	for (const entry of SEARCH_INDEX) {
		const m = scoreEntry(entry, q);
		if (m) matches.push(m);
	}
	return matches.sort((a, b) => a.score - b.score);
}

/** Top `limit` page matches for display. */
export function matchPages(query: string, limit = 3): PageMatch[] {
	return matchAll(query).slice(0, limit);
}

/** Whether any matched target is a settings page (gates the anime API auto-fire). */
export function hasSettingsMatch(matches: PageMatch[]): boolean {
	return matches.some((m) => m.entry.isSettings);
}
