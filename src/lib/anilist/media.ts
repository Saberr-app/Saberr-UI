/* =============================================================================
 * SABERR ANIME ACCESSORS — small shared, presentation-agnostic accessors for anime/list shapes.
 * ========================================================================== */

import type { AnimeItemBase, AnimeItemWithUserEntry, AnilistStudio } from '$lib/api/types';
import { resolveBackendUrl } from '$lib/config/api';

/** On the user's list? null `user_entry` = not on list — change this one predicate if the backend always sends an object. */
export const isOnList = (item: Pick<AnimeItemWithUserEntry, 'user_entry'>): boolean =>
	item.user_entry != null;

/** Whether Saberr is tracking this anime. */
export const isTracked = (item: { tracked_anime_id: number | null }): boolean =>
	item.tracked_anime_id != null;

export type CoverSize = 'small' | 'medium' | 'large';

/** Cover at the requested size, falling back to the nearest available. Decoded-bitmap memory scales
 *  with source pixels, so list/grid views should ask smaller than the detail hero. */
export function coverImage(anime: AnimeItemBase, size: CoverSize = 'large'): string | null {
	const { small_cover_image: s, medium_cover_image: m, large_cover_image: l } = anime;
	const order = size === 'small' ? [s, m, l] : size === 'medium' ? [m, l, s] : [l, m, s];
	return resolveBackendUrl(order.find((x) => x != null) ?? null);
}

/** The primary studio (falls back to the first), or null. */
export function primaryStudio(studios: AnilistStudio[] | null | undefined): AnilistStudio | null {
	if (!studios || studios.length === 0) return null;
	return studios.find((s) => s.is_primary) ?? studios[0];
}
