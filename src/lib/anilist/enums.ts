/* =============================================================================
 * SABERR ANILIST ENUM DISPLAY LABELS — display names for AniList enums (Browse / User list).
 * Watch-status labels live in `entry.ts` (ANILIST_STATUS_LABELS).
 * ========================================================================== */

import type {
	AnilistAnimeFormat,
	AnilistAnimeSeason,
	AnilistAnimeSource,
	AnilistAnimeStatus
} from '$lib/api/types';

/** Release format → label. */
export const FORMAT_LABELS: Record<AnilistAnimeFormat, string> = {
	TV: 'TV',
	TV_SHORT: 'TV Short',
	MOVIE: 'Movie',
	SPECIAL: 'Special',
	OVA: 'OVA',
	ONA: 'ONA',
	MUSIC: 'Music'
};

/** Release format → minimal label. */
export const FORMAT_MINIMAL_LABELS: Record<AnilistAnimeFormat, string> = {
	TV: 'TV',
	TV_SHORT: 'TV',
	MOVIE: 'M',
	SPECIAL: 'Sp',
	OVA: 'OVA',
	ONA: 'ONA',
	MUSIC: '🎵'
};

/** Adaptation source → label. */
export const SOURCE_LABELS: Record<AnilistAnimeSource, string> = {
	ORIGINAL: 'Original',
	MANGA: 'Manga',
	LIGHT_NOVEL: 'Light Novel',
	VISUAL_NOVEL: 'Visual Novel',
	VIDEO_GAME: 'Video Game',
	OTHER: 'Other',
	NOVEL: 'Novel',
	DOUJINSHI: 'Doujinshi',
	ANIME: 'Anime',
	WEB_NOVEL: 'Web Novel',
	LIVE_ACTION: 'Live Action',
	GAME: 'Game',
	COMIC: 'Comic',
	MULTIMEDIA_PROJECT: 'Multimedia Project',
	PICTURE_BOOK: 'Picture Book'
};

/** Airing/release status → label. */
export const AIRING_STATUS_LABELS: Record<AnilistAnimeStatus, string> = {
	FINISHED: 'Finished',
	RELEASING: 'Airing',
	NOT_YET_RELEASED: 'Not yet aired',
	CANCELLED: 'Cancelled',
	HIATUS: 'Hiatus'
};

/** Season → label (simply capitalized). */
export const SEASON_LABELS: Record<AnilistAnimeSeason, string> = {
	WINTER: 'Winter',
	SPRING: 'Spring',
	SUMMER: 'Summer',
	FALL: 'Fall'
};

export const formatLabel = (f: AnilistAnimeFormat | null | undefined): string =>
	f ? FORMAT_LABELS[f] : '—';
export const sourceLabel = (s: AnilistAnimeSource | null | undefined): string =>
	s ? SOURCE_LABELS[s] : '—';
export const airingStatusLabel = (s: AnilistAnimeStatus | null | undefined): string =>
	s ? AIRING_STATUS_LABELS[s] : '—';
export const seasonLabel = (s: AnilistAnimeSeason | null | undefined): string =>
	s ? SEASON_LABELS[s] : '—';

/** "Spring 2025" style label from a season + year (either may be missing). */
export function seasonYearLabel(
	season: AnilistAnimeSeason | null | undefined,
	year: number | null | undefined
): string {
	const s = season ? SEASON_LABELS[season] : null;
	if (s && year != null) return `${s} ${year}`;
	if (s) return s;
	if (year != null) return String(year);
	return '—';
}
