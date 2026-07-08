/* =============================================================================
 * SABERR ANIME DATE HELPERS — current-season calc (Browse) + AniList fuzzy-date utilities.
 * Fuzzy-date formatting lives in `entry.ts`, re-exported here for one import.
 * ========================================================================== */

import type { AnilistAnimeSeason, AnilistDate } from '$lib/api/types';
export { formatFuzzyDate } from './entry';

/** The season+year currently "in season" (browser-local, 2-week early shift). Boundaries:
 *  Winter Jan–Mar, Spring Apr–Jun, Summer Jul–Aug, Fall Sep–Dec. */
export function currentSeason(
	now: Date = new Date(),
	shiftDays = 14
): {
	season: AnilistAnimeSeason;
	year: number;
} {
	const shifted = new Date(now);
	shifted.setDate(shifted.getDate() + shiftDays);
	const month = shifted.getMonth(); // 0–11
	const year = shifted.getFullYear();

	let season: AnilistAnimeSeason;
	if (month <= 2) season = 'WINTER';
	else if (month <= 5) season = 'SPRING';
	else if (month <= 7) season = 'SUMMER';
	else season = 'FALL';

	return { season, year };
}

const SEASON_ORDER: AnilistAnimeSeason[] = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];

/** Step a season forward/backward by one, wrapping the year at the boundaries. */
export function stepSeason(
	season: AnilistAnimeSeason,
	year: number,
	dir: 1 | -1
): { season: AnilistAnimeSeason; year: number } {
	const i = SEASON_ORDER.indexOf(season) + dir;
	if (i < 0) return { season: 'FALL', year: year - 1 };
	if (i > 3) return { season: 'WINTER', year: year + 1 };
	return { season: SEASON_ORDER[i], year };
}

export const emptyFuzzyDate = (): AnilistDate => ({ year: null, month: null, day: null });

/** Today's date as a full fuzzy date (browser-local). */
export function todayFuzzyDate(now: Date = new Date()): AnilistDate {
	return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/** True when no part of the date is set. */
export const isFuzzyEmpty = (d: AnilistDate | null | undefined): boolean =>
	!d || (d.year == null && d.month == null && d.day == null);
