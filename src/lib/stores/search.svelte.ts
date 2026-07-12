/* =============================================================================
 * SABERR GLOBAL-SEARCH STORE (runes) — header search box. FE page matches are derived
 * from `query`; anime hits `POST /search` under anti-spam rules: ≥3 chars, auto-fire only
 * when no settings page matched (else an opt-in button, persisted in-memory 20 min),
 * 500ms debounce (Enter skips).
 * ========================================================================== */

import { searchAnime } from '$lib/api/search';
import { matchAll, hasSettingsMatch, type PageMatch } from '$lib/search/match';
import type { AnimeResult } from '$lib/api/types';

const MIN_CHARS = 3;
const DEBOUNCE_MS = 500;
const OPT_IN_TTL_MS = 20 * 60 * 1000;
const ANIME_LIMIT = 5;
const PAGE_LIMIT = 3;

class SearchStore {
	query = $state('');
	animeResults = $state<AnimeResult[]>([]);
	animeLoading = $state(false);
	animeError = $state(false);

	/** When the user last opted into anime results (epoch ms); null = never. */
	private optedInAt = $state<number | null>(null);

	private timer: ReturnType<typeof setTimeout> | null = null;
	private controller: AbortController | null = null;

	/** All FE page matches, best-first. */
	allMatches = $derived(matchAll(this.query));
	/** Top page matches to show. */
	pageMatches = $derived<PageMatch[]>(this.allMatches.slice(0, PAGE_LIMIT));
	/** Whether any matched target is a settings page (gates auto-fire). */
	settingsMatched = $derived(hasSettingsMatch(this.allMatches));

	private get longEnough(): boolean {
		return this.query.trim().length >= MIN_CHARS;
	}

	/** Has the user opted into anime results within the TTL? */
	get optedIn(): boolean {
		return this.optedInAt != null && Date.now() - this.optedInAt < OPT_IN_TTL_MS;
	}

	/** Would we auto-fire the anime API for the current query? */
	private get shouldAutoSearch(): boolean {
		if (!this.longEnough) return false;
		if (this.settingsMatched && !this.optedIn) return false;
		return true;
	}

	/** Show the "Load anime search results" opt-in button instead of auto-firing? */
	get showLoadButton(): boolean {
		return this.longEnough && this.settingsMatched && !this.optedIn && !this.animeLoading;
	}

	/** Update the query and (re)schedule the debounced anime search. */
	setQuery(value: string): void {
		this.query = value;
		this.schedule();
	}

	private schedule(): void {
		this.clearTimer();
		if (!this.shouldAutoSearch) {
			// Not eligible → drop stale anime results so only page matches show.
			this.abort();
			this.animeResults = [];
			this.animeError = false;
			return;
		}
		this.timer = setTimeout(() => void this.run(), DEBOUNCE_MS);
	}

	/** Enter pressed — run now if eligible, skipping the debounce. */
	submit(): void {
		if (!this.shouldAutoSearch) return;
		this.clearTimer();
		void this.run();
	}

	/** The opt-in button: remember the choice for 20 min, then search immediately. */
	loadAnime(): void {
		this.optedInAt = Date.now();
		this.clearTimer();
		if (this.longEnough) void this.run();
	}

	private async run(): Promise<void> {
		const q = this.query.trim();
		if (q.length < MIN_CHARS) return;
		this.abort();
		const controller = new AbortController();
		this.controller = controller;
		this.animeLoading = true;
		this.animeError = false;
		try {
			const results = await searchAnime(q, controller.signal);
			if (controller.signal.aborted) return;
			this.animeResults = results.slice(0, ANIME_LIMIT);
		} catch {
			if (controller.signal.aborted) return;
			this.animeError = true;
			this.animeResults = [];
		} finally {
			if (this.controller === controller) {
				this.animeLoading = false;
				this.controller = null;
			}
		}
	}

	private abort(): void {
		this.controller?.abort();
		this.controller = null;
		this.animeLoading = false;
	}

	private clearTimer(): void {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

	/** Reset the box (on close/navigate). Keeps the opt-in (only refresh/TTL clears it). */
	clear(): void {
		this.clearTimer();
		this.abort();
		this.query = '';
		this.animeResults = [];
		this.animeError = false;
	}
}

export const search = new SearchStore();
