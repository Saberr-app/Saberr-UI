/* =============================================================================
 * SABERR ANIME COLOR SYSTEM — per-hue accents for watch/airing status, format, season; scores
 * colored by value. ⚠️ All class strings are written IN FULL (no `bg-${hue}`) so Tailwind v4's
 * scanner generates them — add a hue → add a full static `ACCENTS` entry.
 * Accent parts: chip · solid · dot · text · ring · edge · tint.
 * ========================================================================== */

import type {
	AnilistAnimeFormat,
	AnilistAnimeSeason,
	AnilistAnimeStatus,
	AnilistAnimeUserStatus,
	AnilistScoreFormat
} from '$lib/api/types';
import { SCORE_MAX } from './score';

export interface Accent {
	chip: string;
	solid: string;
	dot: string;
	text: string;
	ring: string;
	edge: string;
	tint: string;
}

type Hue =
	| 'emerald'
	| 'teal'
	| 'sky'
	| 'blue'
	| 'violet'
	| 'amber'
	| 'rose'
	| 'orange'
	| 'cyan'
	| 'fuchsia'
	| 'indigo'
	| 'pink';

/* Full static class sets per hue. */
export const ACCENTS: Record<Hue, Accent> = {
	emerald: {
		chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
		solid: 'bg-emerald-500 text-white',
		dot: 'bg-emerald-500',
		text: 'text-emerald-600 dark:text-emerald-400',
		ring: 'ring-emerald-500/40',
		edge: 'bg-emerald-500',
		tint: 'bg-emerald-500/5'
	},
	teal: {
		chip: 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
		solid: 'bg-teal-500 text-white',
		dot: 'bg-teal-500',
		text: 'text-teal-600 dark:text-teal-400',
		ring: 'ring-teal-500/40',
		edge: 'bg-teal-500',
		tint: 'bg-teal-500/5'
	},
	sky: {
		chip: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
		solid: 'bg-sky-500 text-white',
		dot: 'bg-sky-500',
		text: 'text-sky-600 dark:text-sky-400',
		ring: 'ring-sky-500/40',
		edge: 'bg-sky-500',
		tint: 'bg-sky-500/5'
	},
	blue: {
		chip: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
		solid: 'bg-blue-500 text-white',
		dot: 'bg-blue-500',
		text: 'text-blue-600 dark:text-blue-400',
		ring: 'ring-blue-500/40',
		edge: 'bg-blue-500',
		tint: 'bg-blue-500/5'
	},
	violet: {
		chip: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
		solid: 'bg-violet-500 text-white',
		dot: 'bg-violet-500',
		text: 'text-violet-600 dark:text-violet-400',
		ring: 'ring-violet-500/40',
		edge: 'bg-violet-500',
		tint: 'bg-violet-500/5'
	},
	amber: {
		chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
		solid: 'bg-amber-500 text-white',
		dot: 'bg-amber-500',
		text: 'text-amber-600 dark:text-amber-400',
		ring: 'ring-amber-500/40',
		edge: 'bg-amber-500',
		tint: 'bg-amber-500/5'
	},
	rose: {
		chip: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
		solid: 'bg-rose-500 text-white',
		dot: 'bg-rose-500',
		text: 'text-rose-600 dark:text-rose-400',
		ring: 'ring-rose-500/40',
		edge: 'bg-rose-500',
		tint: 'bg-rose-500/5'
	},
	orange: {
		chip: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
		solid: 'bg-orange-500 text-white',
		dot: 'bg-orange-500',
		text: 'text-orange-600 dark:text-orange-400',
		ring: 'ring-orange-500/40',
		edge: 'bg-orange-500',
		tint: 'bg-orange-500/5'
	},
	cyan: {
		chip: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
		solid: 'bg-cyan-500 text-white',
		dot: 'bg-cyan-500',
		text: 'text-cyan-600 dark:text-cyan-400',
		ring: 'ring-cyan-500/40',
		edge: 'bg-cyan-500',
		tint: 'bg-cyan-500/5'
	},
	fuchsia: {
		chip: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300',
		solid: 'bg-fuchsia-500 text-white',
		dot: 'bg-fuchsia-500',
		text: 'text-fuchsia-600 dark:text-fuchsia-400',
		ring: 'ring-fuchsia-500/40',
		edge: 'bg-fuchsia-500',
		tint: 'bg-fuchsia-500/5'
	},
	indigo: {
		chip: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
		solid: 'bg-indigo-500 text-white',
		dot: 'bg-indigo-500',
		text: 'text-indigo-600 dark:text-indigo-400',
		ring: 'ring-indigo-500/40',
		edge: 'bg-indigo-500',
		tint: 'bg-indigo-500/5'
	},
	pink: {
		chip: 'bg-pink-500/10 text-pink-700 dark:text-pink-300',
		solid: 'bg-pink-500 text-white',
		dot: 'bg-pink-500',
		text: 'text-pink-600 dark:text-pink-400',
		ring: 'ring-pink-500/40',
		edge: 'bg-pink-500',
		tint: 'bg-pink-500/5'
	}
};

/** Neutral (no hue) — readable foreground; used for mid-band scores. */
export const NEUTRAL_ACCENT: Accent = {
	chip: 'bg-muted text-foreground',
	solid: 'bg-foreground text-background',
	dot: 'bg-foreground/50',
	text: 'text-foreground',
	ring: 'ring-foreground/30',
	edge: 'bg-foreground/40',
	tint: 'bg-foreground/5'
};

export const MUTED_ACCENT: Accent = {
	chip: 'bg-muted text-muted-foreground',
	solid: 'bg-muted-foreground text-background',
	dot: 'bg-muted-foreground/40',
	text: 'text-muted-foreground',
	ring: 'ring-border',
	edge: 'bg-muted-foreground/30',
	tint: 'bg-muted/40'
};

/* --- Watch status (the user's relationship to the anime) -------------------- */
export const WATCH_STATUS_ACCENT: Record<AnilistAnimeUserStatus, Accent> = {
	CURRENT: ACCENTS.emerald,
	REPEATING: ACCENTS.teal,
	PLANNING: ACCENTS.sky,
	COMPLETED: ACCENTS.violet,
	PAUSED: ACCENTS.amber,
	DROPPED: ACCENTS.rose
};

/* --- Airing / release status ----------------------------------------------- */
export const AIRING_STATUS_ACCENT: Record<AnilistAnimeStatus, Accent> = {
	RELEASING: ACCENTS.emerald,
	FINISHED: ACCENTS.blue,
	NOT_YET_RELEASED: ACCENTS.amber,
	CANCELLED: ACCENTS.rose,
	HIATUS: ACCENTS.orange
};

/* --- Format ---------------------------------------------------------------- */
export const FORMAT_ACCENT: Record<AnilistAnimeFormat, Accent> = {
	TV: ACCENTS.sky,
	TV_SHORT: ACCENTS.cyan,
	MOVIE: ACCENTS.amber,
	SPECIAL: ACCENTS.fuchsia,
	OVA: ACCENTS.violet,
	ONA: ACCENTS.indigo,
	MUSIC: ACCENTS.pink
};

/* --- Season (muted, themed by feel) ---------------------------------------- */
export const SEASON_ACCENT: Record<AnilistAnimeSeason, Accent> = {
	WINTER: ACCENTS.sky,
	SPRING: ACCENTS.emerald,
	SUMMER: ACCENTS.amber,
	FALL: ACCENTS.orange
};

/* --- Score (colored by value, 100-based) ----------------------------------- */
const SCORE_BANDS: Array<{ min: number; accent: Accent }> = [
	{ min: 80, accent: ACCENTS.emerald }, // 80+ green
	{ min: 65, accent: NEUTRAL_ACCENT }, // 65–79 neutral (b/w)
	{ min: 50, accent: ACCENTS.amber }, // 50–64 amber
	{ min: 1, accent: ACCENTS.rose } // 1–49 red
];

/** Accent for a 100-based score (mean/average); muted when unset. */
export function scoreAccent(score100: number | null | undefined): Accent {
	if (score100 == null || score100 <= 0) return MUTED_ACCENT;
	return SCORE_BANDS.find((b) => score100 >= b.min)?.accent ?? MUTED_ACCENT;
}

/** Accent for a user score given its format (normalizes to 100 first). */
export function userScoreAccent(
	score: number | null | undefined,
	format: AnilistScoreFormat
): Accent {
	if (score == null || score <= 0) return MUTED_ACCENT;
	return scoreAccent((score / SCORE_MAX[format]) * 100);
}
