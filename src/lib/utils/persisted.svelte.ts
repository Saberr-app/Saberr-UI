/* =============================================================================
 * SABERR PERSISTED VALUE (runes) — reactive value backed by localStorage via
 * `.current`. ⚠️ For arrays/objects, reassign (don't mutate in place) so it writes.
 * ========================================================================== */

import { browser } from '$app/environment';

class Persisted<T> {
	#key: string;
	#value = $state<T>() as T;

	constructor(key: string, initial: T) {
		this.#key = key;
		this.#value = this.#read() ?? initial;
	}

	get current(): T {
		return this.#value;
	}

	set current(v: T) {
		this.#value = v;
		this.#write(v);
	}

	#read(): T | null {
		if (!browser) return null;
		try {
			const raw = localStorage.getItem(this.#key);
			return raw == null ? null : (JSON.parse(raw) as T);
		} catch {
			return null;
		}
	}

	#write(v: T): void {
		if (!browser) return;
		try {
			localStorage.setItem(this.#key, JSON.stringify(v));
		} catch {
			// storage unavailable — non-fatal.
		}
	}
}

export function persisted<T>(key: string, initial: T): Persisted<T> {
	return new Persisted(key, initial);
}

export type { Persisted };
