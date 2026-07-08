/* =============================================================================
 * SABERR RSS — DOWNLOAD REQUEST BUILDERS. The download endpoint takes one torrent + the full
 * attribute set. `buildDownloadRequest` (recognized + tracked) uses EXPLICIT attrs only (source→
 * "Other", language→null when absent). `buildIdentifyRequest` (Identify on an unrecognized torrent)
 * takes the user's tracked anime + episode(s)/part; autofill is explicit → fuzzy.
 * ========================================================================== */

import type { TorrentDownloadRequest, TorrentListItem } from '$lib/api/types';
import { blankToNull } from '$lib/utils/form';

export interface DownloadOptions {
	discardFuture?: boolean;
}

/** Build a download request for a recognized+tracked torrent (explicit attrs only). */
export function buildDownloadRequest(
	item: TorrentListItem,
	opts: DownloadOptions = {}
): TorrentDownloadRequest {
	const ex = item.rss_torrent.explicit_resolved_attributes;
	if (ex == null || ex.encoding == null || ex.resolution == null || ex.release_group == null) {
		throw new Error('buildDownloadRequest called on a non-recognized torrent');
	}
	return {
		magnet_hash: item.rss_torrent.magnet_hash,
		tracked_anime_id: item.tracked_anime_id as number,
		episode_numbers: [...item.anilist_episode_numbers],
		episode_part: item.anilist_episode_part ?? 0,
		episode_part_ceiling: item.anilist_episode_part_ceiling ?? 0,
		release_group: ex.release_group,
		language_code: blankToNull(ex.language_code),
		resolution: ex.resolution,
		source: ex.source ?? 'Other',
		encoding: ex.encoding,
		version: ex.version_number ?? 1,
		is_repack: ex.repack_indicator ?? false,
		rss_xml: item.rss_torrent.rss_xml,
		discard_future_torrents: opts.discardFuture ?? false
	};
}

export interface IdentifyInput {
	trackedAnimeId: number;
	episodeNumbers: number[];
	part?: number;
	ceiling?: number;
	discardFuture?: boolean;
}

/** Build a download request from the Identify dialog. Autofill explicit → fuzzy; required fields
 *  (resolution/encoding/group) come from whichever parse has them (dialog blocks submit if none). */
export function buildIdentifyRequest(
	item: TorrentListItem,
	input: IdentifyInput
): TorrentDownloadRequest {
	const ex = item.rss_torrent.explicit_resolved_attributes;
	const fz = item.rss_torrent.fuzzy_resolved_attributes;
	const explicitThenFuzzy = <T>(a: T | null | undefined, b: T | null | undefined): T | null =>
		a != null ? a : (b ?? null);

	const release_group = explicitThenFuzzy(ex?.release_group, fz?.release_group);
	const resolution = explicitThenFuzzy(ex?.resolution, fz?.resolution);
	const encoding = explicitThenFuzzy(ex?.encoding, fz?.encoding);
	if (release_group == null || resolution == null || encoding == null) {
		throw new Error(
			'buildIdentifyRequest: missing required attributes (resolution/encoding/group)'
		);
	}

	return {
		magnet_hash: item.rss_torrent.magnet_hash,
		tracked_anime_id: input.trackedAnimeId,
		episode_numbers: input.episodeNumbers,
		episode_part: input.part ?? 0,
		episode_part_ceiling: input.ceiling ?? 0,
		release_group,
		language_code: blankToNull(explicitThenFuzzy(ex?.language_code, fz?.language_code)),
		resolution,
		source: explicitThenFuzzy(ex?.source, fz?.source) ?? 'Other',
		encoding,
		version: explicitThenFuzzy(ex?.version_number, fz?.version_number) ?? 1,
		is_repack: explicitThenFuzzy(ex?.repack_indicator, fz?.repack_indicator) ?? false,
		rss_xml: item.rss_torrent.rss_xml,
		discard_future_torrents: input.discardFuture ?? false
	};
}

/** Whether the Identify flow has enough parsed attrs to build a valid request. */
export function canIdentify(item: TorrentListItem): boolean {
	const ex = item.rss_torrent.explicit_resolved_attributes;
	const fz = item.rss_torrent.fuzzy_resolved_attributes;
	const has = (k: 'release_group' | 'resolution' | 'encoding') => (ex?.[k] ?? fz?.[k]) != null;
	return has('release_group') && has('resolution') && has('encoding');
}
