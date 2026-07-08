/* =============================================================================
 * SABERR RSS — PER-ROW ACTION AVAILABILITY — which context-menu actions a torrent supports.
 * Download + Discard need a tracked anime; Track is offered for recognized-but-untracked rows.
 * ========================================================================== */

import type { TorrentListItem } from '$lib/api/types';
import { isRecognized, isTracked } from './recognition';

export interface TorrentActions {
	goToDownload: boolean;
	download: boolean;
	/** Superseded torrent that already has a download → re-download via the override API. */
	revert: boolean;
	discard: boolean;
	identify: boolean;
	track: boolean;
	editTracking: boolean;
	episodeDetails: boolean;
	goToTracked: boolean;
	goToAnime: boolean;
}

export function torrentActions(item: TorrentListItem): TorrentActions {
	const recognized = isRecognized(item);
	const tracked = isTracked(item);
	const hasDownload = item.download != null;
	return {
		goToDownload: hasDownload,
		download: recognized && tracked && !hasDownload,
		revert: hasDownload && item.superseded,
		// Can't discard something already imported.
		discard: recognized && tracked && item.download?.status !== 'PROCESSED',
		identify: !recognized,
		track: recognized && !tracked,
		editTracking: tracked,
		episodeDetails: recognized && tracked,
		goToTracked: tracked,
		goToAnime: recognized
	};
}
