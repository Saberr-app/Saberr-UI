/* =============================================================================
 * SABERR SHARED CLOCK (runes) — one app-wide 1-min tick for live countdowns. Read
 * `clock.tick` inside a `$derived` to recompute every minute.
 * ========================================================================== */

class Clock {
	/** Wall-clock ms, refreshed every minute. */
	tick = $state(Date.now());
	private timer: ReturnType<typeof setInterval> | undefined;

	/** Start the shared interval (idempotent; browser-only). */
	start(): void {
		if (this.timer != null || typeof window === 'undefined') return;
		this.timer = setInterval(() => (this.tick = Date.now()), 60_000);
	}
}

export const clock = new Clock();
