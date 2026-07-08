/* =============================================================================
 * SABERR SETTINGS DEFAULTS — backend defaults; fallback when GET /settings fails +
 * the source for each page's "Reset Defaults". `defaultSettings()` = fresh deep copy.
 * ========================================================================== */

import type { Settings } from '$lib/api/types';

const DEFAULTS: Settings = {
	general: {
		set_download_as_failed_after_minutes: 180,
		set_processing_as_failed_after_minutes: 15,
		timezone: 'UTC',
		published_url: null,
		anilist_preferred_title_language: 'Romaji'
	},
	profile: {
		preferred_release_groups: ['Erai-raws', 'DKB', 'Judas'],
		preferred_encodings: ['HEVC', 'AV1', 'AVC'],
		preferred_resolutions: ['1080p'],
		preferred_language_codes: ['JP', 'CN', 'EN'],
		preferred_sources: [],
		language_codes_restricted: true,
		sources_restricted: false,
		accept_release_upgrades: true,
		priorities_sorted: [
			'resolution',
			'language_code',
			'release_group',
			'source',
			'version',
			'encoding'
		]
	},
	anilist: {
		anilist_username: null,
		anilist_user_token: 'UNSET',
		anilist_user_data: null
	},
	qbit: {
		qbit_base_url: null,
		qbit_username: null,
		qbit_password: 'UNSET',
		torrent_category: 'Seasonal Anime',
		staging_directory: null,
		organize_downloads: true,
		apply_release_group_as_torrent_tag: true,
		apply_encoding_as_torrent_tag: false,
		apply_resolution_as_torrent_tag: false,
		apply_language_code_as_torrent_tag: false,
		apply_anime_title_as_torrent_tag: true
	},
	rss: {
		auto_download: true,
		rss_check_frequency: 600,
		rss_category: 'English Translated'
	},
	processing: {
		default_destination_directory: null,
		default_show_directory_name_format: '{tvdb_title_english}',
		default_season_directory_name_format: 'Season {season_number}',
		default_raw_episode_file_name_format: '{anilist_title_romaji} - {episode_number}',
		default_episode_file_name_format:
			'{tvdb_title_english} - S{season_number}E{episode_number} - {episode_title}',
		default_titleless_episode_file_name_format:
			'{tvdb_title_english} - S{season_number}E{episode_number}',
		tvdb_structure_enabled_default: true
	},
	discord: {
		notifications_discord_webhook_url: null,
		discord_webhook_username: null,
		discord_webhook_avatar_url: null,
		discord_user_id: null,
		discord_notify_on_login: false,
		discord_notify_on_download_processed: true,
		discord_notify_on_upgrade_download_processed: false,
		discord_notify_on_download_failed: true
	},
	meta: {
		show_directory_formatting_tokens: {
			'AniList Title (Japanese)': 'anilist_title_japanese',
			'AniList Title (Romaji)': 'anilist_title_romaji',
			'AniList Title (English)': 'anilist_title_english',
			'TVDB Title (English)': 'tvdb_title_english',
			Season: 'season',
			'Season Year': 'season_year'
		},
		season_directory_formatting_tokens: {
			'Season Number': 'season_number'
		},
		raw_episode_formatting_tokens: {
			'AniList Title (Japanese)': 'anilist_title_japanese',
			'AniList Title (English)': 'anilist_title_english',
			'AniList Title (Romaji)': 'anilist_title_romaji',
			'TVDB Title (English)': 'tvdb_title_english',
			Season: 'season',
			'Season Year': 'season_year',
			'Episode Number': 'episode_number',
			Encoding: 'encoding',
			Resolution: 'resolution',
			'Release Group': 'release_group'
		},
		full_episode_formatting_tokens: {
			'AniList Title (Japanese)': 'anilist_title_japanese',
			'AniList Title (English)': 'anilist_title_english',
			'AniList Title (Romaji)': 'anilist_title_romaji',
			'TVDB Title (English)': 'tvdb_title_english',
			Season: 'season',
			'Season Year': 'season_year',
			'Season Number': 'season_number',
			'Episode Number': 'episode_number',
			'Absolute Episode Number': 'absolute_episode_number',
			'Episode Title': 'episode_title',
			Encoding: 'encoding',
			Resolution: 'resolution',
			'Release Group': 'release_group'
		},
		titleless_episode_formatting_tokens: {
			'AniList Title (Japanese)': 'anilist_title_japanese',
			'AniList Title (English)': 'anilist_title_english',
			'AniList Title (Romaji)': 'anilist_title_romaji',
			'TVDB Title (English)': 'tvdb_title_english',
			Season: 'season',
			'Season Year': 'season_year',
			'Season Number': 'season_number',
			'Episode Number': 'episode_number',
			'Absolute Episode Number': 'absolute_episode_number',
			Encoding: 'encoding',
			Resolution: 'resolution',
			'Release Group': 'release_group'
		},
		available_release_groups: ['Erai-raws', 'DKB', 'Judas', 'SubsPlease', 'ASW']
	}
};

/** A fresh deep copy of the defaults, safe to mutate. */
export function defaultSettings(): Settings {
	return structuredClone(DEFAULTS);
}
