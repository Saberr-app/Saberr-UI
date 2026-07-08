/* =============================================================================
 * SABERR ANIME EXTRAS HELPERS — labels + ordering for relations/characters/staff on the detail
 * view. Relation titles are nullable, so `relationTitle` resolves the preferred language with fallback.
 * ========================================================================== */

import type {
	AnilistFormat,
	AnimeCharacter,
	AnimeRelation,
	CharacterRole,
	RelationType
} from '$lib/api/types';
import { RELATION_TYPE_ORDER } from '$lib/api/types';
import { anilistMangaUrl } from '$lib/config/external';
import { settings } from '$lib/stores/settings.svelte';

export const RELATION_TYPE_LABELS: Record<RelationType, string> = {
	ADAPTATION: 'Adaptation',
	PREQUEL: 'Prequel',
	SEQUEL: 'Sequel',
	PARENT: 'Parent Story',
	SIDE_STORY: 'Side Story',
	CHARACTER: 'Character',
	SUMMARY: 'Summary',
	ALTERNATIVE: 'Alternative',
	SPIN_OFF: 'Spin-off',
	OTHER: 'Other',
	SOURCE: 'Source',
	COMPILATION: 'Compilation',
	CONTAINS: 'Contains'
};

/** Format labels covering the extras superset (anime formats + print media). */
export const EXTRA_FORMAT_LABELS: Record<AnilistFormat, string> = {
	TV: 'TV',
	TV_SHORT: 'TV Short',
	MOVIE: 'Movie',
	SPECIAL: 'Special',
	OVA: 'OVA',
	ONA: 'ONA',
	MUSIC: 'Music',
	MANGA: 'Manga',
	NOVEL: 'Novel',
	ONE_SHOT: 'One Shot'
};

export const CHARACTER_ROLE_LABELS: Record<CharacterRole, string> = {
	MAIN: 'Main',
	SUPPORTING: 'Supporting',
	BACKGROUND: 'Background'
};

export const relationTypeLabel = (t: RelationType): string => RELATION_TYPE_LABELS[t] ?? t;
export const extraFormatLabel = (f: AnilistFormat): string => EXTRA_FORMAT_LABELS[f] ?? f;
export const characterRoleLabel = (r: CharacterRole): string => CHARACTER_ROLE_LABELS[r] ?? r;

const firstNonEmpty = (...vals: (string | null | undefined)[]): string | null =>
	vals.find((v) => v != null && v.trim().length > 0) ?? null;

/** Relation title honoring the preferred title language, falling back to any present. */
export function relationTitle(r: AnimeRelation): string {
	const lang = settings.current.general.anilist_preferred_title_language;
	if (lang === 'English')
		return firstNonEmpty(r.english_title, r.romaji_title, r.native_title) ?? 'Untitled';
	if (lang === 'Native')
		return firstNonEmpty(r.native_title, r.romaji_title, r.english_title) ?? 'Untitled';
	return firstNonEmpty(r.romaji_title, r.english_title, r.native_title) ?? 'Untitled';
}

/** Relations sorted by `relation_type` in the spec's order. */
export function sortRelations(relations: AnimeRelation[]): AnimeRelation[] {
	return [...relations].sort(
		(a, b) =>
			RELATION_TYPE_ORDER.indexOf(a.relation_type) - RELATION_TYPE_ORDER.indexOf(b.relation_type)
	);
}

/** Print formats link to the AniList manga page; anime formats open in-app. */
const PRINT_FORMATS = new Set<AnilistFormat>(['MANGA', 'NOVEL', 'ONE_SHOT']);

/** Where a relation card links: in-app anime view, or AniList for print media. */
export function relationLink(r: AnimeRelation): { href: string; external: boolean } {
	if (PRINT_FORMATS.has(r.format)) return { href: anilistMangaUrl(r.id), external: true };
	return { href: `/browse?anilist_id=${r.id}`, external: false };
}

/** Role display priority for the characters row (MAIN → SUPPORTING → BACKGROUND). */
const ROLE_RANK: Record<CharacterRole, number> = { MAIN: 0, SUPPORTING: 1, BACKGROUND: 2 };
const roleRank = (role: CharacterRole | null): number => (role ? ROLE_RANK[role] : 3);

/** Characters sorted by role; the source order is the (stable) tiebreaker. */
export function sortCharacters(characters: AnimeCharacter[]): AnimeCharacter[] {
	return [...characters].sort((a, b) => roleRank(a.role) - roleRank(b.role));
}
