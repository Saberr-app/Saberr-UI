/* =============================================================================
 * SABERR AUDIT EXPANDED DETAILS — per-code reading of `data` into labeled rows (+ list chips) and
 * deep-link buttons. Link/id fields + nulls are never shown as rows; only arbitrary maps
 * (updated_fields/changes) are humanized generically.
 * ========================================================================== */

import type { AuditLogItem, TVDBSeasonType } from '$lib/api/types';
import { TVDB_SEASON_TYPE_LABELS } from '$lib/api/types';
import { str, num, asArray, asRecord } from './data';
import { humanizeKey } from './labels';
import { type AuditLink, magnetLink, downloadLink, trackedAnimeLink, browseLink } from './links';
import {
	formatAnilistEntry,
	formatAnilistValue,
	ANILIST_ENTRY_FIELD_LABELS
} from '$lib/anilist/entry';

export interface DetailRow {
	label: string;
	/** A string renders as text; an array renders as chips. */
	value: string | string[];
}

export interface AuditDetails {
	rows: DetailRow[];
	links: AuditLink[];
}

type Dict = Record<string, unknown>;

function pushStr(rows: DetailRow[], label: string, v: unknown) {
	const s = str(v);
	if (s) rows.push({ label, value: s });
}

function pushNum(rows: DetailRow[], label: string, v: unknown) {
	const n = num(v);
	if (n != null) rows.push({ label, value: String(n) });
}

function pushBool(rows: DetailRow[], label: string, v: unknown) {
	if (typeof v === 'boolean') rows.push({ label, value: v ? 'Yes' : 'No' });
}

function numberChips(v: unknown): string[] {
	return asArray(v)
		.map(num)
		.filter((n): n is number => n != null)
		.map((n) => `#${n}`);
}

/** Generic value formatter for the arbitrary updated_fields diff. */
function diffValue(v: unknown): string {
	if (v == null) return '(empty)';
	if (typeof v === 'boolean') return v ? 'Enabled' : 'Disabled';
	if (typeof v === 'object') return JSON.stringify(v);
	return String(v);
}

function settingDisplay(v: unknown): string {
	if (v == null) return '(empty)';
	if (typeof v === 'boolean') return v ? 'Enabled' : 'Disabled';
	if (typeof v === 'object') return JSON.stringify(v);
	return String(v);
}

/** Mapping-override diff value: null → "Not set" (per the override change payload). */
function mappingDiffValue(v: unknown): string {
	if (v == null) return 'Not set';
	if (typeof v === 'boolean') return v ? 'Enabled' : 'Disabled';
	if (typeof v === 'object') return JSON.stringify(v);
	return String(v);
}

/** Shared rows + links for the torrent selection / download / processing family. */
function torrentRows(d: Dict, context: 'torrent' | 'download'): AuditDetails {
	const rows: DetailRow[] = [];
	const links: AuditLink[] = [];

	pushStr(rows, 'Torrent description', d.torrent_description);
	pushStr(rows, 'Destination path', d.destination_path);
	pushStr(rows, 'Download directory', d.download_directory_path);

	const single = num(d.episode_number);
	if (single != null) rows.push({ label: 'Episode number', value: [`#${single}`] });
	else {
		const eps = numberChips(d.episode_numbers);
		if (eps.length) {
			rows.push({ label: eps.length === 1 ? 'Episode number' : 'Episode numbers', value: eps });
		}
	}

	pushNum(rows, 'TVDB season number', d.tvdb_season_number);
	const tvdbEps = numberChips(d.tvdb_episode_numbers);
	if (tvdbEps.length) rows.push({ label: 'TVDB episode numbers', value: tvdbEps });

	pushStr(rows, 'Failure reason', d.failure_reason);

	// Magnet hash links to the RSS feed (torrent context only — no get-download-by-hash). Download by id.
	const hash = str(d.magnet_hash);
	if (hash && context === 'torrent') links.push(magnetLink(hash));
	const downloadId = d.torrent_download_id;
	if (downloadId != null) links.push(downloadLink(String(downloadId)));

	return { rows, links };
}

/** Links shared by tracked-anime logs (tracked link suppressed on removal). */
function trackedLinks(d: Dict, suppressTracked: boolean): AuditLink[] {
	const links: AuditLink[] = [];
	if (!suppressTracked && d.tracked_anime_id != null) {
		links.push(trackedAnimeLink(String(d.tracked_anime_id)));
	}
	if (d.anilist_id != null) links.push(browseLink(String(d.anilist_id)));
	return links;
}

/** Batch AniList logs touch many anime: one deep-link per anime (titled), or a chip row of titles
 *  when no ids. Pairs `anime_ids[i]` with `anime_titles[i]`. */
function batchAnimeLinks(d: Dict): { rows: DetailRow[]; links: AuditLink[] } {
	const ids = asArray(d.anime_ids).map(num);
	const titles = asArray(d.anime_titles).map(str);
	const links: AuditLink[] = [];

	for (let i = 0; i < ids.length; i++) {
		const id = ids[i];
		if (id == null) continue;
		const link = browseLink(String(id));
		links.push({ label: titles[i] ?? `#${id}`, href: link.href });
	}

	// No linkable ids → fall back to a plain chip row of titles.
	const rows: DetailRow[] = [];
	if (!links.length) {
		const names = titles.filter((t): t is string => !!t);
		if (names.length) rows.push({ label: 'Anime', value: names });
	}
	return { rows, links };
}

export function buildAuditDetails(item: AuditLogItem): AuditDetails {
	const d: Dict = item.data ?? {};

	switch (item.code) {
		case 'APP_STARTED': {
			const rows: DetailRow[] = [];
			pushStr(rows, 'App version', d.app_version);
			return { rows, links: [] };
		}

		case 'LOGIN_SUCCEEDED':
		case 'LOGIN_FAILED': {
			const rows: DetailRow[] = [];
			pushStr(rows, 'IP address', d.ip_address);
			pushStr(rows, 'Browser', d.browser);
			pushStr(rows, 'Country', d.country);
			if (item.code === 'LOGIN_FAILED') pushStr(rows, 'Username', d.username);
			return { rows, links: [] };
		}

		case 'SETTING_CHANGED': {
			const rows: DetailRow[] = [];
			rows.push({ label: 'Previous', value: settingDisplay(d.old_value) });
			rows.push({ label: 'New', value: settingDisplay(d.new_value) });
			return { rows, links: [] };
		}

		case 'TORRENT_SELECTED':
		case 'TORRENT_MANUALLY_SELECTED':
		case 'TORRENT_DISCARDED':
			return torrentRows(d, 'torrent');

		case 'TORRENT_DOWNLOAD_STARTED':
		case 'TORRENT_DOWNLOAD_FINISHED':
		case 'TORRENT_DOWNLOAD_FAILED':
		case 'TORRENT_DOWNLOAD_DISCARDED':
		case 'TORRENT_DOWNLOAD_DELETED':
		case 'TORRENT_PROCESSING_STARTED':
		case 'TORRENT_PROCESSING_FINISHED':
		case 'TORRENT_PROCESSING_FAILED':
			return torrentRows(d, 'download');

		case 'TRACKED_ANIME_ADDED':
		case 'TRACKED_ANIME_REMOVED': {
			const rows: DetailRow[] = [];
			if (typeof d.tvdb_structure_enabled === 'boolean') {
				rows.push({ label: 'Structuring', value: d.tvdb_structure_enabled ? 'TVDB' : 'AniList' });
			}
			pushStr(
				rows,
				'TVDB season type',
				TVDB_SEASON_TYPE_LABELS[d.tvdb_season_type as TVDBSeasonType] ?? d.tvdb_season_type
			);
			pushBool(rows, 'Show parent directory', d.show_parent_directory);
			pushStr(rows, 'Show folder name', d.show_folder_name);
			const groups = asArray(d.release_groups)
				.map((g) => str(asRecord(g)?.name))
				.filter((n): n is string => !!n);
			if (groups.length) rows.push({ label: 'Release groups', value: groups });
			return { rows, links: trackedLinks(d, item.code === 'TRACKED_ANIME_REMOVED') };
		}

		case 'TRACKED_ANIME_UPDATED': {
			const rows: DetailRow[] = [];
			const updated = asRecord(d.updated_fields);
			if (updated) {
				for (const [key, change] of Object.entries(updated)) {
					const c = asRecord(change);
					if (!c) continue;
					rows.push({
						label: key,
						value: `${diffValue(c.old)} → ${diffValue(c.new)}`
					});
				}
			}
			return { rows, links: trackedLinks(d, false) };
		}

		case 'TRACKED_ANIME_ARCHIVED':
			return { rows: [], links: trackedLinks(d, false) };

		case 'ANILIST_ANIME_ADDED':
		case 'ANILIST_ANIME_DELETED': {
			const rows = formatAnilistEntry(asRecord(d.user_data));
			const links: AuditLink[] = [];
			if (d.anime_id != null) links.push(browseLink(String(d.anime_id)));
			return { rows, links };
		}

		case 'ANILIST_ANIME_UPDATED': {
			const rows: DetailRow[] = [];
			const changes = asRecord(d.changes);
			if (changes) {
				for (const [key, change] of Object.entries(changes)) {
					const c = asRecord(change);
					if (!c) continue;
					rows.push({
						label: ANILIST_ENTRY_FIELD_LABELS[key] ?? humanizeKey(key),
						value: `${formatAnilistValue(key, c.old)} → ${formatAnilistValue(key, c.new)}`
					});
				}
			}
			const links: AuditLink[] = [];
			if (d.anime_id != null) links.push(browseLink(String(d.anime_id)));
			return { rows, links };
		}

		case 'BATCH_ANILIST_ANIME_ADDED':
		case 'BATCH_ANILIST_ANIME_DELETED': {
			const { rows, links } = batchAnimeLinks(d);
			// ADDED carries the shared list-entry payload applied to every anime.
			if (item.code === 'BATCH_ANILIST_ANIME_ADDED') {
				rows.push(...formatAnilistEntry(asRecord(d.user_data)));
			}
			return { rows, links };
		}

		case 'BATCH_ANILIST_ANIME_UPDATED': {
			const { rows, links } = batchAnimeLinks(d);
			const changes = asRecord(d.changes);
			if (changes) {
				for (const [key, change] of Object.entries(changes)) {
					const c = asRecord(change);
					if (!c) continue;
					rows.push({
						label: ANILIST_ENTRY_FIELD_LABELS[key] ?? humanizeKey(key),
						value: `${formatAnilistValue(key, c.old)} → ${formatAnilistValue(key, c.new)}`
					});
				}
			}
			return { rows, links };
		}

		case 'SERVICE_SET_ONLINE':
		case 'SERVICE_SET_OFFLINE': {
			const rows: DetailRow[] = [];
			pushStr(rows, 'Error level', d.error_level);
			pushStr(rows, 'Error details', d.error_details);
			pushNum(rows, 'Error code', d.error_code);
			return { rows, links: [] };
		}

		case 'MAPPING_OVERRIDE_ADDED':
		case 'MAPPING_OVERRIDE_DELETED': {
			const rows: DetailRow[] = [];
			const af = num(d.anilist_from_episode);
			if (af != null)
				rows.push({
					label: 'AniList episodes',
					value: `${af}-${num(d.anilist_to_episode) ?? '∞'}`
				});
			const tf = num(d.tvdb_from_episode);
			if (tf != null) {
				rows.push({
					label: 'TVDB',
					value: `S${num(d.tvdb_season_number) ?? 0} · E${tf}-${num(d.tvdb_to_episode) ?? '∞'}`
				});
			}
			pushNum(rows, 'Granularity', d.granularity);
			const mode = str(d.mode);
			if (mode) {
				rows.push({
					label: 'Mode',
					value: mode === 'ALWAYS' ? 'Always override' : 'Override if missing'
				});
			}
			const links: AuditLink[] = [];
			if (d.anilist_id != null) links.push(browseLink(String(d.anilist_id)));
			return { rows, links };
		}

		case 'MAPPING_OVERRIDE_UPDATED': {
			const rows: DetailRow[] = [];
			const updated = asRecord(d.updated_fields);
			if (updated) {
				// Keys are already human-readable field names from the backend.
				for (const [label, change] of Object.entries(updated)) {
					const c = asRecord(change);
					if (!c) continue;
					rows.push({ label, value: `${mappingDiffValue(c.old)} → ${mappingDiffValue(c.new)}` });
				}
			}
			const links: AuditLink[] = [];
			if (d.anilist_id != null) links.push(browseLink(String(d.anilist_id)));
			return { rows, links };
		}

		default:
			return { rows: [], links: [] };
	}
}
