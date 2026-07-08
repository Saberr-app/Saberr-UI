/* =============================================================================
 * SABERR TASKS API CALLS
 * -----------------------------------------------------------------------------
 * Background tasks: list + trigger. The Tasks page polls `listTasks` (pass
 * `userInitiated:false`). Trigger returns a discriminated result; 423 = already running.
 * ========================================================================== */

import { apiFetch } from './client';
import { isApiError } from './errors';
import type { TaskList } from './types';

/** Fetch all tasks. `userInitiated:false` keeps the 3s poll quiet on failure. */
export const listTasks = (userInitiated = false) =>
	apiFetch<TaskList>('/api/v1/system/tasks', { userInitiated });

export type TriggerResult = 'queued' | 'running';

/** 204 → "queued"; 423 → "running". Other failures rethrow (silent here; caller messages). */
export async function triggerTask(id: string): Promise<TriggerResult> {
	try {
		await apiFetch<void>(`/api/v1/system/tasks/${id}/trigger`, {
			method: 'POST',
			unwrap: false,
			userInitiated: false
		});
		return 'queued';
	} catch (e) {
		if (isApiError(e) && e.status === 423) return 'running';
		throw e;
	}
}
