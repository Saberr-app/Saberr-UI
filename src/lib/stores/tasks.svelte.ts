/* =============================================================================
 * SABERR TASKS STORE (runes) — Tasks page. Consumes `/system/tasks/stream` (sparse: each
 * event carries only CHANGED tasks) via EventStream, seeded by `GET /system/tasks`. Changed
 * tasks upsert by `id`; an id's absence is never a deletion (a full `refresh()` reconciles removals).
 * ========================================================================== */

import { browser } from '$app/environment';
import { listTasks } from '$lib/api/tasks';
import { EventStream } from '$lib/utils/event-stream';
import type { Task } from '$lib/api/types';

/** Sparse tasks tick; `tasks` lists only changed tasks (empty = heartbeat). */
interface TasksTick {
	ref: number;
	tasks?: Task[];
}

class TasksStore {
	tasks = $state<Task[]>([]);
	loaded = $state(false);
	loadFailed = $state(false);

	private active = false;
	/** SSE transport (3s ticks); watchdog/reconnect/hidden handling owned by it. */
	private stream = new EventStream<TasksTick>({
		path: '/api/v1/system/tasks/stream',
		freq: 3,
		onMessage: (b) => this.applyTick(b),
		onResync: () => this.refresh()
	});

	/** Begin streaming. Call on page mount. */
	start(): void {
		if (!browser || this.active) return;
		this.active = true;
		void this.refresh(); // seed
		this.stream.start();
	}

	/** Stop streaming. Call on page unmount. */
	stop(): void {
		this.active = false;
		this.stream.stop();
	}

	/** Full list refetch — seed + the stream's resync (gap / watchdog / visible). */
	async refresh(): Promise<void> {
		if (!this.active || !browser) return;
		try {
			const data = await listTasks(false);
			this.tasks = data.tasks;
			this.loaded = true;
			this.loadFailed = false;
		} catch {
			// Keep the last known list; only the very first fetch surfaces an error.
			if (!this.loaded) this.loadFailed = true;
		}
	}

	/** Upsert the changed tasks by id (the stream omits unchanged ones). */
	private applyTick(b: TasksTick): void {
		if (!b.tasks?.length) return; // heartbeat
		// Plain object for the local lookup (avoids the reactive Map/Set lint rule).
		const changed: Record<string, Task> = {};
		for (const t of b.tasks) changed[t.id] = t;
		// Replace updated rows in place; leftover changed ids are genuinely new.
		const next = this.tasks.map((t) => {
			const u = changed[t.id];
			if (u) {
				delete changed[t.id];
				return u;
			}
			return t;
		});
		for (const id in changed) next.push(changed[id]);
		this.tasks = next;
		this.loaded = true;
	}
}

export const tasks = new TasksStore();
