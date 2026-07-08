/* =============================================================================
 * SABERR ANIME TITLE DISPLAY — picks the title for the user's preferred language plus a
 * secondary shown underneath (Romaji is the universal fallback, never null). Secondary: Romaji
 * when English/Native preferred, English when Romaji preferred; omitted if it fell back to Romaji
 * or duplicates the primary.
 * ========================================================================== */

import { settings } from '$lib/stores/settings.svelte';

/** The three title fields present on every anime shape. */
export interface TitledAnime {
	english_title: string | null;
	romaji_title: string | null;
	native_title: string | null;
}

const clean = (s: string | null | undefined): string | null =>
	s != null && s.trim().length > 0 ? s : null;

/** The title to render most prominently. Always returns a non-empty string. */
export function displayTitle(anime: TitledAnime): string {
	const lang = settings.current.general.anilist_preferred_title_language;
	const romaji = clean(anime.romaji_title);
	if (lang === 'English') return clean(anime.english_title) ?? romaji ?? '';
	if (lang === 'Native') return clean(anime.native_title) ?? romaji ?? '';
	return romaji ?? '';
}

/** Case-insensitive substring match against ALL three titles (english/romaji/native), regardless of
 *  which one is displayed. `query` is assumed already lowercased by the caller when hot-looping. */
export function matchesTitle(anime: TitledAnime, query: string): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	return [anime.english_title, anime.romaji_title, anime.native_title].some(
		(t) => !!t && t.toLowerCase().includes(q)
	);
}

/** A secondary title shown under the primary, or null when it should be hidden. */
export function secondaryTitle(anime: TitledAnime): string | null {
	const lang = settings.current.general.anilist_preferred_title_language;
	const romaji = clean(anime.romaji_title);
	const english = clean(anime.english_title);
	const native = clean(anime.native_title);

	let secondary: string | null;
	if (lang === 'English') {
		// Hide if english was missing (primary already fell back to romaji).
		secondary = english ? romaji : null;
	} else if (lang === 'Native') {
		secondary = native ? romaji : null;
	} else {
		secondary = english;
	}

	if (!secondary) return null;
	return secondary === displayTitle(anime) ? null : secondary;
}
