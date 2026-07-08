/* =============================================================================
 * SABERR TRACKED-ANIME EPISODE DISPLAY HELPERS — collapsed episode-row text from an episode's
 * TVDB mapping. One tracked episode can map to several TVDB episodes (a range) or to a part of
 * one (`tvdb_episode_part`/`_ceiling`). Lists are sorted by episode number as a safety measure.
 * ========================================================================== */

import type { TrackedAnimeItemEpisode, TVDBFinaleType, TVDBSeriesEpisode } from '$lib/api/types';
import { resolveBackendUrl } from '$lib/config/api';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** "from → total": single when from===total; `—` when total<from; `from →` when total unknown. */
export function trackedEpisodeRange(from: number, total: number | null | undefined): string {
	if (total == null) return `${from} →`;
	if (total < from) return '—';
	if (total === from) return String(from);
	return `${from} → ${total}`;
}

/** Sort tracked episodes ascending by episode number (non-mutating). */
export const sortEpisodes = <T extends { episode_number: number }>(eps: T[]): T[] =>
	[...eps].sort((a, b) => a.episode_number - b.episode_number);

/** Sort an episode's TVDB episodes ascending by number (non-mutating). */
export const sortTvdbEpisodes = (eps: TVDBSeriesEpisode[]): TVDBSeriesEpisode[] =>
	[...eps].sort((a, b) => a.number - b.number);

/** "SxxEyy" (or "SxxEyy-Ezz" across a range), first TVDB episode's season. null when unmapped. */
export function episodeCode(tvdbEpisodes: TVDBSeriesEpisode[]): string | null {
	if (tvdbEpisodes.length === 0) return null;
	const eps = sortTvdbEpisodes(tvdbEpisodes);
	const first = eps[0];
	const last = eps[eps.length - 1];
	const base = `S${pad2(first.season_number)}•E${pad2(first.number)}`;
	return last.number !== first.number ? `${base}-E${pad2(last.number)}` : base;
}

/** Absolute number(s) in parens, only when they differ from the TVDB number(s) ("(135)" / "(135-136)"). */
export function absoluteSuffix(tvdbEpisodes: TVDBSeriesEpisode[]): string | null {
	if (tvdbEpisodes.length === 0) return null;
	const eps = sortTvdbEpisodes(tvdbEpisodes);
	const differs = eps.some((e) => e.absolute_number !== e.number);
	if (!differs) return null;
	const first = eps[0].absolute_number;
	const last = eps[eps.length - 1].absolute_number;
	return last !== first ? `(${first}-${last})` : `(${first})`;
}

/** TVDB titles, " / "-joined, skipping blanks. Null when none. */
export function joinTvdbTitles(tvdbEpisodes: TVDBSeriesEpisode[]): string | null {
	const titles = sortTvdbEpisodes(tvdbEpisodes)
		.map((e) => e.title?.trim())
		.filter((t): t is string => !!t);
	return titles.length ? titles.join(' / ') : null;
}

/** "Part x/y" when the episode maps to a part of a TVDB entry; else null. */
export function partLabel(ep: TrackedAnimeItemEpisode): string | null {
	if (ep.tvdb_episode_part == null || ep.tvdb_episode_part_ceiling == null) return null;
	return `Part ${ep.tvdb_episode_part}/${ep.tvdb_episode_part_ceiling}`;
}

/** Air date (ISO) from the first TVDB episode, when available. */
export function episodeAirDate(tvdbEpisodes: TVDBSeriesEpisode[]): string | null {
	if (tvdbEpisodes.length === 0) return null;
	return sortTvdbEpisodes(tvdbEpisodes)[0].air_date;
}

/** Finale type from the last TVDB episode (a range's finale is its tail). */
export function episodeFinaleType(tvdbEpisodes: TVDBSeriesEpisode[]): TVDBFinaleType | null {
	if (tvdbEpisodes.length === 0) return null;
	const eps = sortTvdbEpisodes(tvdbEpisodes);
	return eps[eps.length - 1].finale_type;
}

/** Candidate image URLs (backend-resolved), in order, for the expanded card. */
export function episodeImages(tvdbEpisodes: TVDBSeriesEpisode[]): string[] {
	return sortTvdbEpisodes(tvdbEpisodes)
		.map((e) => resolveBackendUrl(e.image_url))
		.filter((u): u is string => !!u);
}
