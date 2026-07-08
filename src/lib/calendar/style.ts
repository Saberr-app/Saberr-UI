/* =============================================================================
 * SABERR CALENDAR — STATUS STYLING. The cover-tile ring encodes airing status; the month bar +
 * legend use the same hue as a solid fill. ⚠️ Class strings written IN FULL for Tailwind's scanner.
 * Hues mirror `AIRING_STATUS_ACCENT`.
 * ========================================================================== */

import type { AnilistAnimeStatus } from '$lib/api/types';

/** Full-strength ring color for the cover tile, per airing status. */
export const AIRING_RING: Record<AnilistAnimeStatus, string> = {
	RELEASING: 'ring-emerald-500',
	FINISHED: 'ring-blue-500',
	NOT_YET_RELEASED: 'ring-amber-500',
	CANCELLED: 'ring-rose-500',
	HIATUS: 'ring-orange-500'
};

/** Solid fill for the month-view event bar + the legend swatch. */
export const AIRING_BAR: Record<AnilistAnimeStatus, string> = {
	RELEASING: 'bg-emerald-500',
	FINISHED: 'bg-blue-500',
	NOT_YET_RELEASED: 'bg-amber-500',
	CANCELLED: 'bg-rose-500',
	HIATUS: 'bg-orange-500'
};

/** Hex mirror of the hues for the ring + legend swatches (painted via inline gradients Tailwind can't generate). */
export const AIRING_HEX: Record<AnilistAnimeStatus, string> = {
	RELEASING: '#10b981',
	FINISHED: '#3b82f6',
	NOT_YET_RELEASED: '#f59e0b',
	CANCELLED: '#f43f5e',
	HIATUS: '#f97316'
};

export type RingStyle = { kind: 'none' } | { kind: 'solid'; color: string };

const NOT_YET = AIRING_HEX.NOT_YET_RELEASED;
const AIRING = AIRING_HEX.RELEASING;
const FINISHED = AIRING_HEX.FINISHED;

/** The cover-tile ring encodes airing status only (solid hue, or none when off). */
export function airingRing(status: AnilistAnimeStatus, on: boolean): RingStyle {
	return on ? { kind: 'solid', color: AIRING_HEX[status] } : { kind: 'none' };
}

/** Inline `background` for a ring, or `undefined` for `none` (→ hairline fallback). */
export function ringBackground(r: RingStyle): string | undefined {
	return r.kind === 'solid' ? r.color : undefined;
}

/** Episode markers: first/final airings, plus the single-episode (first+final) special. */
export type MarkerKind = 'first' | 'final' | 'special';

// Fades use the colour's own 0-alpha (`#rrggbb00`) so "to transparent" doesn't dip through grey.
const MARKER_COLORS: Record<MarkerKind, string[]> = {
	first: [AIRING, AIRING],
	final: [FINISHED, FINISHED],
	special: [AIRING, FINISHED]
};

export const MARKER_LEGEND: { kind: MarkerKind; label: string }[] = [
	{ kind: 'first', label: 'First episode' },
	{ kind: 'final', label: 'Final episode' },
	{ kind: 'special', label: 'Special / Movie' }
];

export function markerOf(ep: { isFirst: boolean; isFinal: boolean }): MarkerKind | null {
	if (ep.isFirst && ep.isFinal) return 'special';
	if (ep.isFirst) return 'first';
	if (ep.isFinal) return 'final';
	return null;
}

/** Left-to-right gradient — legend swatches use it as-is; cards layer it faintly. */
export function markerGradient(kind: MarkerKind): string {
	return `linear-gradient(to right, ${MARKER_COLORS[kind].join(', ')})`;
}
