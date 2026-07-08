/* =============================================================================
 * SABERR CALENDAR — PERSISTED PREFERENCES (localStorage via `persisted`). `scope` starts
 * empty as an "unseeded" sentinel — the schedule store seeds the smart default on first load.
 * ========================================================================== */

import { persisted } from '$lib/utils/persisted.svelte';
import type { AiringScheduleScope } from '$lib/api/types';
import type { CalendarView } from '$lib/api/schedule';

export type CardSize = 'full' | 'compact';
/** Sort key. Direction is fixed: airing ascending, popularity descending. */
export type CalendarSort = 'airing' | 'popularity';

/** Phone defaults to the day view; everything else to the week view. */
function defaultView(): CalendarView {
	if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches)
		return 'day';
	return 'week';
}

/** The viewed-period anchor. Session-scoped (NOT persisted): survives leave/return within the
 *  session, but a full reload starts back at today. */
class CalendarAnchor {
	current = $state(new Date());
}
export const calendarAnchor = new CalendarAnchor();

export const calendarView = persisted<CalendarView>('saberr_calendar_view', defaultView());
export const calendarCardSize = persisted<CardSize>('saberr_calendar_card_size', 'full');
export const calendarSort = persisted<CalendarSort>('saberr_calendar_sort', 'airing');
export const calendarScope = persisted<AiringScheduleScope[]>('saberr_calendar_scope', []);
/** 0..6 (0 = Sunday); Monday default. */
export const calendarFirstDay = persisted<number>('saberr_calendar_first_day', 1);

/** Which indicators are drawn (cover-tile rings / coverage icons / episode markers)
 *  and reflected in the legend. All three on by default. */
export const calendarShowAiringStatus = persisted<boolean>('saberr_calendar_ind_airing', true);
export const calendarShowDownloadStatus = persisted<boolean>('saberr_calendar_ind_download', true);
export const calendarShowEpisodeMarkers = persisted<boolean>('saberr_calendar_ind_episode', true);

/** Page-scoped filters — NOT persisted. `premieresOnly` survives view/scope/sort changes but
 *  resets on the page's mount (leave/return clears it). */
class CalendarFilters {
	premieresOnly = $state(false);
}
export const calendarFilters = new CalendarFilters();
