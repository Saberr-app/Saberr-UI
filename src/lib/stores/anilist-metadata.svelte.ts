/* =============================================================================
 * SABERR ANILIST METADATA STORE (runes) — genres + tags for Browse/User-list filters.
 * Loaded with settings on login, persisted to localStorage (1-week TTL); a failed fetch
 * marks the cache expired so the next access retries. Exposes pre-built tag/category maps.
 * ========================================================================== */

import { browser } from '$app/environment';
import { SvelteMap } from 'svelte/reactivity';
import { getAnilistMetadata } from '$lib/api/anime';
import type { AnilistMetadataTag } from '$lib/api/types';
import { compareCategories } from '$lib/anilist/tag-categories';

const STORAGE_KEY = 'saberr_anilist_metadata';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CachedMetadata {
	tags: AnilistMetadataTag[];
	genres: string[];
	fetchedAt: number;
}

class AnilistMetadataStore {
	tags = $state<AnilistMetadataTag[]>([]);
	genres = $state<string[]>([]);
	private fetchedAt = $state(0);
	private inflight: Promise<void> | null = null;

	/** tag name → its category. */
	tagToCategory = $derived.by(() => {
		const map = new SvelteMap<string, string>();
		for (const t of this.tags) map.set(t.name, t.category);
		return map;
	});

	/** category → its tag names (categories in fixed order, tags sorted by name). */
	categoryToTags = $derived.by(() => {
		const grouped = new SvelteMap<string, string[]>();
		for (const t of this.tags) {
			const list = grouped.get(t.category);
			if (list) list.push(t.name);
			else grouped.set(t.category, [t.name]);
		}
		const ordered = new SvelteMap<string, string[]>();
		for (const cat of [...grouped.keys()].sort(compareCategories)) {
			ordered.set(
				cat,
				grouped.get(cat)!.sort((a, b) => a.localeCompare(b))
			);
		}
		return ordered;
	});

	/** True when we have anything to filter by. */
	hasFilters = $derived(this.genres.length > 0 || this.tags.length > 0);

	constructor() {
		if (browser) this.loadFromStorage();
	}

	private loadFromStorage(): void {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return;
			const parsed = JSON.parse(raw) as CachedMetadata;
			this.tags = parsed.tags ?? [];
			this.genres = parsed.genres ?? [];
			this.fetchedAt = parsed.fetchedAt ?? 0;
		} catch {
			// Corrupt cache — ignore; a refresh will repopulate.
		}
	}

	private persist(): void {
		if (!browser) return;
		try {
			const payload: CachedMetadata = {
				tags: this.tags,
				genres: this.genres,
				fetchedAt: this.fetchedAt
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
		} catch {
			// Storage full/unavailable — non-fatal.
		}
	}

	private isExpired(): boolean {
		return Date.now() - this.fetchedAt > TTL_MS;
	}

	/** Ensure the cache is fresh (silent fetch). Concurrent calls share one in-flight request. */
	ensureFresh(force = false): Promise<void> {
		if (!browser) return Promise.resolve();
		const populated = this.tags.length > 0 || this.genres.length > 0;
		if (!force && populated && !this.isExpired()) return Promise.resolve();
		if (this.inflight) return this.inflight;

		this.inflight = (async () => {
			try {
				const data = await getAnilistMetadata(false);
				this.tags = data.tags;
				this.genres = data.genres;
				this.fetchedAt = Date.now();
				this.persist();
			} catch {
				// Mark immediately expired so the next access retries.
				this.fetchedAt = 0;
			} finally {
				this.inflight = null;
			}
		})();
		return this.inflight;
	}
}

export const anilistMetadata = new AnilistMetadataStore();
