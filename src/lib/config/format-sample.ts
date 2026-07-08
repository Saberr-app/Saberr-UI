/* =============================================================================
 * SABERR FORMAT PREVIEW SAMPLES — token values for the live filename/dir preview.
 * ========================================================================== */

export const SAMPLE_TOKEN_VALUES: Record<string, string> = {
	anilist_title_japanese: '進撃の巨人 Season２',
	anilist_title_romaji: 'Shingeki no Kyojin Season 2',
	anilist_title_english: 'Attack on Titan Season 2',
	tvdb_title_english: 'Attack on Titan',
	season: 'Spring',
	season_year: '2017',
	season_number: '2',
	episode_number: '12',
	absolute_episode_number: '37',
	episode_title: 'Scream',
	encoding: 'HEVC',
	resolution: '1080p',
	release_group: 'SubsPlease'
};

const pad2 = (n: string) => n.padStart(2, '0');

/** Like SAMPLE_TOKEN_VALUES, but episode/season numbers zero-padded to 2 digits. */
export const EPISODE_SAMPLE_TOKEN_VALUES: Record<string, string> = {
	...SAMPLE_TOKEN_VALUES,
	episode_number: pad2(SAMPLE_TOKEN_VALUES.episode_number),
	season_number: pad2(SAMPLE_TOKEN_VALUES.season_number)
};

/** Sample show title used in the destination-directory preview. */
export const SAMPLE_SHOW_TITLE = 'Attack on Titan';

/** Folder/file tree previews per structuring mode (structuring radio + track dialog). */
export const TVDB_STRUCTURE_PREVIEW =
	`${SAMPLE_TOKEN_VALUES.tvdb_title_english}\n` +
	`└─ Season ${SAMPLE_TOKEN_VALUES.season_number}\n` +
	`   └─ Episode ${EPISODE_SAMPLE_TOKEN_VALUES.episode_number} - ${SAMPLE_TOKEN_VALUES.episode_title}.mkv`;

export const ANILIST_STRUCTURE_PREVIEW =
	`${SAMPLE_TOKEN_VALUES.anilist_title_romaji}\n` +
	`└─ Episode ${EPISODE_SAMPLE_TOKEN_VALUES.episode_number}.mkv`;
