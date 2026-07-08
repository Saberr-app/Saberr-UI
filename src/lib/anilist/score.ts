/* =============================================================================
 * SABERR SCORE FORMATS — bounds/display/edit for the account's `score_format`:
 * POINT_100 (0–100), POINT_10 (0–10), POINT_10_DECIMAL (1 dp), POINT_5 (stars), POINT_3 (smileys).
 * `0` = unset (dash). Anime mean/average scores are a separate 100-based value (`formatPercentScore`).
 * ========================================================================== */

import type { AnilistScoreFormat } from '$lib/api/types';
import { settings } from '$lib/stores/settings.svelte';

/** How the user score should be rendered for a given format. */
export type ScoreKind = 'number' | 'stars' | 'smiley';

export const SCORE_KIND: Record<AnilistScoreFormat, ScoreKind> = {
	POINT_100: 'number',
	POINT_10_DECIMAL: 'number',
	POINT_10: 'number',
	POINT_5: 'stars',
	POINT_3: 'smiley'
};

export const SCORE_MAX: Record<AnilistScoreFormat, number> = {
	POINT_100: 100,
	POINT_10_DECIMAL: 10,
	POINT_10: 10,
	POINT_5: 5,
	POINT_3: 3
};

export const SCORE_STEP: Record<AnilistScoreFormat, number> = {
	POINT_100: 1,
	POINT_10_DECIMAL: 0.1,
	POINT_10: 1,
	POINT_5: 1,
	POINT_3: 1
};

/** The account's current score format (POINT_10 fallback when not connected). */
export function currentScoreFormat(): AnilistScoreFormat {
	return settings.current.anilist.anilist_user_data?.score_format ?? 'POINT_10';
}

export const isScoreSet = (score: number | null | undefined): boolean => score != null && score > 0;

/** Textual user score for tooltips/compact cells (stars/smiley return a fallback string). '—' when unset. */
export function formatScoreText(
	score: number | null | undefined,
	format: AnilistScoreFormat = currentScoreFormat()
): string {
	if (!isScoreSet(score)) return '—';
	const n = score as number;
	switch (format) {
		case 'POINT_10_DECIMAL':
			return n.toFixed(1);
		case 'POINT_5':
			return `${n}/5`;
		case 'POINT_3':
			return ['—', 'Bad', 'Okay', 'Good'][n] ?? '—';
		default:
			return String(n);
	}
}

/** Display a 100-based anime mean/average score as a percentage; '—' when unset. */
export function formatPercentScore(score: number | null | undefined): string {
	return score != null && score > 0 ? `${score}%` : '—';
}
