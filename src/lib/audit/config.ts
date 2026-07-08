/* =============================================================================
 * SABERR AUDIT VISUAL CONFIG — per-category color accent + glyph, and per-event outcome sentiment.
 * Drive the table's color coding (category chip / row edge / tint + the green/red/neutral dot) so the
 * log scans by meaning. ⚠️ Static class strings for Tailwind.
 * ========================================================================== */

import type { IconName } from '$lib/config/icons';
import type { AuditLogCategory, AuditLogCode } from '$lib/api/types';
import { sentenceCaseEnum } from './labels';

/** Display-name overrides for specific events; everything else is sentence-cased. */
const EVENT_LABEL_OVERRIDES: Partial<Record<AuditLogCode, string>> = {
	SERVICE_SET_ONLINE: 'Service came online',
	SERVICE_SET_OFFLINE: 'Service went offline',
	APP_EXITED: 'App shutdown',
	ANILIST_ANIME_ADDED: 'Anime entry added',
	ANILIST_ANIME_UPDATED: 'Anime entry updated',
	ANILIST_ANIME_DELETED: 'Anime entry deleted',
	BATCH_ANILIST_ANIME_ADDED: 'Anime entries added',
	BATCH_ANILIST_ANIME_UPDATED: 'Anime entries updated',
	BATCH_ANILIST_ANIME_DELETED: 'Anime entries deleted',
	ANILIST_LIST_REFRESHED: 'User list refreshed'
};

/** User-facing event name (table + filter), sentence case with a few overrides. */
export function eventLabel(code: AuditLogCode): string {
	return EVENT_LABEL_OVERRIDES[code] ?? sentenceCaseEnum(code);
}

export interface CategoryStyle {
	/** Filled category chip (tinted bg + accent text). */
	chip: string;
	/** Solid left edge bar on the row. */
	bar: string;
	/** Faint tint behind the expanded panel. */
	tint: string;
}

/** One distinct hue per category. Static class strings so Tailwind keeps them. */
export const CATEGORY_STYLE: Record<AuditLogCategory, CategoryStyle> = {
	APP: {
		chip: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
		bar: 'bg-indigo-500',
		tint: 'bg-indigo-500/5'
	},
	TORRENT_SELECTION: {
		chip: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
		bar: 'bg-violet-500',
		tint: 'bg-violet-500/5'
	},
	TORRENT_PROCESSING: {
		chip: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
		bar: 'bg-cyan-500',
		tint: 'bg-cyan-500/5'
	},
	TRACKED_ANIME: {
		chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
		bar: 'bg-amber-500',
		tint: 'bg-amber-500/5'
	},
	ANILIST: {
		chip: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
		bar: 'bg-sky-500',
		tint: 'bg-sky-500/5'
	},
	MAPPING_OVERRIDES: {
		chip: 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
		bar: 'bg-teal-500',
		tint: 'bg-teal-500/5'
	},
	EXTERNAL_SERVICE: {
		chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
		bar: 'bg-emerald-500',
		tint: 'bg-emerald-500/5'
	},
	OTHER: {
		chip: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
		bar: 'bg-slate-400 dark:bg-slate-500',
		tint: 'bg-slate-500/5'
	}
};

/** Glyph per category (shown in the category chip). */
export const CATEGORY_ICON: Record<AuditLogCategory, IconName> = {
	APP: 'system',
	TORRENT_SELECTION: 'torrents',
	TORRENT_PROCESSING: 'processing',
	TRACKED_ANIME: 'tracked',
	ANILIST: 'anilist',
	MAPPING_OVERRIDES: 'mappings',
	EXTERNAL_SERVICE: 'globe',
	OTHER: 'file'
};

export type Sentiment = 'positive' | 'negative' | 'neutral';

const NEGATIVE: ReadonlySet<AuditLogCode> = new Set([
	'APP_EXITED',
	'LOGIN_FAILED',
	'TORRENT_DISCARDED',
	'TORRENT_DOWNLOAD_FAILED',
	'TORRENT_DOWNLOAD_DISCARDED',
	'TORRENT_DOWNLOAD_DELETED',
	'TORRENT_PROCESSING_FAILED',
	'TRACKED_ANIME_REMOVED',
	'ANILIST_ANIME_DELETED',
	'BATCH_ANILIST_ANIME_DELETED',
	'MAPPING_OVERRIDE_DELETED',
	'SERVICE_SET_OFFLINE'
]);

const POSITIVE: ReadonlySet<AuditLogCode> = new Set([
	'APP_STARTED',
	'LOGIN_SUCCEEDED',
	'TORRENT_SELECTED',
	'TORRENT_MANUALLY_SELECTED',
	'TORRENT_DOWNLOAD_FINISHED',
	'TORRENT_PROCESSING_FINISHED',
	'TRACKED_ANIME_ADDED',
	'ANILIST_ANIME_ADDED',
	'BATCH_ANILIST_ANIME_ADDED',
	'MAPPING_OVERRIDE_ADDED',
	'SERVICE_SET_ONLINE'
]);

/** Outcome tone of an event — drives the small colored dot next to the Event. */
export function sentimentOf(code: AuditLogCode): Sentiment {
	if (NEGATIVE.has(code)) return 'negative';
	if (POSITIVE.has(code)) return 'positive';
	return 'neutral';
}

/** Dot color per sentiment. */
export const SENTIMENT_DOT: Record<Sentiment, string> = {
	positive: 'bg-emerald-500',
	negative: 'bg-rose-500',
	neutral: 'bg-muted-foreground/40'
};
