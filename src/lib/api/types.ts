/* =============================================================================
 * SABERR API TYPES — backend request/response shapes. Success bodies are wrapped in
 * a top-level `data` (unwrapped by the HTTP client); errors carry `detail` + `code`.
 * ========================================================================== */

/* --- Enums (string unions) -------------------------------------------------- */

export type TitleLanguage = 'Native' | 'Romaji' | 'English';
export type Encoding = 'HEVC' | 'AVC' | 'AV1';
export type Resolution = '1080p' | '720p' | '540p' | '480p';
export type Source =
	| 'Crunchyroll'
	| 'Netflix'
	| 'Amazon'
	| 'Disney+'
	| 'Anime Digital Network'
	| 'HIDIVE'
	| 'Hulu';
export type Priority =
	| 'resolution'
	| 'language_code'
	| 'release_group'
	| 'source'
	| 'version'
	| 'encoding';
export type TokenState = 'SET' | 'UNSET';

export const ENCODINGS: Encoding[] = ['HEVC', 'AVC', 'AV1'];
export const RESOLUTIONS: Resolution[] = ['1080p', '720p', '540p', '480p'];
export const SOURCES: Source[] = [
	'Crunchyroll',
	'Netflix',
	'Amazon',
	'Disney+',
	'Anime Digital Network',
	'HIDIVE',
	'Hulu'
];
export const TITLE_LANGUAGES: TitleLanguage[] = ['Native', 'Romaji', 'English'];
/** All priorities must always be present; this is the full set + display order anchor. */
export const PRIORITIES: Priority[] = [
	'resolution',
	'language_code',
	'release_group',
	'source',
	'version',
	'encoding'
];

/* --- Settings (`GET /api/v1/settings`, data-wrapped) ------------------------ */

export interface GeneralSettings {
	set_download_as_failed_after_minutes: number;
	set_processing_as_failed_after_minutes: number;
	timezone: string;
	published_url: string | null;
	anilist_preferred_title_language: TitleLanguage;
}

export interface ProfileSettings {
	preferred_release_groups: string[];
	preferred_encodings: Encoding[];
	preferred_resolutions: Resolution[];
	preferred_language_codes: string[];
	preferred_sources: Source[];
	language_codes_restricted: boolean;
	sources_restricted: boolean;
	accept_release_upgrades: boolean;
	priorities_sorted: Priority[];
}

/** AniList scoring system — drives score display + the edit widget (int/decimal/5-star/3-smiley). `0` = unset. */
export type AnilistScoreFormat =
	| 'POINT_100'
	| 'POINT_10_DECIMAL'
	| 'POINT_10'
	| 'POINT_5'
	| 'POINT_3';

/** AniList account profile (connected card); echoed by the auth call, stored on `AnilistSettings.anilist_user_data`. */
export interface AnilistUserData {
	username: string;
	avatar: string | null;
	banner: string | null;
	current_anime_count: number;
	planning_anime_count: number;
	completed_anime_count: number;
	/** 0 means "no score yet" — render as a dash. */
	mean_score: number;
	site_url: string;
	/** Raw role keys (snake_case); displayed as title-cased badges, max 3. */
	moderator_roles: string[] | null;
	/** The account's scoring system — governs score display + the edit widget. */
	score_format: AnilistScoreFormat;
}

export interface AnilistSettings {
	anilist_username: string | null;
	anilist_user_token: TokenState;
	anilist_user_data: AnilistUserData | null;
}

/** All qBit settings, as stored / returned by GET `/settings`. ⚠️ `qbit_password` is a **masked
 *  sentinel** here (never the real password) — `'SET'` when one is configured, `'UNSET'` otherwise. */
export interface QbitSettings {
	qbit_base_url: string | null;
	qbit_username: string | null;
	qbit_password: 'SET' | 'UNSET';
	torrent_category: string | null;
	staging_directory: string | null;
	qbit_remote_path_mapping_remote_path: string | null;
	qbit_remote_path_mapping_local_path: string | null;
	organize_downloads: boolean;
	apply_release_group_as_torrent_tag: boolean;
	apply_encoding_as_torrent_tag: boolean;
	apply_resolution_as_torrent_tag: boolean;
	apply_language_code_as_torrent_tag: boolean;
	apply_anime_title_as_torrent_tag: boolean;
}

/** PUT `/settings/qbit/service` body. `qbit_password` is **omitted to keep** the stored password,
 *  `null` to clear it, or a plaintext string to set a new one. */
export type QbitSettingsUpdate = Omit<QbitSettings, 'qbit_password'> & {
	qbit_password?: string | null;
};

/** Connection-only subset sent to the test endpoint (`POST /settings/qbit/test`). `qbit_password`
 *  omitted ⇒ the backend uses the stored password (unchanged); else the same set/clear rules. */
export interface QbitConnection {
	qbit_base_url: string | null;
	qbit_username: string | null;
	qbit_password?: string | null;
}

/** RSS feed filter categories, in display order. Wire value == display label. */
export const RSS_CATEGORIES = [
	'English Translated',
	'Non-English Translated',
	'Raw',
	'AMV',
	'All'
] as const;
export type RssCategory = (typeof RSS_CATEGORIES)[number];

export interface RssSettings {
	auto_download: boolean;
	rss_check_frequency: number;
	rss_category: RssCategory;
}

export interface ProcessingSettings {
	default_destination_directory: string | null;
	default_show_directory_name_format: string;
	default_season_directory_name_format: string;
	default_raw_episode_file_name_format: string;
	default_episode_file_name_format: string;
	default_titleless_episode_file_name_format: string;
	tvdb_structure_enabled_default: boolean;
}

export interface DiscordSettings {
	notifications_discord_webhook_url: string | null;
	/** Name the webhook posts under (nullable). */
	discord_webhook_username: string | null;
	/** Webhook avatar image URL (nullable). */
	discord_webhook_avatar_url: string | null;
	discord_user_id: string | null;
	discord_notify_on_login: boolean;
	discord_notify_on_download_processed: boolean;
	discord_notify_on_upgrade_download_processed: boolean;
	discord_notify_on_download_failed: boolean;
}

/** Map of "Display name" -> "actual_token" (token serialized as `{actual_token}`). */
export type FormattingTokens = Record<string, string>;

export interface SettingsMeta {
	show_directory_formatting_tokens: FormattingTokens;
	season_directory_formatting_tokens: FormattingTokens;
	raw_episode_formatting_tokens: FormattingTokens;
	full_episode_formatting_tokens: FormattingTokens;
	titleless_episode_formatting_tokens: FormattingTokens;
	available_release_groups: string[];
}

export interface Settings {
	general: GeneralSettings;
	profile: ProfileSettings;
	anilist: AnilistSettings;
	qbit: QbitSettings;
	rss: RssSettings;
	processing: ProcessingSettings;
	discord: DiscordSettings;
	meta: SettingsMeta;
}

/* --- Status (`GET /api/v1/status`, data-wrapped) ---------------------------- */

export type ServiceCode = 'qbit' | 'anilist' | 'tvdb' | 'rss' | 'notifications_discord_webhook';

export type ServiceErrorLevel = 'Down' | 'Auth Issue' | 'Not Configured' | 'Internal Error';

export interface ServiceStatus {
	name: string;
	healthy: boolean;
	/** Present only when unhealthy. */
	error_level?: ServiceErrorLevel;
	error_details?: string;
	error_code?: number;
}

/** Backend run context. The credentials setup/reset feature is windows-only. */
export type AppContext = 'console' | 'windows';

export interface Status {
	version: string;
	/** Lowest compatible UI version (semver); `UI_VERSION` below it → red refresh warning. */
	ui_minimum_version: string;
	/** Backend run context; the credentials setup/reset UI only surfaces under 'windows'. */
	context: AppContext;
	unread_notification_count: number;
	unread_error_notification_count: number;
	/** ISO datetime (UTC) of when settings were last updated on the backend. */
	settings_last_updated_at: string;
	/** ISO datetime (UTC) of the last change to any tracked anime — drives a silent
	 *  background re-sync of the cached tracked list (see `tracked` store). */
	tracked_anime_last_updated_at: string;
	/** ISO datetime (UTC) of the last AniList user-list re-sync — marks the cached
	 *  user-list tabs stale so they refresh on next visit (see `userlist` store). */
	anime_list_last_refreshed_at: string;
	/** ISO datetime (UTC) of the most recently *added* download — advances when a new
	 *  download appears; drives a silent Downloads-list reconcile (see `downloads` store).
	 *  It's on the status snapshot, not the downloads-updates stream, which is closed
	 *  while nothing's unfinished. */
	download_last_added_at: string | null;
	/** A newer app release is published upstream (GitHub) — drives the green sidebar
	 *  "update available" banner. Details come from `/system/app-releases/latest`. */
	remote_update_available: boolean;
	services_status: Partial<Record<ServiceCode, ServiceStatus>>;
}

/* --- AniList connect flow (`/settings/anilist/*`) --------------------------- */

export interface AnilistLoginRequest {
	anilist_user_token: string;
}

/** Returned by the `test` endpoint so the user can confirm "that's me" before connecting. */
export interface AnilistLoginResponse {
	username: string;
}

/* --- Auth (`POST /api/v1/login`, NOT data-wrapped) -------------------------- */

export interface LoginRequest {
	username: string;
	password: string;
	stay_logged_in: boolean;
}

export interface LoginResponse {
	token: string;
	/** Unix timestamp (seconds). */
	expires_at: number;
}

/* --- Credentials setup / password reset (windows context) ------------------ */

export interface CredentialsStatus {
	is_set: boolean;
	context: AppContext;
}

export interface CredentialsSetupRequest {
	username: string;
	password: string;
}

/** Reset endpoint covers two flows: a login-page code reset (`reset_code`) and an
 *  authed change (`old_password`). Exactly one of the two is non-null per call. */
export interface ResetPasswordRequest {
	reset_code: string | null;
	old_password: string | null;
	new_password: string;
}

/* --- Shared query enums -------------------------------------------- */

export type SortDirection = 'asc' | 'desc';

/* --- Torrent download status ------------------------ */

/** Download/processing lifecycle status. */
export type TorrentDownloadStatus =
	| 'PENDING'
	| 'DOWNLOADING'
	| 'DOWNLOADED'
	| 'PROCESSING'
	| 'PROCESSED'
	| 'FAILED_DOWNLOAD_INIT'
	| 'FAILED_DOWNLOAD'
	| 'FAILED_PROCESSING'
	| 'DELETED'
	| 'DISCARDED';

/** Human display name per status (from the backend enum comments). */
export const TORRENT_DOWNLOAD_STATUS_LABELS: Record<TorrentDownloadStatus, string> = {
	PENDING: 'Pending download',
	DOWNLOADING: 'Downloading',
	DOWNLOADED: 'Downloaded',
	PROCESSING: 'Importing',
	PROCESSED: 'Imported',
	FAILED_DOWNLOAD_INIT: 'Failed to start downloading',
	FAILED_DOWNLOAD: 'Failed to download',
	FAILED_PROCESSING: 'Failed to import',
	DELETED: 'Deleted from client',
	DISCARDED: 'Discarded'
};

/* --- Tasks (`/api/v1/system/tasks`, data-wrapped) -------------------------- */

export interface WorkerLastRun {
	run_succeeded: boolean;
	/** UTC ISO datetime of the run. */
	run_time: string;
	/** Elapsed time in whole seconds. */
	run_duration: number;
	/** Failure reason when `run_succeeded` is false. */
	run_error: string | null;
}

export interface Task {
	id: string;
	name: string;
	category: string;
	/** Scheduled cadence in seconds (effectively always present). */
	frequency: number | null;
	/** Null until the task has run at least once. */
	last_run: WorkerLastRun | null;
	currently_running: boolean;
	/** UTC ISO datetime the current run started, or null when not running. */
	currently_running_since: string | null;
}

export interface TaskList {
	tasks: Task[];
}

/* --- Notifications (`/api/v1/notifications`, data-wrapped) ------------------ */

export type NotificationCode =
	| 'DOWNLOAD_PROCESSING_PERMANENTLY_FAILED'
	| 'UNCATEGORIZED_ERROR'
	| 'SERVICE_DOWN'
	| 'UNCATEGORIZED_WARNING'
	| 'GENERAL'
	| 'LOGIN';

export type NotificationLevel = 'INFO' | 'WARNING' | 'ERROR';

export type NotificationStatus = 'UNREAD' | 'READ' | 'STALE';

export interface NotificationItem {
	id: number;
	code: NotificationCode;
	level: NotificationLevel;
	/** May contain inline markdown (bold / code). */
	text: string;
	/** Code-specific payload — an object, a list, or null (shape handled per code). */
	identifier: Record<string, unknown> | unknown[] | null;
	status: NotificationStatus;
	/** UTC ISO datetime. */
	effective_at: string;
}

export interface NotificationListResponse {
	notifications: NotificationItem[];
}

/* --- Audit logs (`/api/v1/audit-logs`, data-wrapped) ----------------------- */

export type AuditLogCategory =
	| 'APP'
	| 'TORRENT_SELECTION'
	| 'TORRENT_PROCESSING'
	| 'TRACKED_ANIME'
	| 'ANILIST'
	| 'MAPPING_OVERRIDES'
	| 'EXTERNAL_SERVICE'
	| 'OTHER';

export type AuditLogCode =
	| 'APP_STARTED'
	| 'APP_EXITED'
	| 'LOGIN_SUCCEEDED'
	| 'LOGIN_FAILED'
	| 'SETTING_CHANGED'
	| 'TORRENT_DISCARDED'
	| 'TORRENT_SELECTED'
	| 'TORRENT_MANUALLY_SELECTED'
	| 'TORRENT_DOWNLOAD_STARTED'
	| 'TORRENT_DOWNLOAD_FINISHED'
	| 'TORRENT_DOWNLOAD_FAILED'
	| 'TORRENT_DOWNLOAD_DISCARDED'
	| 'TORRENT_DOWNLOAD_DELETED'
	| 'TORRENT_PROCESSING_STARTED'
	| 'TORRENT_PROCESSING_FINISHED'
	| 'TORRENT_PROCESSING_FAILED'
	| 'TRACKED_ANIME_ADDED'
	| 'TRACKED_ANIME_UPDATED'
	| 'TRACKED_ANIME_REMOVED'
	| 'TRACKED_ANIME_ARCHIVED'
	| 'ANILIST_ANIME_ADDED'
	| 'ANILIST_ANIME_UPDATED'
	| 'ANILIST_ANIME_DELETED'
	| 'BATCH_ANILIST_ANIME_ADDED'
	| 'BATCH_ANILIST_ANIME_UPDATED'
	| 'BATCH_ANILIST_ANIME_DELETED'
	| 'ANILIST_LIST_REFRESHED'
	| 'MAPPING_OVERRIDE_ADDED'
	| 'MAPPING_OVERRIDE_UPDATED'
	| 'MAPPING_OVERRIDE_DELETED'
	| 'SERVICE_SET_OFFLINE'
	| 'SERVICE_SET_ONLINE'
	| 'ANIME_RELATIONS_REFRESHED'
	| 'OTHER';

/** All categories, in enum order — drives the audit Category filter dropdown. */
export const AUDIT_CATEGORIES: AuditLogCategory[] = [
	'APP',
	'TORRENT_SELECTION',
	'TORRENT_PROCESSING',
	'TRACKED_ANIME',
	'ANILIST',
	'MAPPING_OVERRIDES',
	'EXTERNAL_SERVICE',
	'OTHER'
];

/** All codes, in enum order — drives the audit Event filter dropdown. */
export const AUDIT_CODES: AuditLogCode[] = [
	'APP_STARTED',
	'APP_EXITED',
	'LOGIN_SUCCEEDED',
	'LOGIN_FAILED',
	'SETTING_CHANGED',
	'TORRENT_DISCARDED',
	'TORRENT_SELECTED',
	'TORRENT_MANUALLY_SELECTED',
	'TORRENT_DOWNLOAD_STARTED',
	'TORRENT_DOWNLOAD_FINISHED',
	'TORRENT_DOWNLOAD_FAILED',
	'TORRENT_DOWNLOAD_DISCARDED',
	'TORRENT_DOWNLOAD_DELETED',
	'TORRENT_PROCESSING_STARTED',
	'TORRENT_PROCESSING_FINISHED',
	'TORRENT_PROCESSING_FAILED',
	'TRACKED_ANIME_ADDED',
	'TRACKED_ANIME_UPDATED',
	'TRACKED_ANIME_REMOVED',
	'TRACKED_ANIME_ARCHIVED',
	'ANILIST_ANIME_ADDED',
	'ANILIST_ANIME_UPDATED',
	'ANILIST_ANIME_DELETED',
	'BATCH_ANILIST_ANIME_ADDED',
	'BATCH_ANILIST_ANIME_UPDATED',
	'BATCH_ANILIST_ANIME_DELETED',
	'ANILIST_LIST_REFRESHED',
	'MAPPING_OVERRIDE_ADDED',
	'MAPPING_OVERRIDE_UPDATED',
	'MAPPING_OVERRIDE_DELETED',
	'SERVICE_SET_OFFLINE',
	'SERVICE_SET_ONLINE',
	'ANIME_RELATIONS_REFRESHED',
	'OTHER'
];

export interface AuditLogItem {
	id: number;
	code: AuditLogCode;
	category: AuditLogCategory;
	/** Backend-rendered fallback text (used when we can't build text from `data`). */
	text: string;
	/** Arbitrary per-code payload (see `src/lib/audit/`). */
	data: Record<string, unknown>;
	context_id: string;
	/** UTC ISO datetime. */
	created_at: string;
}

export interface AuditLogListResponse {
	audit_logs: AuditLogItem[];
}

/* --- Anime / Browse / User list ------------------------------------ */

/** Anime release format (AniList `format`). */
export type AnilistAnimeFormat = 'TV' | 'TV_SHORT' | 'MOVIE' | 'SPECIAL' | 'OVA' | 'ONA' | 'MUSIC';
/** Airing season. */
export type AnilistAnimeSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';
/** Adaptation source material. */
export type AnilistAnimeSource =
	| 'ORIGINAL'
	| 'MANGA'
	| 'LIGHT_NOVEL'
	| 'VISUAL_NOVEL'
	| 'VIDEO_GAME'
	| 'OTHER'
	| 'NOVEL'
	| 'DOUJINSHI'
	| 'ANIME'
	| 'WEB_NOVEL'
	| 'LIVE_ACTION'
	| 'GAME'
	| 'COMIC'
	| 'MULTIMEDIA_PROJECT'
	| 'PICTURE_BOOK';
/** Airing/release lifecycle status of the anime itself. */
export type AnilistAnimeStatus =
	| 'FINISHED'
	| 'RELEASING'
	| 'NOT_YET_RELEASED'
	| 'CANCELLED'
	| 'HIATUS';
/** The user's watch status for an anime (maps to the list subpages). */
export type AnilistAnimeUserStatus =
	| 'CURRENT'
	| 'PLANNING'
	| 'COMPLETED'
	| 'DROPPED'
	| 'PAUSED'
	| 'REPEATING';

/** Sort keys accepted by `GET /anime` (Browse search). */
export type AnimeSortBy =
	| 'TITLE_ROMAJI'
	| 'TITLE_ROMAJI_DESC'
	| 'TITLE_ENGLISH'
	| 'TITLE_ENGLISH_DESC'
	| 'TITLE_NATIVE'
	| 'TITLE_NATIVE_DESC'
	| 'TYPE'
	| 'TYPE_DESC'
	| 'FORMAT'
	| 'FORMAT_DESC'
	| 'START_DATE'
	| 'START_DATE_DESC'
	| 'END_DATE'
	| 'END_DATE_DESC'
	| 'SCORE'
	| 'SCORE_DESC'
	| 'POPULARITY'
	| 'POPULARITY_DESC'
	| 'TRENDING'
	| 'TRENDING_DESC'
	| 'EPISODES'
	| 'EPISODES_DESC'
	| 'DURATION'
	| 'DURATION_DESC'
	| 'STATUS'
	| 'STATUS_DESC'
	| 'UPDATED_AT'
	| 'UPDATED_AT_DESC'
	| 'FAVOURITES'
	| 'FAVOURITES_DESC';

/** Sort keys accepted by `GET /anime-list` (User list — server-side). */
export type UserAnimeListSortBy =
	| 'title'
	| 'season_and_year'
	| 'episodes'
	| 'started_at'
	| 'completed_at'
	| 'progress'
	| 'score'
	| 'status'
	| 'format'
	| 'source'
	| 'airing_status'
	| 'repeat_count'
	| 'time_until_airing';

/* Ordered constant lists for stable UI ordering (filters, selects, grouping). */
export const ANILIST_ANIME_FORMATS: AnilistAnimeFormat[] = [
	'TV',
	'TV_SHORT',
	'MOVIE',
	'SPECIAL',
	'OVA',
	'ONA',
	'MUSIC'
];
export const ANILIST_ANIME_SEASONS: AnilistAnimeSeason[] = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
export const ANILIST_ANIME_SOURCES: AnilistAnimeSource[] = [
	'ORIGINAL',
	'MANGA',
	'LIGHT_NOVEL',
	'VISUAL_NOVEL',
	'VIDEO_GAME',
	'OTHER',
	'NOVEL',
	'DOUJINSHI',
	'ANIME',
	'WEB_NOVEL',
	'LIVE_ACTION',
	'GAME',
	'COMIC',
	'MULTIMEDIA_PROJECT',
	'PICTURE_BOOK'
];
export const ANILIST_ANIME_STATUSES: AnilistAnimeStatus[] = [
	'FINISHED',
	'RELEASING',
	'NOT_YET_RELEASED',
	'CANCELLED',
	'HIATUS'
];
export const ANILIST_USER_STATUSES: AnilistAnimeUserStatus[] = [
	'CURRENT',
	'PLANNING',
	'COMPLETED',
	'DROPPED',
	'PAUSED',
	'REPEATING'
];

/** AniList fuzzy date (any part may be missing); structurally equal to `FuzzyDate` in anilist/entry.ts. */
export interface AnilistDate {
	year: number | null;
	month: number | null;
	day: number | null;
}

/** Next-episode airing schedule (all fields nullable). */
export interface AnilistAiringSchedule {
	/** Unix timestamp (seconds). */
	airing_at: number | null;
	episode: number | null;
	anilist_id: number | null;
	/** Episode duration in minutes — unused by us. */
	duration: number | null;
}

export interface AnilistTag {
	name: string;
	rank: number;
	is_media_spoiler: boolean;
	is_general_spoiler: boolean;
}

export interface AnilistStudio {
	name: string;
	site_url: string;
	is_primary: boolean;
}

export interface AnilistExternalLink {
	/** Display name; when null, derive the domain from `url`. */
	site: string | null;
	url: string;
}

/** A genre/tag the metadata endpoint exposes for filtering. */
export interface AnilistMetadataTag {
	name: string;
	category: string;
}

export interface AnilistMetadataResponse {
	tags: AnilistMetadataTag[];
	genres: string[];
}

/** Slim anime shape in user-list responses — no genres/tags/source/popularity/duration/
 *  description/is_adult, so user-list views can't filter or detect those. */
export interface AnimeItemBase {
	id: number;
	idMal: number | null;
	/** Backend adds this next to `idMal`; nullable until a TVDB match exists. */
	tvdb_series_id?: number | null;
	english_title: string | null;
	romaji_title: string | null;
	native_title: string | null;
	season: AnilistAnimeSeason | null;
	season_year: number | null;
	episodes: number | null;
	status: AnilistAnimeStatus;
	/** 100-based. */
	average_score: number | null;
	/** 100-based. */
	mean_score: number | null;
	next_airing_episode: AnilistAiringSchedule | null;
	banner_image: string | null;
	small_cover_image: string | null;
	medium_cover_image: string | null;
	large_cover_image: string | null;
	format: AnilistAnimeFormat | null;
	/** Present in tracked-anime / user-list payloads; absent in older ones. */
	start_date?: AnilistDate;
	end_date?: AnilistDate;
}

/** The user's list entry for an anime. */
export interface UserEntry {
	/** Watched episode count (out of `episodes`). */
	progress: number;
	/** Score in the account's `score_format`; `0` = unset. */
	score: number;
	status: AnilistAnimeUserStatus;
	repeat_count: number;
	is_private: boolean;
	started_at: AnilistDate;
	completed_at: AnilistDate;
	notes: string | null;
}

/** Full anime (`/anime`, `/anime/{id}`). `user_entry` = the account's entry, or null when
 *  NOT on the list (the `isOnList` signal — switch that one helper if the backend ever
 *  always sends an object); `tracked_anime_id` set when Saberr tracks it. */
export interface AnimeItemWithUserEntry extends AnimeItemBase {
	description: string | null;
	source: AnilistAnimeSource | null;
	/** Member count — higher = more popular. */
	popularity: number | null;
	/** Runtime in minutes. */
	duration: number | null;
	/** 2-letter country code. */
	country_of_origin: string | null;
	hashtag: string | null;
	synonyms: string[];
	start_date: AnilistDate;
	end_date: AnilistDate;
	genres: string[];
	tags: AnilistTag[];
	is_adult: boolean;
	studios: AnilistStudio[];
	trailer_url: string | null;
	external_links: AnilistExternalLink[];
	user_entry: UserEntry | null;
	tracked_anime_id: number | null;
}

/** An item in the user's anime list (`/anime-list`). Carries the slim anime. */
export interface UserAnimeListItem extends UserEntry {
	anime: AnimeItemBase;
	tracked_anime_id: number | null;
}

export interface AnimeListResponse {
	anime: AnimeItemWithUserEntry[];
}

export interface UserAnimeListResponse {
	anime_list: UserAnimeListItem[];
}

/** Request body for `PUT /anime-list/{id}` — all entry fields required. */
export interface UserAnimeUpdateRequest {
	progress: number;
	score: number;
	status: AnilistAnimeUserStatus;
	repeat_count: number;
	is_private: boolean;
	started_at: AnilistDate;
	completed_at: AnilistDate;
	notes: string | null;
}

/** Echo from `PUT /anime-list/{id}` — the saved entry plus the anime + tracking. */
export interface UserAnimeUpdateResponse extends UserEntry {
	anime: AnimeItemBase;
	tracked_anime_id: number | null;
}

/* --- Batch update / delete (`/anime-list/batch-*`) -------------------------- */

/** Partial entry data for batch-update — only the keys present are updated. */
export interface UserAnimeBatchUpdateRequestData {
	score?: number;
	status?: AnilistAnimeUserStatus;
}

/** One entry echoed by batch-update, keyed by `anilist_id` (no `anime` payload) → broadcast an `EntryChange`. */
export interface UserAnimeListItemMinimal extends UserEntry {
	anime: null;
	tracked_anime_id: number | null;
	anilist_id: number;
}

/** Echo from `POST /anime-list/batch-update`. */
export interface UserAnimeBatchUpdateResponse {
	updated_anime_list: UserAnimeListItemMinimal[];
}

/* --- Anime extras (`/anime/{id}/extras`) ----------------------------------- */

/** Format on related media — superset of `AnilistAnimeFormat` (adds print media). */
export type AnilistFormat = AnilistAnimeFormat | 'MANGA' | 'NOVEL' | 'ONE_SHOT';

export type RelationType =
	| 'ADAPTATION'
	| 'PREQUEL'
	| 'SEQUEL'
	| 'PARENT'
	| 'SIDE_STORY'
	| 'CHARACTER'
	| 'SUMMARY'
	| 'ALTERNATIVE'
	| 'SPIN_OFF'
	| 'OTHER'
	| 'SOURCE'
	| 'COMPILATION'
	| 'CONTAINS';

/** Display order for the relations row (the spec's enum order). */
export const RELATION_TYPE_ORDER: RelationType[] = [
	'ADAPTATION',
	'PREQUEL',
	'SEQUEL',
	'PARENT',
	'SIDE_STORY',
	'CHARACTER',
	'SUMMARY',
	'ALTERNATIVE',
	'SPIN_OFF',
	'OTHER',
	'SOURCE',
	'COMPILATION',
	'CONTAINS'
];

export type CharacterRole = 'MAIN' | 'SUPPORTING' | 'BACKGROUND';

export interface AnimeRelation {
	id: number;
	image_url: string | null;
	english_title: string | null;
	romaji_title: string | null;
	native_title: string | null;
	format: AnilistFormat;
	relation_type: RelationType;
	/** The user's watch status for this related anime, if it's on their list. */
	list_status: AnilistAnimeUserStatus | null;
}

/** A character's voice actor (or any staff attached to a character). */
export interface CharacterStaff {
	site_url: string;
	image_url: string | null;
	name: string;
}

export interface AnimeCharacter {
	site_url: string;
	image_url: string | null;
	name: string;
	role: CharacterRole | null;
	voice_actor: CharacterStaff | null;
}

export interface AnimeStaff {
	site_url: string;
	image_url: string | null;
	name: string;
	role: string | null;
}

export interface AnimeExtras {
	characters: AnimeCharacter[];
	relations: AnimeRelation[];
	staff: AnimeStaff[];
}

/** Source of a metadata value (e.g. a candidate title). */
export type MetadataSource = 'ANILIST' | 'TVDB';

/** One candidate title for an anime (folder-name suggestions). `language` is a free-text label. */
export interface AnimeTitle {
	source: MetadataSource;
	title: string;
	language: string;
}

export interface AnimeTitlesResponse {
	titles: AnimeTitle[];
}

/* --- Tracked anime -------------------------------------------------- */

/** Active vs archived tracked anime (the list endpoint's `status` filter). */
export type TrackedAnimeStatus = 'ACTIVE' | 'ARCHIVED';

/** TVDB ordering scheme used to structure a show's seasons/episodes. */
export type TVDBSeasonType = 'official' | 'absolute' | 'dvd' | 'alternate' | 'regional';
export const TVDB_SEASON_TYPES: TVDBSeasonType[] = [
	'official',
	'absolute',
	'dvd',
	'alternate',
	'regional'
];
export const TVDB_SEASON_TYPE_LABELS: Record<TVDBSeasonType, string> = {
	official: 'Aired Order',
	absolute: 'Absolute',
	dvd: 'DVD',
	alternate: 'Alternate',
	regional: 'Regional'
};

/** Whether a TVDB episode is a season, series, or midseason finale. */
export type TVDBFinaleType = 'series' | 'season' | 'midseason';

/** AniList-structuring file naming (single free-text format). */
export interface TrackedAnimeRawSettings {
	raw_episode_file_name_format: string;
}

/** TVDB-structuring naming + padding + season-type settings. */
export interface TrackedAnimeTVDBSettings {
	tvdb_season_type: TVDBSeasonType;
	season_number_padding: number;
	season_directory_number_padding: number;
	season_directory_name_format: string;
	episode_file_name_format: string;
	titleless_episode_file_name_format: string;
}

/** Per-release-group OVERRIDES only (title + offset). Enablement/order live on the profile's
 *  `preferred_release_groups`. Order here is irrelevant; sent sparsely (PATCH: absent = unchanged). */
export interface TrackedAnimeReleaseGroupSettings {
	release_group_name: string;
	/** Offset between torrent-claimed and actual episode number; 0 unless a custom title is set. */
	episode_number_offset: number;
	/** "Custom title" the group matches against; null = match the anime's titles. */
	override_match_against: string | null;
}

/** Per-tracked-anime release profile — the global `ProfileSettings` shape, plus a backend `id`.
 *  `preferred_release_groups` = the anime's enabled release groups, strictly ordered. */
export interface TrackedAnimeReleaseProfileSettings {
	preferred_release_groups: string[];
	preferred_encodings: Encoding[];
	preferred_resolutions: Resolution[];
	preferred_language_codes: string[];
	preferred_sources: Source[];
	language_codes_restricted: boolean;
	sources_restricted: boolean;
	accept_release_upgrades: boolean;
	priorities_sorted: Priority[];
	id: number;
}

/** Create-time release profile (same as above, sans `id`). */
export type TrackedAnimeReleaseProfileSettingsCreateRequest = Omit<
	TrackedAnimeReleaseProfileSettings,
	'id'
>;

/** Fields shared by the tracked-anime item and its create/update request bodies. */
export interface TrackedAnimeSettingsBase {
	show_parent_directory: string;
	show_folder_name: string;
	/** Download/report missing episodes starting from this episode number (1-based). */
	from_episode: number;
	episode_number_padding: number;
	tvdb_structure_enabled: boolean;
	raw_settings: TrackedAnimeRawSettings;
	tvdb_settings: TrackedAnimeTVDBSettings;
	release_group_settings: TrackedAnimeReleaseGroupSettings[];
}

/** Coverage stats (GET + list only). With `from_episode`, the inclusive range to cover is
 *  `[from_episode, latest]`. `latest_known_episode_number`: latest possibly-released ep
 *  (null = unknown, 0 = none yet). */
export interface EpisodeStats {
	latest_known_episode_number: number | null;
	processed_episode_count: number;
	downloading_episode_count: number;
	failed_episode_count: number;
}

/** A tracked anime (list rows + create/update echo). */
export interface TrackedAnimeItem extends TrackedAnimeSettingsBase {
	anilist_id: number;
	/** Null = use the global default release profile. */
	release_profile: TrackedAnimeReleaseProfileSettings | null;
	episode_stats: EpisodeStats;
	id: number;
	/** Active vs archived (returned on every GET, next to `id`). */
	status: TrackedAnimeStatus;
	anime: AnimeItemBase;
	user_entry: UserAnimeListItem | null;
}

/** The detail-page payload: a tracked anime plus its episodes. */
export interface TrackedAnimeItemWithEpisodes extends TrackedAnimeItem {
	episodes: TrackedAnimeItemEpisode[];
}

/** `GET /tracked-anime` — the whole list plus the releasing-not-tracked counts. */
export interface TrackedAnimeListResponse {
	tracked_anime: TrackedAnimeItem[];
	/** On the user's watching list, releasing on AniList, and not tracked. */
	releasing_watching_not_tracked_count: number;
	/** On the user's planning list, releasing on AniList, and not tracked. */
	releasing_planning_not_tracked_count: number;
}

/** `POST /tracked-anime` body. `release_profile` null = use the default. */
export interface TrackedAnimeCreateRequest extends TrackedAnimeSettingsBase {
	anilist_id: number;
	release_profile?: TrackedAnimeReleaseProfileSettingsCreateRequest | null;
}

/** `PUT /tracked-anime/{id}` body. Sending `release_profile: null` resets to default. */
export interface TrackedAnimeUpdateRequest extends TrackedAnimeSettingsBase {
	release_profile: TrackedAnimeReleaseProfileSettings | null;
	/** When true, also unarchive the tracked anime as part of this update. */
	unarchive?: boolean;
}

export interface TrackedAnimeBatchArchiveRequest {
	anilist_ids: number[];
}
export interface TrackedAnimeBatchDeleteRequest {
	anilist_ids: number[];
}

/* --- Tracked-anime episodes ------------------------------------------------- */

/** A single TVDB episode mapped to a tracked anime episode. */
export interface TVDBSeriesEpisode {
	id: number;
	series_id: number;
	title: string | null;
	/** ISO datetime. */
	air_date: string | null;
	runtime: number | null;
	overview: string | null;
	image_url: string | null;
	number: number;
	absolute_number: number;
	season_number: number;
	season_name: string | null;
	finale_type: TVDBFinaleType | null;
}

/** An episode row on the tracked-anime detail page. */
export interface TrackedAnimeItemEpisode {
	episode_number: number;
	tvdb_series_episodes: TVDBSeriesEpisode[];
	/** When an episode maps to a part of a TVDB entry: the part index and total. */
	tvdb_episode_part: number | null;
	tvdb_episode_part_ceiling: number | null;
	auto_discard: boolean;
	download_id: number | null;
	download_status: TorrentDownloadStatus | null;
}

export interface TrackedAnimeItemEpisodeList {
	episodes: TrackedAnimeItemEpisode[];
}

/** Expanded episode detail — adds the torrents (loaded on expand). */
export interface TrackedAnimeItemEpisodeDetails extends TrackedAnimeItemEpisode {
	torrents: TorrentItem[];
}

/** `PUT /tracked-anime/{id}/episodes/{n}` body. */
export interface TrackedAnimeEpisodeUpdateRequest {
	auto_discard: boolean;
}

/* --- Torrents (tracked-anime episode detail) -------------------------------- */

/** A parsed RSS torrent entry. */
export interface RawTorrent {
	title: string;
	description: string;
	web_link: string;
	size: string;
	release_group: string | null;
	anime_title: string | null;
	episode_number: number | null;
	version_number: number | null;
	language_code: string | null;
	repack_indicator: boolean | null;
	resolution: Resolution | null;
	/** Backend `VideoSource` — a display-only superset of `Source` (adds "Other"). */
	source: Source | 'Other' | null;
	encoding: Encoding | null;
}

/** The download record for a torrent (qBit fields present once it reaches the client). */
export interface Download {
	id: number;
	status: TorrentDownloadStatus;
	status_details: string | null;
	download_directory_path: string | null;
	destination_path: string | null;
	/** ISO datetime. */
	copied_to_destination_path_at: string | null;
	qbit_status?: string | null;
	/** 0..1 progress fraction. */
	qbit_progress?: number | null;
	/** Seconds remaining. */
	qbit_eta?: number | null;
}

/** A torrent attached to an episode. Parent/children ids are ignored by the UI. */
export interface TorrentItem {
	parent_id: number;
	children_ids: number[];
	raw_torrent: RawTorrent;
	download: Download | null;
}

/* --- RSS page torrents (`/api/v1/torrents`) ------------------------ */

/** Video source as resolved on a torrent — the display superset of `Source` (adds "Other"). */
export type VideoSource = Source | 'Other';

/** A note attached to a torrent — info or error. */
export interface Note {
	text: string;
	is_error: boolean;
}

/** A release-criteria property the chosen download fell short of. `version` is never surfaced here. */
export type ReleaseCriteriaProperty =
	| 'version'
	| 'release_group'
	| 'resolution'
	| 'source'
	| 'encoding'
	| 'language_code';

/** Parsed RSS-torrent attrs. `explicit_*` = strict (authoritative, builds the download request);
 *  `fuzzy_*` = best-effort (display + Identify autofill). ⚠️ Ignore `missing_required` — recognition
 *  checks the three required fields directly. */
export interface RSSTorrentResolvedAttributes {
	release_group: string | null;
	title: string | null;
	episode_number: number | null;
	version_number: number | null;
	language_code: string | null;
	repack_indicator: boolean | null;
	resolution: Resolution | null;
	source: VideoSource | null;
	encoding: Encoding | null;
	censorship_status: boolean | null;
	is_batch: boolean;
	missing_required: boolean;
}

/** The raw RSS torrent (`rss_torrent` — distinct from tracked's `raw_torrent`). Size in bytes. */
export interface RSSTorrent {
	title: string;
	web_link: string;
	seeders: number;
	leechers: number;
	downloads: number;
	magnet_hash: string;
	category: string;
	size: number;
	description: string;
	/** ISO datetime. */
	created_at: string;
	rss_xml: string;
	/** Strict-parse attrs; null when the strict parse failed (→ unrecognized). */
	explicit_resolved_attributes: RSSTorrentResolvedAttributes | null;
	/** Best-effort attrs; always present on list items (null only on a download response). */
	fuzzy_resolved_attributes: RSSTorrentResolvedAttributes | null;
}

/** One RSS-page row: a torrent + its (optional) download + AniList join + state flags. */
export interface TorrentListItem {
	rss_torrent: RSSTorrent;
	download: Download | null;
	anilist_id: number | null;
	anilist_english_title: string | null;
	anilist_native_title: string | null;
	anilist_romaji_title: string | null;
	parent_id: number | null;
	children_ids: number[];
	tracked_anime_id: number | null;
	/** First episode the tracking covers — non-null whenever `tracked_anime_id` is. Out-of-range
	 *  rows (all episodes below this) tier/grey like untracked but stay selectable. */
	tracked_from_episode: number | null;
	anilist_episode_numbers: number[];
	anilist_episode_part: number | null;
	anilist_episode_part_ceiling: number | null;
	/** Backend's chosen-for-download flag (seeds the user's selection unless already downloaded). */
	selected: boolean;
	superseded: boolean;
	discarded: boolean;
	profile_shortcomings: ReleaseCriteriaProperty[];
	notes: Note[];
}

/** RSS-consumption status — drives the countdown + the auto-refresh signal. */
export interface TorrentPullStatus {
	/** ISO datetime of the last finished pull, or null. */
	last_pull: string | null;
	/** ISO datetime the next pull is due, or null. */
	next_pull: string | null;
	currently_pulling: boolean;
}

export interface TorrentListResponse {
	torrents: TorrentListItem[];
	pull_status: TorrentPullStatus;
}

/** POST `/torrents/search` body — `query` = custom search; `release_groups` = "Check for torrents". */
export interface TorrentSearchRequest {
	release_groups?: string[] | null;
	query?: string | null;
}

export interface TorrentDiscardRequest {
	magnet_hashes: string[];
}

/** Future-matching override: pins this torrent's resolved title to the tracked anime so future
 *  releases from the same group auto-match, with an episode-number offset. Both fields mandatory. */
export interface ReleaseGroupOverrideSettings {
	override_match_against: string;
	episode_number_offset: number;
}

/** POST `/torrents/download` body — built from EXPLICIT attrs only (fuzzy is display-only). */
export interface TorrentDownloadRequest {
	magnet_hash: string;
	tracked_anime_id: number;
	episode_numbers: number[];
	episode_part?: number;
	episode_part_ceiling?: number;
	release_group: string;
	language_code: string | null;
	resolution: Resolution;
	source: VideoSource;
	encoding: Encoding;
	version?: number;
	is_repack?: boolean;
	rss_xml: string;
	discard_future_torrents?: boolean;
	/** Set when the user opts to match future releases by this title; null otherwise. */
	release_group_override_settings?: ReleaseGroupOverrideSettings | null;
}

/** POST `/torrents/{torrent_id}/override` body — force this torrent into downloading, replacing the
 *  episode's existing download/import. Returns only the (possibly pre-existing) download id. */
export interface TorrentOverrideRequest {
	discard_future_torrents?: boolean;
}

export interface TorrentOverrideResponse {
	download_id: number;
}

/** Download response — mirrors a list item's AniList join plus the resulting download. */
export interface TorrentDownloadResponse {
	download: Download | null;
	rss_torrent: RSSTorrent;
	anilist_id: number | null;
	anilist_english_title: string | null;
	anilist_native_title: string | null;
	anilist_romaji_title: string | null;
	parent_id: number | null;
	children_ids: number[];
	tracked_anime_id: number | null;
	tracked_from_episode: number | null;
	anilist_episode_numbers: number[];
	anilist_episode_part: number | null;
	anilist_episode_part_ceiling: number | null;
}

/* --- Downloads (`/api/v1/downloads`) ------------------------------- */

/** A THIRD torrent shape (download record) — distinct from tracked's `RawTorrent` and RSS's
 *  `RSSTorrent`; specs resolved + non-null, `size` a human string ("498.5 MiB"). */
export interface DownloadTorrent {
	/** The torrent's own id — the `{torrent_id}` for `POST /torrents/{id}/override`. */
	id: number;
	web_link: string;
	release_group: string;
	title: string;
	size: string;
	encoding: Encoding;
	resolution: Resolution;
	source: VideoSource;
	language_code: string;
	version_number: number;
	repack_indicator: boolean;
}

/** The AniList/tracked join on a download. `tracked_anime_id` is always present. */
export interface DownloadAnime {
	anilist_id: number;
	tracked_anime_id: number;
	anilist_english_title: string | null;
	anilist_native_title: string | null;
	anilist_romaji_title: string;
}

/** Live qBittorrent state for a download (nested in the list shape). */
export interface QBitStatus {
	status: string;
	/** 0..1 progress fraction. */
	progress: number;
	/** Seconds remaining, or null. */
	eta: number | null;
}

/** One download record (`GET /downloads`, `GET /downloads/{id}`). */
export interface DownloadItem {
	id: number;
	/** ISO datetime the download record was created. */
	created_at: string;
	status: TorrentDownloadStatus;
	/** A newer download for the same episode has replaced this one. */
	superseded: boolean;
	status_details: string | null;
	download_directory_path: string | null;
	source_path: string | null;
	destination_path: string | null;
	/** ISO datetime, or null until imported. */
	copied_to_destination_path_at: string | null;
	anime: DownloadAnime;
	anilist_episode_numbers: number[];
	/** 0 == none (whole episode). */
	anilist_episode_part: number;
	/** 0 == none. */
	anilist_episode_part_ceiling: number;
	torrent: DownloadTorrent;
	qbit_status: QBitStatus | null;
}

export interface DownloadListResponse {
	downloads: DownloadItem[];
}

/** POST `/downloads/{id}/delete` body. `delete_from_disk` only meaningful when `delete_from_qbit`. */
export interface DeleteDownloadRequest {
	delete_from_qbit: boolean;
	delete_from_disk: boolean;
	delete_imported_file: boolean;
	discard_torrent: boolean;
}

/** `POST /downloads/{id}/retry/check` — `superseded` true ⇒ retry replaces a newer download. */
export interface DownloadRetryCheck {
	superseded: boolean;
}

/** One `changed[]` item from `/downloads/updates/stream`. ⚠️ qBit fields are FLATTENED here
 *  (vs nested `qbit_status` in the list shape) — map on apply. */
export interface DownloadStreamItem {
	id: number;
	status: TorrentDownloadStatus;
	status_details: string | null;
	download_directory_path: string | null;
	source_path: string | null;
	destination_path: string | null;
	copied_to_destination_path_at: string | null;
	qbit_status: string;
	qbit_progress: number;
	qbit_eta: number | null;
	/** When true, this download was deleted backend-side entirely → drop it from view. */
	deleted?: boolean;
}

/** Sparse download-updates tick; `changed` lists only updated downloads. (The "new download
 *  appeared" signal lives on the status stream; this one runs only while something's unfinished.) */
export interface DownloadUpdatesTick {
	ref: number;
	changed: DownloadStreamItem[];
}

/* --- Schedule / Calendar ------------------------------------------- */

/** Which feed the calendar pulls from. `user_*` need an AniList link; the rest are discovery feeds. Multi-select. */
export type AiringScheduleScope =
	| 'user_watching'
	| 'user_planning'
	| 'user_tracking'
	| 'current_season'
	| 'next_season'
	| 'all_airing';

/** Ordered for the scope multiselect (Your lists · Discover groupings). */
export const AIRING_SCHEDULE_SCOPES: AiringScheduleScope[] = [
	'user_watching',
	'user_planning',
	'user_tracking',
	'current_season',
	'next_season',
	'all_airing'
];

/** One scheduled episode airing. `title` = the **episode** title (anime comes from the
 *  response's `anime` list via `anilist_id`); `airing_at` = unix seconds, UTC. */
export interface AiringScheduleItem {
	id: number;
	anilist_id: number;
	airing_at: number;
	episode: number;
	title: string | null;
	download_status: TorrentDownloadStatus | null;
}

/** The schedule's own anime-enrichment shape. `status` drives the cover-tile ring; `banner_url`
 *  the card backdrop; `tracked_anime_id != null` = tracked. `tracked_from_episode` = first covered
 *  episode (earlier ones are never flagged Missing). */
export interface ScheduleAnimeItem {
	anilist_id: number;
	romaji_title: string;
	english_title: string;
	native_title: string;
	season: AnilistAnimeSeason | null;
	season_year: number | null;
	status: AnilistAnimeStatus;
	small_cover_image: string | null;
	banner_url: string | null;
	/** Final episode number, when known — drives the first/final episode markers. */
	episodes: number | null;
	format: AnilistAnimeFormat | null;
	popularity: number | null;
	user_list_status: AnilistAnimeUserStatus | null;
	tracked_anime_id: number | null;
	tracked_from_episode: number | null;
}

/** `GET /schedule` — the airings plus the anime referenced by them, for enrichment. */
export interface AiringScheduleListResponse {
	airing_schedule: AiringScheduleItem[];
	anime: ScheduleAnimeItem[];
}

/* --- System stats (`GET /system/stats`) ------------------------------------- */

/** A mounted disk. ⚠️ `name` is the role ("Import destination" / "Download destination"), not the
 *  device. `total`/`used` are bytes (null until first sampled). */
export interface Disk {
	path: string;
	name: string;
	total: number | null;
	used: number | null;
}

/** `GET /system/stats` payload (the openapi ref mislabels the verb as POST). */
export interface SystemStats {
	app_version: string;
	/** ISO datetime the backend process started — count up from here for uptime. */
	up_since: string;
	disk_stats: Disk[];
}

/** Latest upstream release from `/system/app-releases/latest`. An update exists when
 *  `version` is a higher semver than `current_version` (see `cmpVersion`). */
export interface AppReleaseItem {
	/** GitHub release page URL. */
	web_link: string;
	/** The version this backend is running. */
	current_version: string;
	/** The latest published version. */
	version: string;
	/** Release title. */
	name: string;
	/** Release notes (GitHub-flavoured markdown), or null. */
	body: string | null;
	/** ISO datetime the release was published (from GitHub). */
	published_at: string;
}

/* --- Backups (`/system/backups`) -------------------------------------------- */

/** One backup archive. `can_restore` gates the restore action (e.g. a version mismatch may block it). */
export interface BackupItem {
	filename: string;
	/** Absolute path/dir the archive lives in — shown beneath the filename. */
	location: string;
	app_version: string;
	/** Bytes. */
	size: number;
	/** ISO datetime (UTC) the backup was created. */
	created_at: string;
	can_restore: boolean;
}

/** `GET /system/backups` response body. */
export interface BackupListResponse {
	backups: BackupItem[];
}

/* --- Global search (`POST /search`) ----------------------------------------- */

/** One anime hit from `POST /search` (the openapi ref mislabels the verb as GET). */
export interface AnimeResult {
	anilist_id: number;
	english_title: string | null;
	native_title: string | null;
	romaji_title: string;
	format: AnilistAnimeFormat | null;
	season: AnilistAnimeSeason | null;
	season_year: number | null;
	status: AnilistAnimeStatus | null;
	small_cover_image: string | null;
	/** Total episode count when known — prefills the "to episode" of a mapping override. */
	episodes: number | null;
	user_list_status: AnilistAnimeUserStatus | null;
	tracked_anime_id: number | null;
}

/** `POST /search` response body. */
export interface SearchResponse {
	anime: AnimeResult[];
}

/* --- TVDB search + AniList↔TVDB mappings ------------------------------------ */

/** One TVDB series hit from `POST /search/tvdb`. */
export interface TVDBSeriesResult {
	id: number;
	title: string;
	year: number | null;
	image_url: string | null;
	status: string | null;
}

/** `POST /search/tvdb` response body. */
export interface SearchTVDBResponse {
	tvdb_series: TVDBSeriesResult[];
}

/** Mapping-override behavior: fill only when AniBridge is missing a mapping, or always win. */
export type MappingOverrideMode = 'IF_MISSING' | 'ALWAYS';

/** Create/update body for an AniList→TVDB mapping override. `*_to` null = open-ended. */
export interface MappingOverrideRequest {
	anilist_id: number;
	anilist_episode_number_from: number;
	anilist_episode_number_to: number | null;
	tvdb_series_id: number;
	tvdb_season_number: number;
	tvdb_episode_number_from: number;
	tvdb_episode_number_to: number | null;
	/** ≥1 (N AniList eps → 1 TVDB ep) or ≤-2 (1 AniList ep → N TVDB eps); 0/-1 invalid. */
	granularity: number;
	mode: MappingOverrideMode;
}

/** A stored mapping override, enriched with the resolved AniList + TVDB display data. */
export interface MappingOverrideItem extends MappingOverrideRequest {
	id: number;
	anilist_english_title: string | null;
	anilist_native_title: string | null;
	anilist_romaji_title: string;
	anilist_small_cover_image: string | null;
	tvdb_title: string;
	tvdb_image_url: string | null;
}

/** `GET /mapping-overrides` response body. */
export interface MappingOverrideListResponse {
	mapping_overrides: MappingOverrideItem[];
}

/** `GET /mapping-stats` — counts + last-refresh timestamps (UTC ISO). */
export interface MappingStatsResponse {
	anime_relations_count: number;
	anilist_tvdb_mappings_count: number;
	anime_relations_last_updated_at: string;
	anilist_tvdb_mappings_last_updated_at: string;
}

/* --- Errors ----------------------------------------------------------------- */

/** Known backend error codes; permissive (`string`) since the backend may add more. */
export type ApiErrorCode =
	| 'MISSING_AUTH_HEADER'
	| 'MALFORMED_AUTH_HEADER'
	| 'TOKEN_EXPIRED'
	| 'INVALID_TOKEN'
	| 'UNAUTHORIZED'
	| 'ERROR'
	| 'INTERNAL_SERVER_ERROR'
	| 'NOT_FOUND'
	| 'BAD_REQUEST'
	| (string & {});
