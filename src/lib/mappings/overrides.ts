/* =============================================================================
 * SABERR MAPPING-OVERRIDE HELPERS (pure)
 * -----------------------------------------------------------------------------
 * The editable draft shape for the add/edit dialog + conversions to/from the API,
 * validation, granularity stepping (skips the 0/-1 hole), and the row summary
 * formatters. Keep the components thin — all range/granularity wording lives here.
 * ========================================================================== */

import type {
	AnimeResult,
	MappingOverrideItem,
	MappingOverrideMode,
	MappingOverrideRequest,
	TVDBSeriesResult
} from '$lib/api/types';
import type { TitledAnime } from '$lib/anilist/titles';
import { displayTitle, secondaryTitle } from '$lib/anilist/titles';
import { formatLabel, seasonLabel } from '$lib/anilist/enums';
import { resolveBackendUrl } from '$lib/config/api';

/** A chosen AniList/TVDB entity, carrying just enough to render poster + title + subline. */
export interface EntityPick {
	id: number;
	title: string;
	/** Alternate title shown under the primary (anime only, per title-language pref); null otherwise. */
	secondary: string | null;
	imageUrl: string | null;
	/** e.g. `TV · Fall 2023` (anime) or `2023 · Continuing` (TVDB); null when unknown. */
	subline: string | null;
}

/** The dialog's working state. Numeric fields are nullable while a stepper is mid-edit. */
export interface OverrideDraft {
	anilistPick: EntityPick | null;
	anilist_episode_number_from: number | null;
	anilist_episode_number_to: number | null;
	tvdbPick: EntityPick | null;
	tvdb_season_number: number | null;
	tvdb_episode_number_from: number | null;
	tvdb_episode_number_to: number | null;
	granularity: number;
	mode: MappingOverrideMode;
}

export function blankDraft(): OverrideDraft {
	return {
		anilistPick: null,
		anilist_episode_number_from: 1,
		anilist_episode_number_to: null,
		tvdbPick: null,
		tvdb_season_number: 1,
		tvdb_episode_number_from: 1,
		tvdb_episode_number_to: null,
		granularity: 1,
		mode: 'IF_MISSING'
	};
}

/* --- Entity picks ----------------------------------------------------------- */

/** Build a pick from a `/search` anime hit (prefill "to episode" happens in the dialog). */
export function animePick(a: AnimeResult): EntityPick {
	const season = a.season
		? `${seasonLabel(a.season)}${a.season_year ? ` ${a.season_year}` : ''}`
		: a.season_year
			? String(a.season_year)
			: null;
	const subline = [a.format ? formatLabel(a.format) : null, season].filter(Boolean).join(' · ');
	return {
		id: a.anilist_id,
		title: displayTitle(a),
		secondary: secondaryTitle(a),
		imageUrl: resolveBackendUrl(a.small_cover_image),
		subline: subline || null
	};
}

/** Build a pick from a `/search/tvdb` series hit. */
export function tvdbPick(s: TVDBSeriesResult): EntityPick {
	const subline = [s.year ? String(s.year) : null, s.status].filter(Boolean).join(' · ');
	return {
		id: s.id,
		title: s.title,
		secondary: null,
		imageUrl: resolveBackendUrl(s.image_url),
		subline: subline || null
	};
}

/** A hand-typed id has no rich data — show a minimal `#123` display. */
export function idPick(kind: 'anime' | 'tvdb', id: number): EntityPick {
	return {
		id,
		title: `${kind === 'anime' ? 'AniList' : 'TVDB'} #${id}`,
		secondary: null,
		imageUrl: null,
		subline: null
	};
}

/* --- Edit prefill ----------------------------------------------------------- */

/** The three title fields for the item's AniList side (feeds `displayTitle`). */
export function itemTitled(item: MappingOverrideItem): TitledAnime {
	return {
		english_title: item.anilist_english_title,
		romaji_title: item.anilist_romaji_title,
		native_title: item.anilist_native_title
	};
}

export function draftFromItem(item: MappingOverrideItem): OverrideDraft {
	return {
		anilistPick: {
			id: item.anilist_id,
			title: displayTitle(itemTitled(item)),
			secondary: secondaryTitle(itemTitled(item)),
			imageUrl: resolveBackendUrl(item.anilist_small_cover_image),
			subline: null
		},
		anilist_episode_number_from: item.anilist_episode_number_from,
		anilist_episode_number_to: item.anilist_episode_number_to,
		tvdbPick: {
			id: item.tvdb_series_id,
			title: item.tvdb_title,
			secondary: null,
			imageUrl: resolveBackendUrl(item.tvdb_image_url),
			subline: null
		},
		tvdb_season_number: item.tvdb_season_number,
		tvdb_episode_number_from: item.tvdb_episode_number_from,
		tvdb_episode_number_to: item.tvdb_episode_number_to,
		granularity: item.granularity,
		mode: item.mode
	};
}

/* --- Validation + request --------------------------------------------------- */

/**
 * True when exactly one side has a `to` episode — an invalid half-open range. Both bounded or both
 * open-ended is fine; a bounded↔open-ended mix is not (each side must agree on being open-ended).
 */
export function openEndedMismatch(d: OverrideDraft): boolean {
	return (d.anilist_episode_number_to == null) !== (d.tvdb_episode_number_to == null);
}

/**
 * When BOTH ranges are bounded, their episode counts must line up with the granularity
 * (per the granularity-preview wording): count = `to - from + 1`.
 *  - `g === 1`  → 1:1, counts equal.
 *  - `g >= 2`   → N AniList eps per 1 TVDB ep, so `aniCount === g * tvdbCount`.
 *  - `g <= -2`  → 1 AniList ep per N TVDB eps (N = -g), so `tvdbCount === N * aniCount`.
 * Returns true (nothing to check) unless both sides are bounded with valid from/to.
 */
export function rangesConsistentWithGranularity(d: OverrideDraft): boolean {
	const af = d.anilist_episode_number_from;
	const at = d.anilist_episode_number_to;
	const tf = d.tvdb_episode_number_from;
	const tt = d.tvdb_episode_number_to;
	if (af == null || tf == null || at == null || tt == null) return true;
	const ani = at - af + 1;
	const tvdb = tt - tf + 1;
	if (ani <= 0 || tvdb <= 0) return true; // ordering handled elsewhere
	const g = d.granularity;
	if (g === 1) return ani === tvdb;
	if (g >= 2) return ani === g * tvdb;
	return tvdb === -g * ani;
}

/**
 * Auto-fill BOTH `to` fields so their episode counts always satisfy the granularity, deriving from
 * whichever side the user just edited (`anchor`). The dependent count is a clean multiple; on the
 * "divide" direction the anchor's own `to` snaps to the nearest exact multiple so no leftover remains
 * — this keeps `rangesConsistentWithGranularity` true, so the mismatch warning never appears. An
 * open-ended anchor (`to == null`) makes both open-ended.
 */
export function syncedTos(
	d: OverrideDraft,
	anchor: 'anilist' | 'tvdb'
): { anilist: number | null; tvdb: number | null } {
	const g = d.granularity;
	const aniFrom = d.anilist_episode_number_from ?? 1;
	const tvdbFrom = d.tvdb_episode_number_from ?? 1;
	const anchorTo = anchor === 'anilist' ? d.anilist_episode_number_to : d.tvdb_episode_number_to;
	if (anchorTo == null) return { anilist: null, tvdb: null };

	let aniCount: number;
	let tvdbCount: number;
	if (anchor === 'anilist') {
		aniCount = Math.max(1, anchorTo - aniFrom + 1);
		if (g >= 1) {
			tvdbCount = Math.max(1, Math.round(aniCount / g));
			aniCount = g * tvdbCount; // snap AniList to an exact block boundary
		} else {
			tvdbCount = aniCount * -g;
		}
	} else {
		tvdbCount = Math.max(1, anchorTo - tvdbFrom + 1);
		if (g >= 1) {
			aniCount = g * tvdbCount;
		} else {
			aniCount = Math.max(1, Math.round(tvdbCount / -g));
			tvdbCount = -g * aniCount; // snap TVDB to an exact block boundary
		}
	}
	return { anilist: aniFrom + aniCount - 1, tvdb: tvdbFrom + tvdbCount - 1 };
}

/** Human hint for the granularity/range rule above (shown when it's violated). */
export function granularityRangeHint(g: number): string {
	if (g === 1) return 'Both episode ranges must span the same number of episodes.';
	if (g >= 2) return `The AniList range must span ${g}× as many episodes as the TVDB range.`;
	return `The TVDB range must span ${-g}× as many episodes as the AniList range.`;
}

/** True when the draft is complete and internally consistent (gates Save). */
export function draftValid(d: OverrideDraft): boolean {
	if (!d.anilistPick || !d.tvdbPick) return false;
	if (d.anilist_episode_number_from == null || d.anilist_episode_number_from < 1) return false;
	if (d.tvdb_episode_number_from == null || d.tvdb_episode_number_from < 1) return false;
	if (d.tvdb_season_number == null || d.tvdb_season_number < 0) return false;
	if (!validGranularity(d.granularity)) return false;
	// Open-ended (`null`) `to` is fine; a set `to` must be ≥ its `from`.
	if (
		d.anilist_episode_number_to != null &&
		d.anilist_episode_number_to < d.anilist_episode_number_from
	)
		return false;
	if (d.tvdb_episode_number_to != null && d.tvdb_episode_number_to < d.tvdb_episode_number_from)
		return false;
	// A `to` on one side requires a `to` on the other (both bounded or both open-ended).
	if (openEndedMismatch(d)) return false;
	// Bounded ranges must be consistent with the granularity.
	return rangesConsistentWithGranularity(d);
}

/** Build the API body. ⚠️ Assumes `draftValid(d)` — call only after it passes. */
export function toRequest(d: OverrideDraft): MappingOverrideRequest {
	return {
		anilist_id: d.anilistPick!.id,
		anilist_episode_number_from: d.anilist_episode_number_from!,
		anilist_episode_number_to: d.anilist_episode_number_to,
		tvdb_series_id: d.tvdbPick!.id,
		tvdb_season_number: d.tvdb_season_number!,
		tvdb_episode_number_from: d.tvdb_episode_number_from!,
		tvdb_episode_number_to: d.tvdb_episode_number_to,
		granularity: d.granularity,
		mode: d.mode
	};
}

/* --- Granularity ------------------------------------------------------------ */

/** Valid granularity domain: ℤ minus {0, -1}. */
export function validGranularity(n: number): boolean {
	return Number.isInteger(n) && (n >= 1 || n <= -2);
}

/** Step ±1 but jump across the 0/-1 hole (1 ↔ -2); snap a typed 0/-1 to the nearest valid. */
export function nextGranularity(current: number, dir: 1 | -1): number {
	const n = current + dir;
	if (n === 0) return dir === 1 ? 1 : -2;
	if (n === -1) return dir === 1 ? 1 : -2;
	return n;
}

/** Clamp an arbitrary typed value into the valid domain (0 → 1, -1 → -2). */
export function snapGranularity(n: number): number {
	if (!Number.isInteger(n)) n = Math.round(n);
	if (n === 0) return 1;
	if (n === -1) return -2;
	return n;
}

/** The live one-line explanation shown under the granularity stepper. */
export function granularityPreview(n: number): string {
	if (n === 1) return 'Each episode from AniList maps to one episode on TVDB.';
	if (n >= 2) return `Each ${n} episodes from AniList map to one episode on TVDB.`;
	return `Each episode from AniList maps to ${-n} episodes on TVDB.`;
}

/** Compact granularity token for the listing row: `×N` (collapse) / `÷N` (expand). */
export function granularityToken(n: number): string {
	return n >= 1 ? `×${n}` : `÷${-n}`;
}

/* --- Row summary ------------------------------------------------------------ */

const INFINITY = '∞';

/** `Ep 1-28` / `Ep 1-∞` (open-ended). */
export function anilistRange(item: MappingOverrideItem): string {
	const to = item.anilist_episode_number_to ?? INFINITY;
	return `Ep ${item.anilist_episode_number_from} - ${to}`;
}

/** `S1 · E1-28` / `S3 · E1-∞`. */
export function tvdbRange(item: MappingOverrideItem): string {
	const to = item.tvdb_episode_number_to ?? INFINITY;
	return `S${item.tvdb_season_number} · E${item.tvdb_episode_number_from} - ${to}`;
}
