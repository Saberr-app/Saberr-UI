/* =============================================================================
 * SABERR DOWNLOAD-UPDATES STREAM (runes, singleton) — one shared SSE consumer for
 * `/downloads/updates/stream` (freq=3), used by Downloads, RSS, and the episode dialog.
 * Each surface `register(ids)`s the non-PROCESSED ids it wants live; the store feeds the
 * UNION to the socket (repeated `download_ids`), restarting ONLY when the union GROWS
 * (shrink = backend auto-unmonitors). "A new download appeared" is NOT here — it's on the
 * status stream (`downloadAddedAt`), since this stream runs only while something's unfinished.
 * ========================================================================== */

import { browser } from '$app/environment';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type { DownloadStreamItem, DownloadUpdatesTick } from '$lib/api/types';
import { EventStream } from '$lib/utils/event-stream';

class DownloadUpdatesStore {
	/** Latest streamed fields per download id (qbit FLATTENED, per the stream shape). */
	byId = new SvelteMap<number, DownloadStreamItem>();
	/** Ids the stream reported as deleted backend-side — consumers drop these from view. */
	private deleted = new SvelteSet<number>();

	/** token -> that watcher's set of ids. */
	private watchers = new Map<number, number[]>();
	private nextToken = 1;
	/** The union currently fed to the socket (sorted, deduped). */
	private unionIds: number[] = [];
	private started = false;
	/** Ids the stream reported PROCESSED. The backend drops them + closes the socket, so we exclude
	 *  them from the union ourselves — else we'd reopen forever for an id the server re-reports + closes. */
	private processed = new Set<number>();

	private stream = new EventStream<DownloadUpdatesTick>({
		path: '/api/v1/downloads/updates/stream',
		freq: 3,
		query: () => ({ download_ids: this.unionIds }),
		onMessage: (b) => this.onMessage(b),
		// No "get many by id" endpoint — a gap/watchdog can't re-pull byId. The next
		// ticks repopulate it, and consumers' own list refetches backstop the base data.
		onResync: () => {}
	});

	/** Start watching a set of ids; returns a token to update/unregister with. */
	register(ids: number[]): number {
		const token = this.nextToken++;
		this.watchers.set(token, [...new Set(ids)]);
		this.recompute();
		return token;
	}

	/** Replace a watcher's id set (e.g. the visible rows changed). */
	update(token: number, ids: number[]): void {
		if (!this.watchers.has(token)) return;
		this.watchers.set(token, [...new Set(ids)]);
		this.recompute();
	}

	/** Stop watching (the socket closes once no watcher remains). */
	unregister(token: number): void {
		if (this.watchers.delete(token)) this.recompute();
	}

	/** The latest streamed fields for an id, if any. */
	get(id: number): DownloadStreamItem | undefined {
		return this.byId.get(id);
	}

	/** Was this download deleted backend-side? (reactive — read in derived/effects). */
	isDeleted(id: number): boolean {
		return this.deleted.has(id);
	}

	private onMessage(b: DownloadUpdatesTick): void {
		let prune = false;
		for (const item of b.changed) {
			// Deleted backend-side → forget it + flag for consumers to drop from view.
			if (item.deleted === true) {
				this.byId.delete(item.id);
				if (!this.deleted.has(item.id)) {
					this.deleted.add(item.id);
					prune = true;
				}
				continue;
			}
			this.byId.set(item.id, item);
			if (item.status === 'PROCESSED' && !this.processed.has(item.id)) {
				this.processed.add(item.id);
				prune = true;
			}
		}
		// A download hitting PROCESSED/deleted leaves the union (may close the socket).
		if (prune) this.recompute();
	}

	/** Recompute the union and reconcile the socket: start/stop/restart-on-growth. */
	private recompute(): void {
		if (!browser) return;
		// Plain-object dedup/membership (no Set — keeps the reactivity lint clean for a
		// transient computation). `prevHas` tracks the previous union for growth checks.
		const prevHas: Record<number, true> = {};
		for (const id of this.unionIds) prevHas[id] = true;
		// All ids any consumer wants — used to forget processed ids nobody references
		// anymore (bounds the set), then to build the union minus processed ids.
		const rawHas: Record<number, true> = {};
		for (const ids of this.watchers.values()) for (const id of ids) rawHas[id] = true;
		// Forget processed/deleted ids no consumer references anymore (bounds the sets).
		for (const id of this.processed) if (!rawHas[id]) this.processed.delete(id);
		for (const id of this.deleted) if (!rawHas[id]) this.deleted.delete(id);

		const seen: Record<number, true> = {};
		const nextIds: number[] = [];
		for (const ids of this.watchers.values())
			for (const id of ids)
				if (!seen[id] && !this.processed.has(id) && !this.deleted.has(id)) {
					seen[id] = true;
					nextIds.push(id);
				}
		nextIds.sort((a, b) => a - b);
		this.unionIds = nextIds;

		if (nextIds.length === 0) {
			if (this.started) {
				this.stream.stop();
				this.started = false;
				// Keep byId so processed overlays persist across a stop/restart.
			}
			return;
		}
		if (!this.started) {
			this.started = true;
			this.stream.start();
			return;
		}
		// Already streaming: only a GROWN union needs a fresh socket (the live one isn't
		// monitoring the new ids). Pure shrink/equal = no-op (backend auto-unmonitors).
		const grew = nextIds.some((id) => !prevHas[id]);
		if (grew) this.stream.restart();
	}
}

export const downloadUpdates = new DownloadUpdatesStore();
