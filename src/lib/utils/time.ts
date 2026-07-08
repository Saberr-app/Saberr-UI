/* =============================================================================
 * SABERR TIME / DURATION FORMATTING — backend timestamps are UTC ISO, rendered
 * browser-local; durations/frequencies arrive as integer seconds.
 * ========================================================================== */

const UNITS: { label: string; secs: number }[] = [
	{ label: 'd', secs: 86400 },
	{ label: 'h', secs: 3600 },
	{ label: 'm', secs: 60 },
	{ label: 's', secs: 1 }
];

/** Whole seconds → ≤`maxParts` non-zero units ("1h 30m"); `minUnitSecs` skips finer units. */
function compound(totalSeconds: number, maxParts = 2, minUnitSecs = 1): string {
	let remaining = Math.max(0, Math.floor(totalSeconds));
	const parts: string[] = [];
	for (const { label, secs } of UNITS) {
		if (secs < minUnitSecs) break; // units are descending → stop at the floor
		if (parts.length >= maxParts) break;
		const value = Math.floor(remaining / secs);
		if (value <= 0) continue;
		parts.push(`${value}${label}`);
		remaining -= value * secs;
	}
	return parts.join(' ');
}

/** Compact countdown to a future unix timestamp (seconds), e.g. "2d 4h". Minute
 *  granularity (it only refreshes per minute); under a minute → "<1m". Past/empty → "". */
export function formatCountdown(unixSeconds: number | null | undefined): string {
	if (unixSeconds == null) return '';
	const secs = unixSeconds - Math.floor(Date.now() / 1000);
	if (secs <= 0) return '';
	if (secs < 60) return '<1m';
	return compound(secs, 2, 60); // minutes is the smallest unit
}

/** Task run frequency, e.g. `3600` → "Every 1h", `5400` → "Every 1h 30m". */
export function formatFrequency(seconds: number | null | undefined): string {
	if (seconds == null || seconds <= 0) return 'Unscheduled';
	return `Every ${compound(seconds)}`;
}

/** A run/elapsed duration, e.g. `90` → "1m 30s". Sub-second (`0`) renders as "<1s". */
export function formatDuration(seconds: number): string {
	if (seconds <= 0) return '<1s';
	return compound(seconds);
}

/** Elapsed since a UTC ISO instant, floored to minutes ("1m", "1h 2m"); <1m → "<1m". Pass `nowMs` to stay live. */
export function formatElapsedSince(iso: string, nowMs: number = Date.now()): string {
	const since = new Date(iso).getTime();
	if (Number.isNaN(since)) return '';
	const secs = Math.floor((nowMs - since) / 1000);
	if (secs < 60) return '<1m';
	return compound(Math.floor(secs / 60) * 60);
}

const UPTIME_UNITS: { label: string; secs: number }[] = [
	{ label: 'day', secs: 86400 },
	{ label: 'hour', secs: 3600 },
	{ label: 'minute', secs: 60 },
	{ label: 'second', secs: 1 }
];

/** Long-form uptime ("1 day, 3 hours, 0 minutes, 10 seconds") — every unit below the
 *  largest non-zero one is shown, incl. zeros. Pass a live 1s `nowMs` to count up. */
export function formatUptime(iso: string, nowMs: number = Date.now()): string {
	const since = new Date(iso).getTime();
	if (Number.isNaN(since)) return '';
	let remaining = Math.max(0, Math.floor((nowMs - since) / 1000));
	const parts: string[] = [];
	let started = false;
	for (const { label, secs } of UPTIME_UNITS) {
		const value = Math.floor(remaining / secs);
		remaining -= value * secs;
		if (value === 0 && !started && secs > 1) continue; // skip leading zero units
		started = true;
		parts.push(`${value} ${label}${value === 1 ? '' : 's'}`);
	}
	return parts.join(', ');
}

const RELATIVE = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const RELATIVE_UNITS: { unit: Intl.RelativeTimeFormatUnit; secs: number }[] = [
	{ unit: 'year', secs: 31536000 },
	{ unit: 'month', secs: 2592000 },
	{ unit: 'week', secs: 604800 },
	{ unit: 'day', secs: 86400 },
	{ unit: 'hour', secs: 3600 },
	{ unit: 'minute', secs: 60 },
	{ unit: 'second', secs: 1 }
];

/** Human relative time from a UTC ISO string, e.g. "5 minutes ago" / "in 2 days".
 *  `coarseSubMinute` collapses any past time under a minute to "less than 1 minute ago"
 *  (so a slower refresh than per-second still reads correctly). */
export function formatRelative(iso: string, opts?: { coarseSubMinute?: boolean }): string {
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return '';
	const diffSecs = Math.round((then - Date.now()) / 1000);
	const abs = Math.abs(diffSecs);
	if (opts?.coarseSubMinute && diffSecs <= 0 && abs < 60) return 'less than 1 minute ago';
	for (const { unit, secs } of RELATIVE_UNITS) {
		if (abs >= secs || unit === 'second') {
			return RELATIVE.format(Math.round(diffSecs / secs), unit);
		}
	}
	return RELATIVE.format(0, 'second');
}

const DATE_TIME = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** Absolute local date-time from a UTC ISO string, e.g. "Jun 8, 2026, 2:32 PM". */
export function formatDateTime(iso: string): string {
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? '' : DATE_TIME.format(d);
}

const ABS_CLOCK = new Intl.DateTimeFormat(undefined, {
	hour: '2-digit',
	minute: '2-digit',
	hour12: true
});

/** Calendar-day delta (local tz) between two instants: 0 today, 1 yesterday, etc. */
function localDayDiff(then: Date, now: Date): number {
	const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
	return Math.round((start(now) - start(then)) / 86400000);
}

/** Absolute local time, granularity tuned by recency (browser timezone):
 *  today → "02:32 PM", yesterday → "Yesterday at 02:32 PM",
 *  older → "Mon, 30 Jun 2026 14:32". Fixed DD-Mon-YYYY order regardless of locale. */
export function formatAbsolute(iso: string, nowMs: number = Date.now()): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';
	const diff = localDayDiff(d, new Date(nowMs));
	if (diff === 0) return ABS_CLOCK.format(d);
	if (diff === 1) return `Yesterday at ${ABS_CLOCK.format(d)}`;
	const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
	const month = d.toLocaleDateString(undefined, { month: 'short' });
	const day = String(d.getDate()).padStart(2, '0');
	const hh = String(d.getHours()).padStart(2, '0');
	const mm = String(d.getMinutes()).padStart(2, '0');
	return `${weekday}, ${day} ${month} ${d.getFullYear()} ${hh}:${mm}`;
}

/** `<input type="datetime-local">` value (local time) → UTC ISO; empty/invalid → null. */
export function toUtcIso(localDateTime: string | null | undefined): string | null {
	if (!localDateTime) return null;
	const d = new Date(localDateTime);
	return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
