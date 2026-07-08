/* =============================================================================
 * SABERR RSS MENU CONTROLLER (runes) — open/close state for the dialogs a row menu summons:
 * Identify, Episode details, and Track/Edit (shared TrackDialog). Track/Edit fetch a fuller
 * payload: Track → getAnime → summary; Edit → getTrackedAnime → item.
 * ========================================================================== */

import type { TorrentListItem, TrackedAnimeItem } from '$lib/api/types';
import { getAnime } from '$lib/api/anime';
import { getTrackedAnime } from '$lib/api/tracked';
import { rowFromAnime } from '$lib/anilist/row';
import { summaryFromRow, type TrackAnimeSummary } from '$lib/tracked/draft';
import { notifyError } from '$lib/api/notify';

class RssMenu {
	identifyItem = $state<TorrentListItem | null>(null);
	episodeItem = $state<TorrentListItem | null>(null);

	/* TrackDialog (shared create/edit). */
	trackOpen = $state(false);
	trackSummary = $state<TrackAnimeSummary | null>(null);
	trackItem = $state<TrackedAnimeItem | null>(null);
	trackBusy = $state(false);

	openIdentify(item: TorrentListItem): void {
		this.identifyItem = item;
	}
	closeIdentify(): void {
		this.identifyItem = null;
	}

	openEpisode(item: TorrentListItem): void {
		this.episodeItem = item;
	}
	closeEpisode(): void {
		this.episodeItem = null;
	}

	/** Track an untracked-but-recognized torrent (fetch the anime to build a summary). */
	async openTrack(item: TorrentListItem): Promise<void> {
		if (item.anilist_id == null || this.trackBusy) return;
		this.trackBusy = true;
		try {
			const anime = await getAnime(item.anilist_id);
			this.trackSummary = summaryFromRow(rowFromAnime(anime));
			this.trackItem = null;
			this.trackOpen = true;
		} catch {
			notifyError('Could not load anime to track');
		} finally {
			this.trackBusy = false;
		}
	}

	/** Edit an existing tracked anime (fetch its full settings). */
	async openEdit(item: TorrentListItem): Promise<void> {
		if (item.tracked_anime_id == null || this.trackBusy) return;
		this.trackBusy = true;
		try {
			this.trackItem = await getTrackedAnime(item.tracked_anime_id, false, false);
			this.trackSummary = null;
			this.trackOpen = true;
		} catch {
			notifyError('Could not load tracking settings');
		} finally {
			this.trackBusy = false;
		}
	}

	closeTrack(): void {
		this.trackOpen = false;
		this.trackSummary = null;
		this.trackItem = null;
	}
}

export const rssMenu = new RssMenu();
