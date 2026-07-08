/* =============================================================================
 * SABERR AUDIT DATA ACCESSORS — typed getters over the arbitrary `data` dict, plus the preferred
 * anime title + episode descriptor every builder needs.
 * ========================================================================== */

import { settings } from '$lib/stores/settings.svelte';
import type { TitleLanguage } from '$lib/api/types';

export function str(v: unknown): string | null {
	return typeof v === 'string' && v.length > 0 ? v : null;
}

export function num(v: unknown): number | null {
	return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function asRecord(v: unknown): Record<string, unknown> | null {
	return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

export function asArray(v: unknown): unknown[] {
	return Array.isArray(v) ? v : [];
}

const TITLE_KEY: Record<TitleLanguage, 'native' | 'romaji' | 'english'> = {
	Native: 'native',
	Romaji: 'romaji',
	English: 'english'
};

/** Anime title to show: preferred language → romaji (guaranteed) → english/native. Accepts the
 *  `{native,romaji,english}` object or a plain string. */
export function animeTitleFrom(data: Record<string, unknown>): string | null {
	const raw = data.anime_title;
	if (typeof raw === 'string') return raw || null;
	const obj = asRecord(raw);
	if (!obj) return null;
	const preferred =
		TITLE_KEY[settings.current.general.anilist_preferred_title_language] ?? 'romaji';
	return str(obj[preferred]) ?? str(obj.romaji) ?? str(obj.english) ?? str(obj.native);
}

/** "Episode #5" for one, "Episodes #5, #6" for many; null when none present. */
export function episodeDescriptor(data: Record<string, unknown>): string | null {
	const single = num(data.episode_number);
	if (single != null) return `Episode #${single}`;
	const list = asArray(data.episode_numbers)
		.map(num)
		.filter((n): n is number => n != null);
	if (list.length === 1) return `Episode #${list[0]}`;
	if (list.length > 1) return `Episodes ${list.map((n) => `#${n}`).join(', ')}`;
	return null;
}
