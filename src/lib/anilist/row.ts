/* =============================================================================
 * SABERR NORMALIZED ANIME ROW — Browse (full `AnimeItemWithUserEntry`), user list (slim
 * `UserAnimeListItem`), and tracked all normalize to this one row, so the shared collection
 * (views/columns/filter/group/sort) is source-agnostic. Slim-shape absent fields are null/empty.
 * Titles kept raw so `displayTitle`/`secondaryTitle` stay reactive to the language setting.
 * ========================================================================== */

import type {
	AnilistAiringSchedule,
	AnilistAnimeFormat,
	AnilistAnimeSeason,
	AnilistAnimeStatus,
	AnilistAnimeSource,
	AnilistDate,
	AnilistTag,
	AnimeItemWithUserEntry,
	EpisodeStats,
	TrackedAnimeItem,
	UserAnimeListItem,
	UserEntry
} from '$lib/api/types';
import { coverImage, primaryStudio } from './media';
import { resolveBackendUrl } from '$lib/config/api';
import { noEnabledGroups } from '$lib/tracked/release-groups';
import type { MutationContext } from './entry-actions';

/** Real next-airing episode if present; else, for a not-yet-aired show with a full future start
 *  date, synthesize episode 1 at 00:00 of that date. */
function effectiveNext(a: AnimeItemWithUserEntry): AnilistAiringSchedule | null {
	if (a.next_airing_episode) return a.next_airing_episode;
	const d = a.start_date;
	if (d && d.year != null && d.month != null && d.day != null) {
		const ts = Math.floor(new Date(d.year, d.month - 1, d.day, 0, 0, 0).getTime() / 1000);
		if (ts > Date.now() / 1000) {
			return { airing_at: ts, episode: 1, anilist_id: a.id, duration: null };
		}
	}
	return null;
}

export interface AnimeRow {
	anilistId: number;
	idMal: number | null;
	tvdbId: number | null;
	english_title: string | null;
	romaji_title: string | null;
	native_title: string | null;
	/** Medium cover — used by the card view. */
	cover: string | null;
	/** Large cover — used by the image-forward poster + mega-card views. */
	coverLarge: string | null;
	/** Small cover — used by the dense list/compact table thumbnails. */
	coverThumb: string | null;
	banner: string | null;
	isAdult: boolean;
	format: AnilistAnimeFormat | null;
	airingStatus: AnilistAnimeStatus;
	season: AnilistAnimeSeason | null;
	seasonYear: number | null;
	episodes: number | null;
	meanScore: number | null;
	averageScore: number | null;
	popularity: number | null;
	duration: number | null;
	nextEpisode: AnilistAiringSchedule | null;
	source: AnilistAnimeSource | null;
	genres: string[];
	tags: AnilistTag[];
	country: string | null;
	startDate: AnilistDate | null;
	endDate: AnilistDate | null;
	studio: string | null;
	synonyms: string[];
	/** Full anime only (Browse) — used by the mega-card; null for the slim user list. */
	description: string | null;
	entry: UserEntry | null;
	trackedAnimeId: number | null;
	/** True when the source carried full metadata (Browse) vs slim (user list). */
	full: boolean;
	/* --- Tracked context only (rowFromTrackedItem); null/undefined elsewhere. --- */
	/** The show's on-disk folder name (`show_folder_name`). */
	showFolderName?: string | null;
	/** Whether this tracked anime uses TVDB structuring (vs AniList). */
	tvdbStructureEnabled?: boolean | null;
	/** Episode this tracked anime is downloaded/reported from (`from_episode`). */
	fromEpisode?: number | null;
	/** Coverage stats (processed/downloading/failed + latest known episode). */
	episodeStats?: EpisodeStats | null;
	/** True when every release group is disabled (nothing will download). */
	noDownloads?: boolean;
}

export function rowFromAnime(a: AnimeItemWithUserEntry): AnimeRow {
	return {
		anilistId: a.id,
		idMal: a.idMal,
		tvdbId: a.tvdb_series_id ?? null,
		english_title: a.english_title,
		romaji_title: a.romaji_title,
		native_title: a.native_title,
		cover: coverImage(a, 'medium'),
		coverLarge: coverImage(a, 'large'),
		coverThumb: coverImage(a, 'small'),
		banner: resolveBackendUrl(a.banner_image),
		isAdult: a.is_adult,
		format: a.format,
		airingStatus: a.status,
		season: a.season,
		seasonYear: a.season_year,
		episodes: a.episodes,
		meanScore: a.mean_score,
		averageScore: a.average_score,
		popularity: a.popularity,
		duration: a.duration,
		nextEpisode: effectiveNext(a),
		source: a.source,
		genres: a.genres,
		tags: a.tags,
		country: a.country_of_origin,
		startDate: a.start_date,
		endDate: a.end_date,
		studio: primaryStudio(a.studios)?.name ?? null,
		synonyms: a.synonyms,
		description: a.description,
		entry: a.user_entry,
		trackedAnimeId: a.tracked_anime_id,
		full: true
	};
}

/** Extract the bare `UserEntry` from a `/anime-list`-shaped item (top-level entry
 *  fields) — shared by the list/tracked row builders and the bulk reconcile. */
export function userEntryFromList(li: UserAnimeListItem): UserEntry {
	return {
		progress: li.progress,
		score: li.score,
		status: li.status,
		repeat_count: li.repeat_count,
		is_private: li.is_private,
		started_at: li.started_at,
		completed_at: li.completed_at,
		notes: li.notes
	};
}

export function rowFromListItem(li: UserAnimeListItem): AnimeRow {
	const a = li.anime;
	const entry: UserEntry = userEntryFromList(li);
	return {
		anilistId: a.id,
		idMal: a.idMal,
		tvdbId: a.tvdb_series_id ?? null,
		english_title: a.english_title,
		romaji_title: a.romaji_title,
		native_title: a.native_title,
		cover: coverImage(a, 'medium'),
		coverLarge: coverImage(a, 'large'),
		coverThumb: coverImage(a, 'small'),
		banner: resolveBackendUrl(a.banner_image),
		isAdult: false,
		format: a.format,
		airingStatus: a.status,
		season: a.season,
		seasonYear: a.season_year,
		episodes: a.episodes,
		meanScore: a.mean_score,
		averageScore: a.average_score,
		popularity: null,
		duration: null,
		nextEpisode: a.next_airing_episode,
		source: null,
		genres: [],
		tags: [],
		country: null,
		startDate: null,
		endDate: null,
		studio: null,
		synonyms: [],
		description: null,
		entry,
		trackedAnimeId: li.tracked_anime_id,
		full: false
	};
}

/** Normalize a tracked anime to a row (slim anime, full=false; `user_entry` may be null). Carries
 *  tracked-only extras for the tracked columns + "nothing will download" badge. `globalPreferred` =
 *  the global profile's release groups, used for the badge when the item is on the default profile. */
export function rowFromTrackedItem(item: TrackedAnimeItem, globalPreferred: string[]): AnimeRow {
	const a = item.anime;
	const ue = item.user_entry;
	const entry: UserEntry | null = ue ? userEntryFromList(ue) : null;
	return {
		anilistId: a.id,
		idMal: a.idMal,
		tvdbId: a.tvdb_series_id ?? null,
		english_title: a.english_title,
		romaji_title: a.romaji_title,
		native_title: a.native_title,
		cover: coverImage(a, 'medium'),
		coverLarge: coverImage(a, 'large'),
		coverThumb: coverImage(a, 'small'),
		banner: resolveBackendUrl(a.banner_image),
		isAdult: false,
		format: a.format,
		airingStatus: a.status,
		season: a.season,
		seasonYear: a.season_year,
		episodes: a.episodes,
		meanScore: a.mean_score,
		averageScore: a.average_score,
		popularity: null,
		duration: null,
		nextEpisode: a.next_airing_episode,
		source: null,
		genres: [],
		tags: [],
		country: null,
		startDate: a.start_date ?? null,
		endDate: a.end_date ?? null,
		studio: null,
		synonyms: [],
		description: null,
		entry,
		trackedAnimeId: item.id,
		full: false,
		showFolderName: item.show_folder_name,
		tvdbStructureEnabled: item.tvdb_structure_enabled,
		fromEpisode: item.from_episode,
		episodeStats: item.episode_stats,
		noDownloads: noEnabledGroups(item.release_profile?.preferred_release_groups ?? globalPreferred)
	};
}

/** Build the mutation context for entry actions from a row. */
export const rowMutationContext = (row: AnimeRow): MutationContext => ({
	anilistId: row.anilistId,
	episodes: row.episodes,
	airingStatus: row.airingStatus,
	entry: row.entry
});
