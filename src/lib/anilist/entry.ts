/* =============================================================================
 * SABERR ANILIST LIST-ENTRY HELPERS — shared formatting for an AniList media-list entry
 * (status, progress, fuzzy dates). Field names mirror AniList's GraphQL schema (camelCase).
 * ========================================================================== */

import type { IconName } from '$lib/config/icons';
import type { AnilistAnimeUserStatus } from '$lib/api/types';

/** AniList watch-status → our display label. */
export const ANILIST_STATUS_LABELS: Record<string, string> = {
	CURRENT: 'Watching',
	PLANNING: 'Planning',
	COMPLETED: 'Completed',
	DROPPED: 'Dropped',
	PAUSED: 'Paused',
	REPEATING: 'Rewatching'
};

/** AniList watch-status → the nav/tab icon we reuse for it (menus, search results). */
export const ANILIST_STATUS_ICON: Record<AnilistAnimeUserStatus, IconName> = {
	CURRENT: 'watching',
	REPEATING: 'watching',
	PLANNING: 'planned',
	COMPLETED: 'completed',
	PAUSED: 'hold',
	DROPPED: 'dropped'
};

export interface FuzzyDate {
	year: number | null;
	month: number | null;
	day: number | null;
}

const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

/** Render an AniList fuzzy date with whatever parts it has; if only the month is missing (year+day
 *  present), fall back to January. null when nothing is set. */
export function formatFuzzyDate(fd: FuzzyDate | null | undefined): string | null {
	if (!fd) return null;
	let { month } = fd;
	const { year, day } = fd;
	if (year == null && month == null && day == null) return null;
	// "Only month missing" special case.
	if (month == null && year != null && day != null) month = 1;

	const monthName = month != null ? MONTHS[month - 1] : null;
	if (year != null && monthName && day != null) return `${monthName} ${day}, ${year}`;
	if (year != null && monthName) return `${monthName} ${year}`;
	if (monthName && day != null) return `${monthName} ${day}`;
	if (year != null) return String(year);
	if (monthName) return monthName;
	if (day != null) return `Day ${day}`;
	return null;
}

/** Display label per AniList entry field (also used for the audit "changes" diff). */
export const ANILIST_ENTRY_FIELD_LABELS: Record<string, string> = {
	status: 'Status',
	progress: 'Progress',
	score: 'Score',
	repeat: 'Rewatch count',
	private: 'Hide from public list',
	notes: 'Notes',
	startedAt: 'Started',
	completedAt: 'Completed'
};

/** Format a single AniList entry value for a given field (maps status, dates, bools). */
export function formatAnilistValue(key: string, value: unknown): string {
	if (value == null) return '—';
	if (key === 'status' && typeof value === 'string') return ANILIST_STATUS_LABELS[value] ?? value;
	if (key === 'startedAt' || key === 'completedAt') {
		return formatFuzzyDate(value as FuzzyDate) ?? '—';
	}
	if (key === 'private' && typeof value === 'boolean') return value ? 'Yes' : 'No';
	if (typeof value === 'object') return JSON.stringify(value);
	return String(value);
}

export interface EntryRow {
	label: string;
	value: string;
}

function str(v: unknown): string | null {
	return typeof v === 'string' && v.length > 0 ? v : null;
}

/** AniList list-entry payload → ordered {label, value} rows, omitting empty fields (loose audit dict shape). */
export function formatAnilistEntry(entry: Record<string, unknown> | null | undefined): EntryRow[] {
	if (!entry) return [];
	const rows: EntryRow[] = [];

	const status = str(entry.status);
	if (status) rows.push({ label: 'Status', value: ANILIST_STATUS_LABELS[status] ?? status });

	if (typeof entry.progress === 'number') {
		rows.push({ label: 'Progress', value: String(entry.progress) });
	}
	if (typeof entry.score === 'number' && entry.score > 0) {
		rows.push({ label: 'Score', value: String(entry.score) });
	}
	if (typeof entry.repeat === 'number' && entry.repeat > 0) {
		rows.push({ label: 'Rewatch count', value: String(entry.repeat) });
	}
	if (typeof entry.private === 'boolean') {
		rows.push({ label: 'Hide from public list', value: entry.private ? 'Yes' : 'No' });
	}

	const notes = str(entry.notes);
	if (notes) rows.push({ label: 'Notes', value: notes });

	const started = formatFuzzyDate(entry.startedAt as FuzzyDate);
	if (started) rows.push({ label: 'Started', value: started });
	const completed = formatFuzzyDate(entry.completedAt as FuzzyDate);
	if (completed) rows.push({ label: 'Completed', value: completed });

	return rows;
}
