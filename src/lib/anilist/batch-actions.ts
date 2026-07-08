/* =============================================================================
 * SABERR BATCH LIST-ENTRY ACTIONS — batch counterparts of `entry-actions.ts`. Each hits a batch
 * endpoint then broadcasts a per-id `EntryChange` so every cache/surface patches at once. Status/score
 * use batch-update with PARTIAL `data` (off-list ids upserted); delete uses batch-delete. All-or-nothing:
 * on 404/422 the client toasts + we re-throw (caller keeps the selection).
 * ========================================================================== */

import { batchDeleteAnimeList, batchUpdateAnimeList } from '$lib/api/anime';
import type { AnilistAnimeUserStatus, UserAnimeListItemMinimal, UserEntry } from '$lib/api/types';
import { notifySuccess } from '$lib/api/notify';
import { entryBroadcast } from './entry-broadcast';

const entryOf = (m: UserAnimeListItemMinimal): UserEntry => ({
	progress: m.progress,
	score: m.score,
	status: m.status,
	repeat_count: m.repeat_count,
	is_private: m.is_private,
	started_at: m.started_at,
	completed_at: m.completed_at,
	notes: m.notes
});

const entriesWord = (n: number) => (n === 1 ? 'entry' : 'entries');

/** Broadcast each echoed entry so every cache/UI patches for the matching id. */
function broadcastUpdated(items: UserAnimeListItemMinimal[]): void {
	for (const m of items) {
		entryBroadcast.emit({
			anilistId: m.anilist_id,
			entry: entryOf(m),
			trackedAnimeId: m.tracked_anime_id
		});
	}
}

/** Set the watch status on many entries (upserts off-list ids). Throws on failure. */
export async function batchSetStatus(
	anilistIds: number[],
	status: AnilistAnimeUserStatus
): Promise<void> {
	const res = await batchUpdateAnimeList(anilistIds, { status });
	broadcastUpdated(res.updated_anime_list);
	notifySuccess(`Updated ${anilistIds.length} ${entriesWord(anilistIds.length)}`);
}

/** Set the score on many entries. Throws on failure. */
export async function batchSetScore(anilistIds: number[], score: number): Promise<void> {
	const res = await batchUpdateAnimeList(anilistIds, { score });
	broadcastUpdated(res.updated_anime_list);
	notifySuccess(`Updated ${anilistIds.length} ${entriesWord(anilistIds.length)}`);
}

/** Remove many entries from the list. Caller passes only on-list ids. Throws on failure. */
export async function batchDelete(anilistIds: number[]): Promise<void> {
	await batchDeleteAnimeList(anilistIds);
	for (const id of anilistIds) entryBroadcast.emit({ anilistId: id, entry: null });
	notifySuccess(`Removed ${anilistIds.length} from list`);
}
