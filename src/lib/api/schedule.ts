/* =============================================================================
 * SABERR SCHEDULE / CALENDAR API
 * -----------------------------------------------------------------------------
 * One endpoint: `GET /schedule`. The view picks the date param (`day`|`week`|`month`),
 * sent as a TZ-aware ISO so the backend resolves the period in the user's zone. `scope`
 * repeats (multiselect). `userInitiated:false` for the silent 1-min poll.
 * ========================================================================== */

import { apiFetch } from './client';
import type { AiringScheduleListResponse, AiringScheduleScope } from './types';

/** The three calendar views; also the query-param key sent to `/schedule`. */
export type CalendarView = 'day' | 'week' | 'month';

export interface GetScheduleParams {
	view: CalendarView;
	/** TZ-aware ISO datetime for the period start (local boundary + offset). */
	anchorIso: string;
	scope: AiringScheduleScope[];
	force?: boolean;
	userInitiated?: boolean;
}

/** Fetch the airing schedule for a period + scope set. */
export function getSchedule(params: GetScheduleParams): Promise<AiringScheduleListResponse> {
	const { view, anchorIso, scope, force = false, userInitiated = true } = params;
	const qs = new URLSearchParams();
	qs.set(view, anchorIso); // one of day | week | month
	for (const s of scope) qs.append('scope', s);
	if (force) qs.set('force_refresh', 'true');
	return apiFetch<AiringScheduleListResponse>(`/api/v1/schedule?${qs}`, { userInitiated });
}
