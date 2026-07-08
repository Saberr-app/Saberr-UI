/* =============================================================================
 * SABERR AUDIT COLLAPSED TEXT — builds the row's summary sentence from `data`. If any needed field
 * is MISSING, bail and use the backend's own `text` — never a half-built sentence.
 * ========================================================================== */

import type { AuditLogItem } from '$lib/api/types';
import { animeTitleFrom, asArray, episodeDescriptor, num, str } from './data';

/** How many anime a batch AniList log touched (anime_ids, falling back to titles). */
function batchCount(d: Record<string, unknown>): number | null {
	const ids = asArray(d.anime_ids).filter((v) => v != null).length;
	if (ids) return ids;
	const titles = asArray(d.anime_titles).filter((v) => str(v)).length;
	return titles || null;
}

/** Inline-markup helpers (via `InlineMarkup`): `b()` bolds the subject, `it()` italicizes values. */
const b = (s: string) => `**${s}**`;
const it = (s: string) => `*${s}*`;

/** Format an arbitrary setting value for the SETTING_CHANGED sentence. */
function settingValue(v: unknown): string | null {
	if (v == null) return null; // missing/null → "cleared"/"set" wording handled by caller
	if (typeof v === 'boolean') return v ? 'enabled' : 'disabled';
	if (typeof v === 'object') return JSON.stringify(v);
	return String(v);
}

/** The mapping-override subject: AniList title → `#id` → TVDB title → `TVDB #id`; null if none. */
function mappingSubject(d: Record<string, unknown>): string | null {
	const at = str(d.anilist_title);
	if (at) return at;
	const aid = num(d.anilist_id);
	if (aid != null) return `#${aid}`;
	const tt = str(d.tvdb_series_title);
	if (tt) return tt;
	const tid = num(d.tvdb_series_id);
	return tid != null ? `TVDB #${tid}` : null;
}

/** ` (Ep 1-28)` / ` (Ep 1-∞)` from the AniList episode range; empty string if no `from`. */
function anilistEpRange(d: Record<string, unknown>): string {
	const from = num(d.anilist_from_episode);
	if (from == null) return '';
	const to = num(d.anilist_to_episode);
	return ` (Ep ${from}-${to ?? '∞'})`;
}

/** Suffix ` for {anime} — {episodes}` (episodes optional); null if no anime. */
function forAnimeEpisode(data: Record<string, unknown>): string | null {
	const anime = animeTitleFrom(data);
	if (!anime) return null;
	const ep = episodeDescriptor(data);
	return ep ? `for ${anime} — ${ep}` : `for ${anime}`;
}

/** Returns the built sentence, or null to signal "use the backend text instead". */
function build(item: AuditLogItem): string | null {
	const d = item.data ?? {};

	switch (item.code) {
		case 'APP_STARTED': {
			const v = str(d.app_version);
			return v ? `Saberr started` : 'Saberr started';
		}
		case 'APP_EXITED':
			return 'Saberr shutdown';

		case 'LOGIN_SUCCEEDED':
			return 'Login succeeded';
		case 'LOGIN_FAILED': {
			const user = str(d.username);
			return user ? `Login failed for ${user}` : 'Login failed';
		}

		case 'SETTING_CHANGED': {
			if (!('setting_name' in d)) return null;
			const rawName = String(d.setting_name);
			const oldV = settingValue(d.old_value);
			const newV = settingValue(d.new_value);

			// Linking an AniList account reads as a connection: set → "Connected as {name}"; clear → "Disconnected".
			if (rawName.toLowerCase() === 'anilist username') {
				return newV === null ? 'Disconnected from AniList' : `Connected to AniList as ${b(newV)}`;
			}

			const name = b(rawName);
			if (newV === null) return `Cleared ${name}`;
			if (oldV === null) return `Set ${name} to ${it(newV)}`;
			return `Changed ${name} from ${it(oldV)} to ${it(newV)}`;
		}

		case 'TORRENT_SELECTED':
		case 'TORRENT_MANUALLY_SELECTED': {
			const title = str(d.torrent_title);
			const tail = forAnimeEpisode(d);
			if (!title || !tail) return null;
			const verb = item.code === 'TORRENT_MANUALLY_SELECTED' ? 'Manually selected' : 'Selected';
			return `${verb} torrent “${b(title)}” ${tail}`;
		}
		case 'TORRENT_DISCARDED': {
			const title = str(d.torrent_title);
			const tail = forAnimeEpisode(d);
			if (!title || !tail) return null;
			return `Discarded torrent “${b(title)}” ${tail}`;
		}

		case 'TORRENT_DOWNLOAD_STARTED':
		case 'TORRENT_DOWNLOAD_FINISHED':
		case 'TORRENT_DOWNLOAD_FAILED':
		case 'TORRENT_DOWNLOAD_DISCARDED':
		case 'TORRENT_DOWNLOAD_DELETED':
		case 'TORRENT_PROCESSING_STARTED':
		case 'TORRENT_PROCESSING_FINISHED':
		case 'TORRENT_PROCESSING_FAILED': {
			const title = str(d.torrent_title);
			const tail = forAnimeEpisode(d);
			if (!title || !tail) return null;
			const verbs: Record<string, string> = {
				TORRENT_DOWNLOAD_STARTED: 'Started downloading',
				TORRENT_DOWNLOAD_FINISHED: 'Finished downloading',
				TORRENT_DOWNLOAD_FAILED: 'Failed to download',
				TORRENT_DOWNLOAD_DISCARDED: 'Discarded download of',
				TORRENT_DOWNLOAD_DELETED: 'Download removed on qBittorrent for',
				TORRENT_PROCESSING_STARTED: 'Started importing',
				TORRENT_PROCESSING_FINISHED: 'Finished importing',
				TORRENT_PROCESSING_FAILED: 'Failed to import'
			};
			const reason = str(d.failure_reason);
			const base = `${verbs[item.code]} “${b(title)}” ${tail}`;
			return reason ? `${base}: ${reason}` : base;
		}

		case 'TRACKED_ANIME_ADDED': {
			const anime = animeTitleFrom(d);
			return anime ? `Added tracked anime ${b(anime)}` : null;
		}
		case 'TRACKED_ANIME_REMOVED': {
			const anime = animeTitleFrom(d);
			return anime ? `Removed tracked anime ${b(anime)}` : null;
		}
		case 'TRACKED_ANIME_UPDATED': {
			const anime = animeTitleFrom(d);
			if (!anime) return null;
			return 'updated_fields' in d
				? `Updated settings for tracked anime ${b(anime)}`
				: `Archived tracked anime ${b(anime)}`;
		}
		case 'TRACKED_ANIME_ARCHIVED': {
			const anime = animeTitleFrom(d);
			return anime ? `Archived tracked anime ${b(anime)}` : null;
		}

		case 'ANILIST_ANIME_ADDED': {
			const anime = str(d.anime_title);
			return anime ? `Added ${b(anime)} to your AniList list` : null;
		}
		case 'ANILIST_ANIME_DELETED': {
			const anime = str(d.anime_title);
			return anime ? `Removed ${b(anime)} from your AniList list` : null;
		}
		case 'ANILIST_ANIME_UPDATED': {
			const anime = str(d.anime_title);
			return anime ? `Updated AniList entry for ${b(anime)}` : null;
		}

		case 'BATCH_ANILIST_ANIME_ADDED': {
			const n = batchCount(d);
			return n ? `Added ${b(`${n} anime`)} to your AniList list` : null;
		}
		case 'BATCH_ANILIST_ANIME_DELETED': {
			const n = batchCount(d);
			return n ? `Removed ${b(`${n} anime`)} from your AniList list` : null;
		}
		case 'BATCH_ANILIST_ANIME_UPDATED': {
			const n = batchCount(d);
			return n ? `Updated ${b(`${n} AniList ${n === 1 ? 'entry' : 'entries'}`)}` : null;
		}

		case 'ANILIST_LIST_REFRESHED':
			return 'Refreshed your AniList anime list';

		case 'SERVICE_SET_ONLINE': {
			const name = str(d.name);
			return name ? `Service ${b(name)} came online` : null;
		}
		case 'SERVICE_SET_OFFLINE': {
			const name = str(d.name);
			return name ? `Service ${b(name)} went offline` : null;
		}

		case 'ANIME_RELATIONS_REFRESHED':
			return 'Refreshed anime relations data';

		case 'MAPPING_OVERRIDE_ADDED': {
			const subject = mappingSubject(d);
			return subject ? `Added mapping override for ${b(subject)}${anilistEpRange(d)}` : null;
		}
		case 'MAPPING_OVERRIDE_DELETED': {
			const subject = mappingSubject(d);
			return subject ? `Deleted mapping override for ${b(subject)}${anilistEpRange(d)}` : null;
		}
		case 'MAPPING_OVERRIDE_UPDATED': {
			const subject = mappingSubject(d);
			return subject ? `Updated mapping override for ${b(subject)}` : null;
		}

		default:
			return null;
	}
}

/** Public: the row's display text, always non-empty (falls back to `item.text`). */
export function buildAuditText(item: AuditLogItem): string {
	return build(item) ?? item.text;
}
