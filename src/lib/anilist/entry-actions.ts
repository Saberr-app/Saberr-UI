/* =============================================================================
 * SABERR LIST-ENTRY ACTIONS — full-PUT entry updates + auto-complete / add-to-list rules:
 *   - the update endpoint needs ALL fields → always send a complete body.
 *   - reaching the episode count auto-completes (COMPLETED; REPEATING bumps repeat_count + keeps
 *     the date; else set completed_at=today if unset). Never overwrite an already-set date.
 *   - add-to-list default status from airing status; only CURRENT auto-sets started_at=today.
 * Every mutation broadcasts + optionally toasts.
 * ========================================================================== */

import { deleteUserAnimeEntry, updateUserAnimeEntry } from '$lib/api/anime';
import type {
	AnilistAnimeStatus,
	AnilistAnimeUserStatus,
	UserAnimeUpdateRequest,
	UserAnimeUpdateResponse,
	UserEntry
} from '$lib/api/types';
import { notifySuccess } from '$lib/api/notify';
import { blankToNull } from '$lib/utils/form';
import { entryBroadcast } from './entry-broadcast';
import { emptyFuzzyDate, isFuzzyEmpty, todayFuzzyDate } from './dates';

/** Just enough about an anime to drive a mutation. */
export interface MutationContext {
	anilistId: number;
	episodes: number | null;
	airingStatus: AnilistAnimeStatus;
	entry: UserEntry | null;
}

/** Build a complete update request from an existing entry. */
export function entryToRequest(entry: UserEntry): UserAnimeUpdateRequest {
	return {
		progress: entry.progress,
		score: entry.score,
		status: entry.status,
		repeat_count: entry.repeat_count,
		is_private: entry.is_private,
		started_at: entry.started_at,
		completed_at: entry.completed_at,
		// Empty notes must be null, not "" (backend minLength=1 on the nullable field).
		notes: blankToNull(entry.notes)
	};
}

/** A fresh, empty entry request with the given status. */
export function emptyEntryRequest(status: AnilistAnimeUserStatus): UserAnimeUpdateRequest {
	return {
		progress: 0,
		score: 0,
		status,
		repeat_count: 0,
		is_private: false,
		started_at: emptyFuzzyDate(),
		completed_at: emptyFuzzyDate(),
		notes: null
	};
}

/** Default watch status for an anime not yet on the list, from its airing status. */
export function defaultStatusForAiring(airing: AnilistAnimeStatus): AnilistAnimeUserStatus {
	switch (airing) {
		case 'RELEASING':
			return 'CURRENT';
		case 'FINISHED':
			return 'COMPLETED';
		case 'NOT_YET_RELEASED':
			return 'PLANNING';
		default:
			return 'PLANNING';
	}
}

/** Apply the auto-complete rule for a new progress value (mutates + returns the request): at the
 *  episode count → COMPLETED; REPEATING bumps repeat_count, else set completed_at=today if unset. */
export function autoCompleteOnProgress(
	req: UserAnimeUpdateRequest,
	episodes: number | null
): UserAnimeUpdateRequest {
	if (episodes != null && req.progress >= episodes) {
		if (req.status === 'REPEATING') {
			req.repeat_count += 1;
		} else if (isFuzzyEmpty(req.completed_at)) {
			req.completed_at = todayFuzzyDate();
		}
		req.status = 'COMPLETED';
	}
	return req;
}

const extractEntry = (res: UserAnimeUpdateResponse): UserEntry => ({
	progress: res.progress,
	score: res.score,
	status: res.status,
	repeat_count: res.repeat_count,
	is_private: res.is_private,
	started_at: res.started_at,
	completed_at: res.completed_at,
	notes: res.notes
});

/** Persist an update, broadcast it, optionally toast. Returns the response or null on failure. */
export async function saveEntry(
	anilistId: number,
	body: UserAnimeUpdateRequest,
	successMessage: string | null = 'List updated'
): Promise<UserAnimeUpdateResponse | null> {
	try {
		const res = await updateUserAnimeEntry(anilistId, body);
		entryBroadcast.emit({
			anilistId,
			entry: extractEntry(res),
			trackedAnimeId: res.tracked_anime_id
		});
		if (successMessage) notifySuccess(successMessage);
		return res;
	} catch {
		return null;
	}
}

/** Remove an anime from the list; broadcasts a null entry. */
export async function removeEntry(anilistId: number): Promise<boolean> {
	try {
		await deleteUserAnimeEntry(anilistId);
		entryBroadcast.emit({ anilistId, entry: null });
		notifySuccess('Removed from list');
		return true;
	} catch {
		return false;
	}
}

/** Quick status change (context menu). Keeps other fields intact. */
export function setStatus(ctx: MutationContext, status: AnilistAnimeUserStatus) {
	const req = ctx.entry ? entryToRequest(ctx.entry) : emptyEntryRequest(status);
	req.status = status;
	return saveEntry(ctx.anilistId, req, 'List updated');
}

/** Add a not-yet-listed anime with the chosen status + sensible defaults. */
export function addEntry(ctx: MutationContext, status: AnilistAnimeUserStatus) {
	const req = emptyEntryRequest(status);
	if (status === 'CURRENT' && isFuzzyEmpty(req.started_at)) {
		req.started_at = todayFuzzyDate();
	}
	return saveEntry(ctx.anilistId, req, 'Added to list');
}

/** Increment watched progress by one (no-op if not on list or already at max). */
export function incrementProgress(ctx: MutationContext) {
	if (!ctx.entry) return Promise.resolve(null);
	const next = ctx.entry.progress + 1;
	if (ctx.episodes != null && next > ctx.episodes) return Promise.resolve(null);
	const req = entryToRequest(ctx.entry);
	req.progress = next;
	autoCompleteOnProgress(req, ctx.episodes);
	return saveEntry(ctx.anilistId, req, null);
}
