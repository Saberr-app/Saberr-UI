/* =============================================================================
 * SABERR CUSTOM DETECTION TITLE HELPERS — a custom title (`override_match_against`) ending in
 * "season {n}" is matched by the backend against both the literal title and a season-shorthand
 * ("…Season 2" → "… S02E~"). Surfaces that second form in the hint box (tracked groups field + RSS Identify).
 * ========================================================================== */

export interface SeasonMatchPreview {
	/** The title exactly as entered (trimmed). */
	full: string;
	/** The season-shorthand form, e.g. "Attack on Titan S02E~". */
	shorthand: string;
}

/** If `title` ends with "season {n}", return the literal + its shorthand ("{base} S{nn}E~"); else null. */
export function seasonMatchPreview(title: string | null | undefined): SeasonMatchPreview | null {
	const trimmed = (title ?? '').trim();
	const m = trimmed.match(/^(.*?)\s*season\s+(\d+)$/i);
	if (!m) return null;
	const base = m[1].trim();
	const n = parseInt(m[2], 10);
	if (!base || !Number.isFinite(n)) return null;
	return { full: trimmed, shorthand: `${base} S${String(n).padStart(2, '0')}E~` };
}
