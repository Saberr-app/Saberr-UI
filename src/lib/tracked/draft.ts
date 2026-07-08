/* =============================================================================
 * SABERR TRACK DIALOG DRAFT — seeds + serializes the Add/Edit tracking form. Create autofills
 * from settings (processing defaults + global release profile); edit hydrates from a
 * `TrackedAnimeItem`. The release profile is an always-present editable object + a
 * `useDefaultProfile` flag (on → send `release_profile: null`).
 * ========================================================================== */

import type {
	AnilistAiringSchedule,
	AnilistAnimeFormat,
	AnilistAnimeSeason,
	AnilistAnimeStatus,
	AnimeItemWithUserEntry,
	Settings,
	TrackedAnimeCreateRequest,
	TrackedAnimeItem,
	TrackedAnimeRawSettings,
	TrackedAnimeReleaseGroupSettings,
	TrackedAnimeReleaseProfileSettings,
	TrackedAnimeTVDBSettings,
	TrackedAnimeUpdateRequest
} from '$lib/api/types';
import type { AnimeRow } from '$lib/anilist/row';
import { coverImage } from '$lib/anilist/media';
import { displayTitle } from '$lib/anilist/titles';
import { mergeOverrides, seedOverrides } from './release-groups';

/** The minimal anime info the dialog shows + tracks against (create flow). */
export interface TrackAnimeSummary {
	anilistId: number;
	idMal: number | null;
	tvdbId: number | null;
	english_title: string | null;
	romaji_title: string | null;
	native_title: string | null;
	cover: string | null;
	format: AnilistAnimeFormat | null;
	season: AnilistAnimeSeason | null;
	seasonYear: number | null;
	episodes: number | null;
	airingStatus: AnilistAnimeStatus;
	nextEpisode: AnilistAiringSchedule | null;
}

export const summaryFromRow = (r: AnimeRow): TrackAnimeSummary => ({
	anilistId: r.anilistId,
	idMal: r.idMal,
	tvdbId: r.tvdbId,
	english_title: r.english_title,
	romaji_title: r.romaji_title,
	native_title: r.native_title,
	cover: r.coverThumb ?? r.cover,
	format: r.format,
	season: r.season,
	seasonYear: r.seasonYear,
	episodes: r.episodes,
	airingStatus: r.airingStatus,
	nextEpisode: r.nextEpisode
});

export const summaryFromAnime = (a: AnimeItemWithUserEntry): TrackAnimeSummary => ({
	anilistId: a.id,
	idMal: a.idMal,
	tvdbId: a.tvdb_series_id ?? null,
	english_title: a.english_title,
	romaji_title: a.romaji_title,
	native_title: a.native_title,
	cover: coverImage(a, 'small'),
	format: a.format,
	season: a.season,
	seasonYear: a.season_year,
	episodes: a.episodes,
	airingStatus: a.status,
	nextEpisode: a.next_airing_episode
});

export const summaryFromItem = (item: TrackedAnimeItem): TrackAnimeSummary => ({
	anilistId: item.anime.id,
	idMal: item.anime.idMal,
	tvdbId: item.anime.tvdb_series_id ?? null,
	english_title: item.anime.english_title,
	romaji_title: item.anime.romaji_title,
	native_title: item.anime.native_title,
	cover: coverImage(item.anime, 'small'),
	format: item.anime.format,
	season: item.anime.season,
	seasonYear: item.anime.season_year,
	episodes: item.anime.episodes,
	airingStatus: item.anime.status,
	nextEpisode: item.anime.next_airing_episode
});

/** The full editable form state. */
export interface TrackDraft {
	show_parent_directory: string;
	show_folder_name: string;
	/** Episode to start downloading/reporting from. Null while required-but-unset (blocks save). */
	from_episode: number | null;
	episode_number_padding: number;
	tvdb_structure_enabled: boolean;
	raw_settings: TrackedAnimeRawSettings;
	tvdb_settings: TrackedAnimeTVDBSettings;
	/** Per-group overrides (title + offset) for EVERY available group; enablement/order live on
	 *  `release_profile.preferred_release_groups`. Sent sparsely (see `overridesToSend`). */
	release_group_settings: TrackedAnimeReleaseGroupSettings[];
	/** When true → send `release_profile: null`. */
	useDefaultProfile: boolean;
	/** Always present so toggling Custom on reveals a pre-filled profile. Its
	 *  `preferred_release_groups` is the enabled+ordered group list (seeded from global under default). */
	release_profile: TrackedAnimeReleaseProfileSettings;
}

/** Default TVDB padding when settings carry no per-field default. */
const DEFAULT_PADDING = 2;
const DEFAULT_SEASON_DIR_PADDING = 1;

/** Default "Track from episode": finished → past the last; not-yet-released → 1; releasing → the
 *  next airing episode if known, else null (required, blocks save). */
function defaultFromEpisode(summary: TrackAnimeSummary): number | null {
	switch (summary.airingStatus) {
		case 'FINISHED':
			return (summary.episodes ?? 0) + 1;
		case 'NOT_YET_RELEASED':
			return 1;
		case 'RELEASING':
			return summary.nextEpisode?.episode ?? null;
		default:
			// CANCELLED / HIATUS — prefer a known next episode, else start from 1.
			return summary.nextEpisode?.episode ?? 1;
	}
}

/** The backend's global default release profile has id 1; a null profile is also default. */
export const isDefaultProfile = (
	p: TrackedAnimeReleaseProfileSettings | null | undefined
): boolean => p == null || p.id === 1;

/** Map the global release profile (no id) into the per-anime shape (id 0 = new). */
function profileFromSettings(s: Settings): TrackedAnimeReleaseProfileSettings {
	const p = s.profile;
	return {
		preferred_release_groups: [...p.preferred_release_groups],
		preferred_encodings: [...p.preferred_encodings],
		preferred_resolutions: [...p.preferred_resolutions],
		preferred_language_codes: [...p.preferred_language_codes],
		preferred_sources: [...p.preferred_sources],
		language_codes_restricted: p.language_codes_restricted,
		sources_restricted: p.sources_restricted,
		accept_release_upgrades: p.accept_release_upgrades,
		priorities_sorted: [...p.priorities_sorted],
		id: 0
	};
}

/** Seed a create draft entirely from the user's settings. */
export function createDraft(summary: TrackAnimeSummary, s: Settings): TrackDraft {
	const proc = s.processing;
	return {
		show_parent_directory: proc.default_destination_directory ?? '',
		show_folder_name: displayTitle(summary),
		from_episode: defaultFromEpisode(summary),
		episode_number_padding: DEFAULT_PADDING,
		tvdb_structure_enabled: proc.tvdb_structure_enabled_default,
		raw_settings: { raw_episode_file_name_format: proc.default_raw_episode_file_name_format },
		tvdb_settings: {
			tvdb_season_type: 'official',
			season_number_padding: DEFAULT_PADDING,
			season_directory_number_padding: DEFAULT_SEASON_DIR_PADDING,
			season_directory_name_format: proc.default_season_directory_name_format,
			episode_file_name_format: proc.default_episode_file_name_format,
			titleless_episode_file_name_format: proc.default_titleless_episode_file_name_format
		},
		// No overrides yet — one null/0 record per available group.
		release_group_settings: seedOverrides(s.meta.available_release_groups),
		useDefaultProfile: true,
		release_profile: profileFromSettings(s)
	};
}

/** Hydrate an edit draft from an existing tracked item (falling back to settings). */
export function editDraft(item: TrackedAnimeItem, s: Settings): TrackDraft {
	return {
		show_parent_directory: item.show_parent_directory,
		show_folder_name: item.show_folder_name,
		from_episode: item.from_episode,
		episode_number_padding: item.episode_number_padding,
		tvdb_structure_enabled: item.tvdb_structure_enabled,
		raw_settings: { ...item.raw_settings },
		tvdb_settings: { ...item.tvdb_settings },
		// Overlay the item's overrides onto null/0 defaults for every available group.
		release_group_settings: mergeOverrides(
			s.meta.available_release_groups,
			item.release_group_settings
		),
		useDefaultProfile: isDefaultProfile(item.release_profile),
		release_profile:
			item.release_profile && !isDefaultProfile(item.release_profile)
				? { ...item.release_profile }
				: profileFromSettings(s)
	};
}

/**
 * Sparse per-group overrides to send. `enabled` = the EFFECTIVE preferred list (global under a
 * default profile, the per-anime list under custom). For each enabled group, send a record when it
 * carries a real override now, OR — on update — when the baseline had one that's now cleared (explicit
 * null/0 to unset). Untouched-empty + all disabled groups are omitted (backend PATCH semantics:
 * absent = unchanged). Offset only rides a non-empty title.
 */
function overridesToSend(
	overrides: TrackedAnimeReleaseGroupSettings[],
	enabledList: string[],
	baseline?: TrackedAnimeReleaseGroupSettings[]
): TrackedAnimeReleaseGroupSettings[] {
	const enabled = new Set(enabledList);
	const baseTitle = new Map(
		(baseline ?? []).map((g) => [g.release_group_name, g.override_match_against?.trim() || null])
	);
	const out: TrackedAnimeReleaseGroupSettings[] = [];
	for (const g of overrides) {
		if (!enabled.has(g.release_group_name)) continue;
		const title = g.override_match_against?.trim() || null;
		if (title != null) {
			out.push({
				release_group_name: g.release_group_name,
				override_match_against: title,
				episode_number_offset: g.episode_number_offset
			});
		} else if (baseTitle.get(g.release_group_name) != null) {
			// Previously overridden, now cleared → explicit unset so the backend clears it.
			out.push({
				release_group_name: g.release_group_name,
				override_match_against: null,
				episode_number_offset: 0
			});
		}
	}
	return out;
}

/** Shared, fully-trimmed settings payload (strings stripped before send), minus release groups. */
function trimmedBase(d: TrackDraft) {
	return {
		show_parent_directory: d.show_parent_directory.trim(),
		show_folder_name: d.show_folder_name.trim(),
		// Guarded by `canSave` (null blocks save); `?? 1` only as a type-safe fallback.
		from_episode: d.from_episode ?? 1,
		episode_number_padding: d.episode_number_padding,
		tvdb_structure_enabled: d.tvdb_structure_enabled,
		raw_settings: {
			raw_episode_file_name_format: d.raw_settings.raw_episode_file_name_format.trim()
		},
		tvdb_settings: {
			...d.tvdb_settings,
			season_directory_name_format: d.tvdb_settings.season_directory_name_format.trim(),
			episode_file_name_format: d.tvdb_settings.episode_file_name_format.trim(),
			titleless_episode_file_name_format: d.tvdb_settings.titleless_episode_file_name_format.trim()
		}
	};
}

/** The enabled group set that will actually apply: global under default, per-anime under custom. */
const effectivePreferred = (d: TrackDraft, globalPreferred: string[]): string[] =>
	d.useDefaultProfile ? globalPreferred : d.release_profile.preferred_release_groups;

export function draftToCreate(
	summary: TrackAnimeSummary,
	d: TrackDraft,
	globalPreferred: string[]
): TrackedAnimeCreateRequest {
	return {
		anilist_id: summary.anilistId,
		...trimmedBase(d),
		release_group_settings: overridesToSend(
			d.release_group_settings,
			effectivePreferred(d, globalPreferred)
		),
		// Strip the id for the create-request profile variant (carries preferred_release_groups).
		release_profile: d.useDefaultProfile
			? null
			: (() => {
					const { id: _id, ...rest } = d.release_profile;
					void _id;
					return rest;
				})()
	};
}

/** `baseline` = the original item's overrides, needed to emit explicit unsets on cleared groups. */
export function draftToUpdate(
	d: TrackDraft,
	globalPreferred: string[],
	baseline?: TrackedAnimeReleaseGroupSettings[],
	unarchive = false
): TrackedAnimeUpdateRequest {
	return {
		...trimmedBase(d),
		release_group_settings: overridesToSend(
			d.release_group_settings,
			effectivePreferred(d, globalPreferred),
			baseline
		),
		release_profile: d.useDefaultProfile ? null : { ...d.release_profile },
		...(unarchive ? { unarchive: true } : {})
	};
}

/** Pick the slash style from a path's existing separators (default unix). */
function inferSlash(path: string): '\\' | '/' {
	if (path.includes('\\')) return '\\';
	return '/';
}

/** Join parent + folder using the parent's slash style, for the validate call + preview. */
export function joinShowPath(parent: string, folder: string): string {
	const p = parent.trim();
	const f = folder.trim();
	const base = p.replace(/[\\/]+$/, '');
	if (!base) return f;
	if (!f) return base;
	return `${base}${inferSlash(p)}${f}`;
}

/** "Episode 1 → Episode 01" preview for the padding field. */
export function paddingPreview(padding: number): string {
	const safe = Math.max(0, Math.floor(padding));
	return `Episode 1 → Episode ${String(1).padStart(safe || 1, '0')}`;
}
