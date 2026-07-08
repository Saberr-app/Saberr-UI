/* =============================================================================
 * SABERR CALENDAR — ENRICHMENT. Joins each `AiringScheduleItem` to its `ScheduleAnimeItem` (by
 * `anilist_id`) into a normalized `CalendarEpisode`. Deduped by id (overlapping scopes repeat them);
 * items whose anime is missing from the response are dropped.
 * ========================================================================== */

import type {
	AiringScheduleListResponse,
	AnilistAnimeFormat,
	ScheduleAnimeItem,
	TorrentDownloadStatus
} from '$lib/api/types';
import { displayTitle } from '$lib/anilist/titles';
import { resolveBackendUrl } from '$lib/config/api';
import { coverageFor, type Coverage } from './coverage';
import { localDateKey } from './datetime';

/** Formats shown as a label (in place of "Episode 1") when the anime is a single release. */
const TAG_FORMATS: AnilistAnimeFormat[] = ['MOVIE', 'SPECIAL', 'OVA', 'ONA', 'MUSIC'];

export interface CalendarEpisode {
	id: number;
	anilistId: number;
	episode: number;
	/** Episode title (nullable) — NOT the anime title. */
	episodeTitle: string | null;
	/** Local airing datetime. */
	airingAt: Date;
	airingAtUnix: number;
	anime: ScheduleAnimeItem;
	animeTitle: string;
	coverUrl: string | null;
	bannerUrl: string | null;
	/** This airing is the anime's first episode. */
	isFirst: boolean;
	/** This airing is the anime's known final episode (`episodes` set + matched). */
	isFinal: boolean;
	/** Single-episode non-series format → show its label in place of the episode number. */
	formatTag: AnilistAnimeFormat | null;
	isTracked: boolean;
	isPast: boolean;
	/** Raw download status — retained so coverage can recompute after a tracking change. */
	downloadStatus: TorrentDownloadStatus | null;
	coverage: Coverage | null;
}

/** Build the view-model list, sorted by air time within the caller's grouping. */
export function buildCalendarEpisodes(
	res: AiringScheduleListResponse,
	now: number = Date.now()
): CalendarEpisode[] {
	const byId: Record<number, ScheduleAnimeItem> = {};
	for (const a of res.anime) byId[a.anilist_id] = a;

	const seen: Record<number, true> = {};
	const out: CalendarEpisode[] = [];

	for (const item of res.airing_schedule) {
		if (seen[item.id]) continue; // dedupe across overlapping scopes
		const anime = byId[item.anilist_id];
		if (!anime) continue; // drop episodes whose anime wasn't enriched
		seen[item.id] = true;

		const isTracked = anime.tracked_anime_id != null;
		const airMs = item.airing_at * 1000;
		out.push({
			id: item.id,
			anilistId: item.anilist_id,
			episode: item.episode,
			episodeTitle: item.title,
			airingAt: new Date(airMs),
			airingAtUnix: item.airing_at,
			anime,
			animeTitle: displayTitle(anime),
			coverUrl: resolveBackendUrl(anime.small_cover_image),
			bannerUrl: resolveBackendUrl(anime.banner_url),
			isFirst: item.episode === 1,
			isFinal: anime.episodes != null && item.episode === anime.episodes,
			formatTag:
				anime.episodes === 1 && anime.format && TAG_FORMATS.includes(anime.format)
					? anime.format
					: null,
			isTracked,
			isPast: airMs <= now,
			downloadStatus: item.download_status,
			coverage: coverageFor(
				item.download_status,
				item.airing_at,
				isTracked,
				item.episode,
				anime.tracked_from_episode,
				now
			)
		});
	}

	out.sort((a, b) => a.airingAtUnix - b.airingAtUnix);
	return out;
}

/** Sort a copy by key: airing = ascending air time (default); popularity = descending (nulls last), air time tiebreak. */
export function sortEpisodes(
	episodes: CalendarEpisode[],
	sort: 'airing' | 'popularity'
): CalendarEpisode[] {
	if (sort === 'airing') return [...episodes].sort((a, b) => a.airingAtUnix - b.airingAtUnix);
	return [...episodes].sort((a, b) => {
		const pa = a.anime.popularity ?? -1;
		const pb = b.anime.popularity ?? -1;
		return pb - pa || a.airingAtUnix - b.airingAtUnix;
	});
}

/** Group by local date key (YYYY-MM-DD); within-day order preserved from the sorted input. */
export function groupByDay(episodes: CalendarEpisode[]): Record<string, CalendarEpisode[]> {
	const out: Record<string, CalendarEpisode[]> = {};
	for (const ep of episodes) {
		const key = localDateKey(ep.airingAt);
		(out[key] ??= []).push(ep);
	}
	return out;
}
