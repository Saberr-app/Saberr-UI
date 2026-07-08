/* =============================================================================
 * SABERR LIST-ENTRY BROADCAST — tiny pub/sub so an edit from ANY surface updates every
 * in-memory cache + visible UI at once. Consumers subscribe and patch their `anilistId`.
 * ========================================================================== */

import type { UserEntry } from '$lib/api/types';

export interface EntryChange {
	anilistId: number;
	/** Saved entry, or `null` when removed from the list. Omit (`undefined`) for a tracking-only
	 *  change so consumers leave the existing entry untouched. */
	entry?: UserEntry | null;
	/** Tracking id when known (e.g. echoed by the save). */
	trackedAnimeId?: number | null;
	/** The tracked "from episode" when known — lets the calendar gate its coverage. */
	trackedFromEpisode?: number | null;
}

/** BULK freshening signal (authoritative {entry, tracking} from a list/tracked/browse fetch).
 *  Unlike `EntryChange`, appliers patch only the ids handed and NEVER treat absence as removal. */
export interface EntryUpdate {
	anilistId: number;
	entry: UserEntry | null;
	trackedAnimeId: number | null;
}

/** Project a row-shaped value down to a clean `EntryUpdate`. */
export const toEntryUpdate = (x: EntryUpdate): EntryUpdate => ({
	anilistId: x.anilistId,
	entry: x.entry,
	trackedAnimeId: x.trackedAnimeId
});

type Listener = (change: EntryChange) => void;
type BulkListener = (updates: EntryUpdate[]) => void;

class EntryBroadcast {
	#listeners = new Set<Listener>();
	#bulkListeners = new Set<BulkListener>();

	subscribe(fn: Listener): () => void {
		this.#listeners.add(fn);
		return () => this.#listeners.delete(fn);
	}

	emit(change: EntryChange): void {
		for (const fn of this.#listeners) fn(change);
	}

	/** Subscribe to bulk reconciliation batches (a store's `applyEntries`). */
	bulkSubscribe(fn: BulkListener): () => void {
		this.#bulkListeners.add(fn);
		return () => this.#bulkListeners.delete(fn);
	}

	/** Fan a freshly-fetched batch out to every cache so they seed each other. */
	emitBulk(updates: EntryUpdate[]): void {
		if (updates.length === 0) return;
		for (const fn of this.#bulkListeners) fn(updates);
	}
}

export const entryBroadcast = new EntryBroadcast();
