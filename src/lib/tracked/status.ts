/* =============================================================================
 * SABERR TRACKED DOWNLOAD STATUS — the lifecycle status (`TorrentDownloadStatus`) is the source
 * of truth (a failed download reads "failed", never qbit's "completed"). Tone drives the colored
 * edge/chip/dot (static class strings for Tailwind).
 * ========================================================================== */

import type { TorrentDownloadStatus, TorrentItem } from '$lib/api/types';
import { TORRENT_DOWNLOAD_STATUS_LABELS } from '$lib/api/types';

export type StatusTone = 'success' | 'error' | 'progress' | 'pending' | 'neutral';

export function statusTone(status: TorrentDownloadStatus | null | undefined): StatusTone {
	switch (status) {
		case 'PROCESSED':
			return 'success';
		case 'DOWNLOADING':
		case 'PROCESSING':
		case 'DOWNLOADED':
			return 'progress';
		case 'PENDING':
			return 'pending';
		case 'FAILED_DOWNLOAD_INIT':
		case 'FAILED_DOWNLOAD':
		case 'FAILED_PROCESSING':
			return 'error';
		default:
			return 'neutral';
	}
}

export const TONE_EDGE: Record<StatusTone, string> = {
	success: 'bg-success',
	error: 'bg-destructive',
	progress: 'bg-info',
	pending: 'bg-warning',
	neutral: 'bg-muted-foreground/40'
};

export const TONE_CHIP: Record<StatusTone, string> = {
	success: 'border-success/30 bg-success/10 text-success',
	error: 'border-destructive/30 bg-destructive/10 text-destructive',
	progress: 'border-info/30 bg-info/10 text-info',
	pending: 'border-warning/30 bg-warning/10 text-warning',
	neutral: 'border-border bg-muted text-muted-foreground'
};

export const TONE_DOT: Record<StatusTone, string> = {
	success: 'bg-success',
	error: 'bg-destructive',
	progress: 'bg-info',
	pending: 'bg-warning',
	neutral: 'bg-muted-foreground/50'
};

export const TONE_TINT: Record<StatusTone, string> = {
	success: 'bg-success/5',
	error: 'bg-destructive/5',
	progress: 'bg-info/5',
	pending: 'bg-warning/5',
	neutral: 'bg-muted/30'
};

/** Upgrade-specific labels for when a newer release supersedes an already-imported one. */
function upgradeLabel(status: TorrentDownloadStatus): string {
	switch (status) {
		case 'DOWNLOADING':
			return 'Downloading upgrade';
		case 'DOWNLOADED':
			return 'Upgrade downloaded';
		case 'PROCESSING':
			return 'Importing upgrade';
		case 'FAILED_DOWNLOAD':
		case 'FAILED_DOWNLOAD_INIT':
			return 'Upgrade download failed';
		case 'FAILED_PROCESSING':
			return 'Upgrade import failed';
		default:
			return TORRENT_DOWNLOAD_STATUS_LABELS[status];
	}
}

/** The episode card's outer status: an imported release + a different non-imported latest = an
 *  upgrade in flight (upgrade wording + warning accent). Else the latest/known status; null torrents → fallback. */
export function episodeOuterStatus(
	downloadId: number | null,
	fallback: TorrentDownloadStatus | null,
	torrents: TorrentItem[] | null
): { label: string | null; tone: StatusTone } {
	if (!torrents) {
		return {
			label: fallback ? TORRENT_DOWNLOAD_STATUS_LABELS[fallback] : null,
			tone: statusTone(fallback)
		};
	}
	const latest = torrents.find((t) => t.download?.id === downloadId) ?? null;
	const latestStatus = latest?.download?.status ?? fallback;
	const hasImported = torrents.some(
		(t) => t.download?.status === 'PROCESSED' && t.download.id !== downloadId
	);
	if (hasImported && latestStatus && latestStatus !== 'PROCESSED') {
		return { label: upgradeLabel(latestStatus), tone: 'pending' };
	}
	return {
		label: latestStatus ? TORRENT_DOWNLOAD_STATUS_LABELS[latestStatus] : null,
		tone: statusTone(latestStatus)
	};
}
