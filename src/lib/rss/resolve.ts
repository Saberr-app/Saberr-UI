/* =============================================================================
 * SABERR RSS — DISPLAY RESOLUTION. Resolves the table values, reporting whether each came from
 * FUZZY parsing (amber + tooltip). Precedence explicit → fuzzy. ⚠️ DISPLAY only — the download
 * *request* is built from explicit attrs (download-request.ts); never feed these into a download.
 * ========================================================================== */

import type { RSSTorrentResolvedAttributes, TorrentListItem } from '$lib/api/types';
import { displayTitle } from '$lib/anilist/titles';
import { isRecognized } from './recognition';

export interface Resolved<T> {
	value: T;
	fuzzy: boolean;
}

function pick<T>(explicit: T | null | undefined, fuzzy: T | null | undefined): Resolved<T> | null {
	if (explicit != null) return { value: explicit, fuzzy: false };
	if (fuzzy != null) return { value: fuzzy, fuzzy: true };
	return null;
}

function attrs(item: TorrentListItem): {
	ex: RSSTorrentResolvedAttributes | null;
	fz: RSSTorrentResolvedAttributes | null;
} {
	return {
		ex: item.rss_torrent.explicit_resolved_attributes,
		fz: item.rss_torrent.fuzzy_resolved_attributes
	};
}

/** Join episode numbers as `X` or `X-Y` (min–max). */
export function joinEpisodes(eps: number[]): string {
	if (eps.length === 0) return '';
	const sorted = [...eps].sort((a, b) => a - b);
	const min = sorted[0];
	const max = sorted[sorted.length - 1];
	return min === max ? `${min}` : `${min}-${max}`;
}

/** ` Part A` / ` Part A/B`, or empty when no part. */
export function partSuffix(
	part: number | null | undefined,
	ceiling: number | null | undefined
): string {
	const p = part ?? 0;
	if (!p) return '';
	const c = ceiling ?? 0;
	return c ? ` Part ${p}/${c}` : ` Part ${p}`;
}

/** Title column / menu header. Recognized → AniList title (preferred language); else explicit/fuzzy parsed → raw title. */
export function resolveTitle(item: TorrentListItem): Resolved<string> {
	if (isRecognized(item)) {
		return {
			value: displayTitle({
				english_title: item.anilist_english_title,
				romaji_title: item.anilist_romaji_title,
				native_title: item.anilist_native_title
			}),
			fuzzy: false
		};
	}
	const { ex, fz } = attrs(item);
	return pick(ex?.title, fz?.title) ?? { value: item.rss_torrent.title, fuzzy: false };
}

/** Episode column. Recognized → anilist episode(s) + part; else explicit ep → "Batch" → fuzzy ep → fuzzy "Batch". */
export function resolveEpisode(item: TorrentListItem): Resolved<string> | null {
	if (isRecognized(item)) {
		const eps = joinEpisodes(item.anilist_episode_numbers);
		return {
			value: eps + partSuffix(item.anilist_episode_part, item.anilist_episode_part_ceiling),
			fuzzy: false
		};
	}
	const { ex, fz } = attrs(item);
	if (ex?.episode_number != null) return { value: `${ex.episode_number}`, fuzzy: false };
	if (ex?.is_batch) return { value: 'Batch', fuzzy: false };
	// In the fuzzy fallback, a batch flag takes priority over a parsed episode number.
	if (fz?.is_batch) return { value: 'Batch', fuzzy: true };
	if (fz?.episode_number != null) return { value: `${fz.episode_number}`, fuzzy: true };
	return null;
}

/** Episode + title rolled into one line for menu/detail headers (e.g. "Title · Episode 11"). */
export function headerLine(item: TorrentListItem): string {
	const title = resolveTitle(item).value;
	const ep = resolveEpisode(item);
	if (!ep) return title;
	return `${title} · Episode${ep.value.includes('-') ? 's' : ''} ${ep.value}`;
}

/** The Group column (release group, explicit → fuzzy). */
export function resolveReleaseGroup(item: TorrentListItem): Resolved<string> | null {
	const { ex, fz } = attrs(item);
	return pick(ex?.release_group, fz?.release_group);
}

export interface SpecChip {
	label: string;
	fuzzy: boolean;
}

/** Spec chips: encoding, resolution, source (excl. "Other"), language code. */
export function resolveSpecs(item: TorrentListItem): SpecChip[] {
	const { ex, fz } = attrs(item);
	const chips: SpecChip[] = [];
	const add = (e: string | null | undefined, f: string | null | undefined) => {
		const p = pick(e, f);
		if (p) chips.push({ label: p.value, fuzzy: p.fuzzy });
	};
	add(ex?.encoding, fz?.encoding);
	add(ex?.resolution, fz?.resolution);
	const src = pick(ex?.source, fz?.source);
	if (src && src.value !== 'Other') chips.push({ label: src.value, fuzzy: src.fuzzy });
	add(ex?.language_code, fz?.language_code);
	return chips;
}

/** Bytes → human size (matches the feel of qbit size strings: "498.5 MiB"). */
export function formatBytes(bytes: number): string {
	if (bytes <= 0) return '0 B';
	const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	const v = bytes / Math.pow(1024, i);
	return `${i === 0 ? v : v.toFixed(1)} ${units[i]}`;
}
