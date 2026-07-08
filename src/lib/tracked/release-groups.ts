/* =============================================================================
 * SABERR TRACKED-ANIME RELEASE GROUP HELPERS — seed per-anime override records (title + offset)
 * for every available group, and detect the "nothing will download" state (no enabled groups).
 * Enablement + order live on the profile's `preferred_release_groups`, not here.
 * ========================================================================== */

import type { TrackedAnimeReleaseGroupSettings } from '$lib/api/types';

/** One null/0 override record per available group (nothing overridden yet). */
export function seedOverrides(availableGroups: string[]): TrackedAnimeReleaseGroupSettings[] {
	return availableGroups.map((name) => ({
		release_group_name: name,
		episode_number_offset: 0,
		override_match_against: null
	}));
}

/** Overlay an item's returned overrides onto null/0 defaults for every available group, so each
 *  group has a working record (groups absent from the API response ⇒ treated as not set). */
export function mergeOverrides(
	availableGroups: string[],
	fromItem: TrackedAnimeReleaseGroupSettings[]
): TrackedAnimeReleaseGroupSettings[] {
	const byName = new Map(fromItem.map((g) => [g.release_group_name, g]));
	return availableGroups.map((name) => {
		const g = byName.get(name);
		return {
			release_group_name: name,
			episode_number_offset: g?.episode_number_offset ?? 0,
			override_match_against: g?.override_match_against ?? null
		};
	});
}

/** Nothing can download: no groups are enabled (effective preferred list empty). */
export const noEnabledGroups = (preferred: string[]): boolean => preferred.length === 0;

/** Case-insensitive alphabetical sort (for the disabled-groups section). */
export const sortAlpha = (names: string[]): string[] =>
	[...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
