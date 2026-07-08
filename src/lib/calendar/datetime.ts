/* =============================================================================
 * SABERR CALENDAR — DATE/TIME MATH. Period boundaries computed in browser-local time; the
 * schedule param is a TZ-aware ISO (local boundary + offset). `firstDayOfWeek` 0..6 (0=Sun,
 * matching `Date.getDay()`); Monday default.
 * ========================================================================== */

import type { CalendarView } from '$lib/api/schedule';

const pad = (n: number): string => String(n).padStart(2, '0');

/* --- Boundaries ------------------------------------------------------------- */

export function startOfDay(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function startOfWeek(d: Date, firstDay: number): Date {
	const s = startOfDay(d);
	const diff = (s.getDay() - firstDay + 7) % 7;
	s.setDate(s.getDate() - diff);
	return s;
}

export function startOfMonth(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** The period's start date for the given view (used for the API anchor). */
export function periodStart(view: CalendarView, anchor: Date, firstDay: number): Date {
	if (view === 'day') return startOfDay(anchor);
	if (view === 'week') return startOfWeek(anchor, firstDay);
	return startOfMonth(anchor);
}

/* --- TZ-aware ISO ----------------------------------------------------------- */

function offsetSuffix(d: Date): string {
	const off = -d.getTimezoneOffset(); // minutes east of UTC
	const sign = off >= 0 ? '+' : '-';
	const abs = Math.abs(off);
	return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Local datetime as an ISO string carrying the local UTC offset. */
export function toLocalIso(d: Date): string {
	return (
		`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
		`T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${offsetSuffix(d)}`
	);
}

/** The TZ-aware anchor param for `/schedule` given the active view. */
export function toScheduleParam(view: CalendarView, anchor: Date, firstDay: number): string {
	return toLocalIso(periodStart(view, anchor, firstDay));
}

/* --- Navigation ------------------------------------------------------------- */

export function stepPeriod(view: CalendarView, anchor: Date, dir: -1 | 1): Date {
	const d = new Date(anchor);
	if (view === 'day') d.setDate(d.getDate() + dir);
	else if (view === 'week') d.setDate(d.getDate() + 7 * dir);
	else d.setMonth(d.getMonth() + dir);
	return d;
}

/* --- Grid building ---------------------------------------------------------- */

/** The seven dates of the week containing `anchor`. */
export function daysOfWeek(anchor: Date, firstDay: number): Date[] {
	const s = startOfWeek(anchor, firstDay);
	return Array.from({ length: 7 }, (_, i) => {
		const d = new Date(s);
		d.setDate(s.getDate() + i);
		return d;
	});
}

/** Weeks (rows of 7 dates) covering the month grid, incl. adjacent-month spill. */
export function weeksOfMonth(anchor: Date, firstDay: number): Date[][] {
	const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
	const gridStart = startOfWeek(startOfMonth(anchor), firstDay);
	const gridEnd = startOfWeek(monthEnd, firstDay);
	gridEnd.setDate(gridEnd.getDate() + 6);

	const weeks: Date[][] = [];
	const cur = new Date(gridStart);
	while (cur <= gridEnd) {
		const week: Date[] = [];
		for (let i = 0; i < 7; i++) {
			week.push(new Date(cur));
			cur.setDate(cur.getDate() + 1);
		}
		weeks.push(week);
	}
	return weeks;
}

/* --- Keys / comparisons ----------------------------------------------------- */

/** Stable local-date key (YYYY-MM-DD) for grouping episodes into days. */
export function localDateKey(d: Date): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isSameDay(a: Date, b: Date): boolean {
	return localDateKey(a) === localDateKey(b);
}

export function isSameMonth(a: Date, b: Date): boolean {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isToday(d: Date): boolean {
	return isSameDay(d, new Date());
}

/* --- Labels ----------------------------------------------------------------- */

const dayLabelFmt = new Intl.DateTimeFormat(undefined, {
	weekday: 'short',
	month: 'short',
	day: 'numeric'
});
const weekLabelFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const monthLabelFmt = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

/** The period title shown between the prev/next arrows. */
export function periodLabel(view: CalendarView, anchor: Date, firstDay: number): string {
	if (view === 'day') return dayLabelFmt.format(anchor);
	if (view === 'week') return `Week of ${weekLabelFmt.format(startOfWeek(anchor, firstDay))}`;
	return monthLabelFmt.format(anchor);
}

/** Localized airing time, e.g. "22:30". */
export function timeLabel(d: Date): string {
	return timeFmt.format(d);
}

/** Short weekday header labels, rotated to start at `firstDay`. */
export function weekdayLabels(firstDay: number): string[] {
	const fmt = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
	// 2024-01-07 is a Sunday; advancing by (firstDay+i) lands on the right weekday.
	return Array.from({ length: 7 }, (_, i) =>
		fmt.format(new Date(2024, 0, 7 + ((firstDay + i) % 7)))
	);
}

/** Weekday option list for the "first day of week" picker (value = 0..6). */
export function weekdayOptions(): { value: number; label: string }[] {
	const fmt = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
	return Array.from({ length: 7 }, (_, i) => ({
		value: i,
		label: fmt.format(new Date(2024, 0, 7 + i))
	}));
}
