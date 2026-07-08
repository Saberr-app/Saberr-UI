/* =============================================================================
 * SABERR TRACKING ACTIONS — thin archive/unarchive/delete (single + batch) wrappers that toast +
 * broadcast. Archive/unarchive keep the anime tracked (no broadcast); delete un-tracks it →
 * broadcast `trackedAnimeId: null` so Browse/User-list badges clear. Failures re-throw.
 * ========================================================================== */

import {
	archiveTrackedAnime,
	batchArchiveTrackedAnime,
	batchDeleteTrackedAnime,
	deleteTrackedAnime,
	unarchiveTrackedAnime
} from '$lib/api/tracked';
import { entryBroadcast } from '$lib/anilist/entry-broadcast';
import { notifySuccess } from '$lib/api/notify';

export async function archiveTracked(id: number): Promise<void> {
	await archiveTrackedAnime(id);
	notifySuccess('Archived');
}

export async function unarchiveTracked(id: number): Promise<void> {
	await unarchiveTrackedAnime(id);
	notifySuccess('Unarchived');
}

export async function deleteTracked(id: number, anilistId: number): Promise<void> {
	await deleteTrackedAnime(id);
	entryBroadcast.emit({ anilistId, trackedAnimeId: null });
	notifySuccess('Tracking removed');
}

export async function batchArchiveTracked(anilistIds: number[]): Promise<void> {
	await batchArchiveTrackedAnime(anilistIds);
	notifySuccess(`Archived ${anilistIds.length}`);
}

export async function batchDeleteTracked(anilistIds: number[]): Promise<void> {
	await batchDeleteTrackedAnime(anilistIds);
	for (const id of anilistIds) entryBroadcast.emit({ anilistId: id, trackedAnimeId: null });
	notifySuccess(`Removed tracking from ${anilistIds.length}`);
}
