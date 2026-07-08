/* Per-page "show absolute time" preference for clickable `RelativeTime` instances.
 * Keyed by a free-form `scope` string (one per page: "rss", "downloads", …) so each
 * page toggles independently. A scope's effective state is the user's stored choice if
 * they've toggled it, else the caller's `defaultAbsolute`. Choices persist to
 * localStorage → survive a full reload. */
import { SvelteMap } from 'svelte/reactivity';

const PREFIX = 'saberr_time_abs_';

class TimeFormat {
	// scope → user's explicit choice (absent = untoggled, use the default). Reactive so every
	// RelativeTime in a scope flips together.
	#override = new SvelteMap<string, boolean>();

	constructor() {
		// Load any persisted choices once (client only — guarded for SSR/prerender).
		try {
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key?.startsWith(PREFIX)) {
					this.#override.set(key.slice(PREFIX.length), localStorage.getItem(key) === '1');
				}
			}
		} catch {
			/* localStorage unavailable */
		}
	}

	isAbsolute(scope: string, defaultAbsolute = false): boolean {
		return this.#override.get(scope) ?? defaultAbsolute;
	}

	toggle(scope: string, defaultAbsolute = false): void {
		const next = !this.isAbsolute(scope, defaultAbsolute);
		this.#override.set(scope, next);
		try {
			localStorage.setItem(PREFIX + scope, next ? '1' : '0');
		} catch {
			/* ignore persistence failure */
		}
	}
}

export const timeFormat = new TimeFormat();
