/* =============================================================================
 * SABERR CALENDAR — DOWNLOAD COVERAGE. A schedule item's `download_status` collapses to four
 * coverage states (matching `EpisodeProgress`). Only TRACKED anime get an icon. `null` → Missing
 * but only >3h past air; `FAILED_*` → Failed; `PROCESSED` → Imported; in-flight → Downloading;
 * `DELETED`/`DISCARDED` → Missing. Episodes before `tracked_from_episode` are never flagged Missing.
 * ========================================================================== */

import type { TorrentDownloadStatus } from '$lib/api/types';
import type { IconName } from '$lib/config/icons';

export type CoverageKind = 'imported' | 'downloading' | 'failed' | 'missing';

export interface Coverage {
	kind: CoverageKind;
	label: string;
	icon: IconName;
	/** Text color utility (mirrors EpisodeProgress chip colors). */
	textClass: string;
}

const COVERAGE: Record<CoverageKind, Coverage> = {
	imported: {
		kind: 'imported',
		label: 'Imported',
		icon: 'circle-check',
		textClass: 'text-success'
	},
	downloading: {
		kind: 'downloading',
		label: 'Downloading',
		icon: 'circle-download',
		textClass: 'text-info'
	},
	failed: { kind: 'failed', label: 'Failed', icon: 'circle-x', textClass: 'text-destructive' },
	missing: { kind: 'missing', label: 'Missing', icon: 'circle-help', textClass: 'text-missing' }
};

/** Coverage states in legend order (Imported → Downloading → Failed → Missing). */
export const COVERAGE_LEGEND: Coverage[] = [
	COVERAGE.imported,
	COVERAGE.downloading,
	COVERAGE.failed,
	COVERAGE.missing
];

/** Seconds after air time before a still-undownloaded episode reads as Missing. */
const MISSING_GRACE_SECONDS = 3 * 60 * 60;

/** Coverage badge for a schedule item, or null for no icon. `airingAt` unix s (UTC); a Missing
 *  verdict is suppressed for episodes before tracking began (`trackedFromEpisode`). */
export function coverageFor(
	status: TorrentDownloadStatus | null,
	airingAt: number,
	isTracked: boolean,
	episode: number,
	trackedFromEpisode: number | null,
	now: number = Date.now()
): Coverage | null {
	if (!isTracked) return null;

	const coverage = resolveCoverage(status, airingAt, now);

	// Episodes before tracking started were never expected on disk.
	if (coverage?.kind === 'missing' && trackedFromEpisode != null && episode < trackedFromEpisode) {
		return null;
	}

	return coverage;
}

function resolveCoverage(
	status: TorrentDownloadStatus | null,
	airingAt: number,
	now: number
): Coverage | null {
	if (status == null) {
		const agedOut = now / 1000 - airingAt > MISSING_GRACE_SECONDS;
		return agedOut ? COVERAGE.missing : null;
	}

	switch (status) {
		case 'PROCESSED':
			return COVERAGE.imported;
		case 'FAILED_DOWNLOAD_INIT':
		case 'FAILED_DOWNLOAD':
		case 'FAILED_PROCESSING':
			return COVERAGE.failed;
		case 'DELETED':
		case 'DISCARDED':
			return COVERAGE.missing;
		default:
			// PENDING | DOWNLOADING | DOWNLOADED | PROCESSING
			return COVERAGE.downloading;
	}
}
