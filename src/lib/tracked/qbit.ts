/* =============================================================================
 * SABERR qBITTORRENT STATUS DISPLAY — maps a raw `qbit_status` state to a human `qbitLabel` +
 * a `qbitTone` via four categories: active→blue, pending→amber, errored→red, offline→grey.
 * The lifecycle status (`TorrentDownloadStatus`, status.ts) stays the primary chip; this is the
 * live torrent-client indicator beside it.
 * ========================================================================== */

import type { StatusTone } from './status';
import { formatDuration } from '$lib/utils/time';

/** Human labels for the raw qBittorrent states. */
const QBIT_LABELS: Record<string, string> = {
	error: 'Error',
	missingFiles: 'Missing Files',
	uploading: 'Seeding',
	pausedUP: 'Done',
	queuedUP: 'Queued (UP)',
	stalledUP: 'Seeding',
	checkingUP: 'Checking Disk Files',
	forcedUP: 'Seeding [F]',
	allocating: 'Stalled',
	downloading: 'Downloading',
	metaDL: 'Metadata',
	forcedMetaDL: 'Metadata [F]',
	pausedDL: 'Paused',
	stoppedDL: 'Stopped',
	queuedDL: 'Queued (DL)',
	stalledDL: 'Stalled',
	checkingDL: 'Checking Disk Files',
	forcedDL: 'Downloading [F]',
	checkingResumeData: 'Checking Resume Data',
	moving: 'Moving',
	unknown: 'Unknown'
};

/** Waiting-but-not-progressing states -> amber. */
const PENDING_STATES = new Set(['queuedDL', 'allocating', 'pausedDL', 'stalledDL', 'stoppedDL']);
/** Actively working (down/up/check/move) -> blue. */
const ACTIVE_STATES = new Set([
	'uploading',
	'checkingUP',
	'forcedUP',
	'downloading',
	'metaDL',
	'forcedMetaDL',
	'checkingDL',
	'forcedDL',
	'checkingResumeData',
	'moving'
]);
/** Error / indeterminate states -> red. */
const ERRORED_STATES = new Set(['error', 'missingFiles', 'unknown']);
/** Post-download (done/seeding) states -> grey; also the fallback for anything unlisted. */

export interface QbitDisplay {
	label: string;
	tone: StatusTone;
}

/** Human label for a raw qBit state (capitalized fallback for anything unlisted). */
export function qbitLabel(state: string): string {
	return QBIT_LABELS[state] ?? state.charAt(0).toUpperCase() + state.slice(1);
}

/** Colour tone for a raw qBit state (category → status tone). */
export function qbitTone(state: string): StatusTone {
	if (ERRORED_STATES.has(state)) return 'error';
	if (ACTIVE_STATES.has(state)) return 'progress';
	if (PENDING_STATES.has(state)) return 'pending';
	return 'neutral'; // offline (pausedUP/stalledUP/queuedUP) + any unlisted state
}

/** Label + tone for a raw qBit state. */
export function qbitDisplay(state: string): QbitDisplay {
	return { label: qbitLabel(state), tone: qbitTone(state) };
}

/** qBittorrent's "unknown ETA" sentinel (~100 days). */
const QBIT_ETA_UNKNOWN = 8640000;

/** Format a qbit ETA (seconds). The 100-day sentinel / negatives render as "". */
export function formatEta(seconds: number | null | undefined): string {
	if (seconds == null || seconds < 0 || seconds >= QBIT_ETA_UNKNOWN) return '';
	return formatDuration(seconds);
}

/** A 0..1 progress fraction as a whole-percent string, e.g. "73%". */
export function formatProgress(progress: number | null | undefined): string {
	if (progress == null) return '';
	return `${Math.round(progress * 100)}%`;
}
