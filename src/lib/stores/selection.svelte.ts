/* =============================================================================
 * SABERR SELECTION STORE (runes) — multi-select per list instance (`selectionId`:
 * 'season' | 'search' | 'list:<tab>'), at module scope so it survives nav/tab switches.
 * Rules: cap 25 (over-cap adds rejected, caller toasts); shift-range is a TOGGLE over the
 * inclusive anchor→click range in display order; anchor = last SELECTED item; empty exits mode.
 * ========================================================================== */

import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type { AnimeRow } from '$lib/anilist/row';
import type { AnilistAnimeUserStatus } from '$lib/api/types';

export const MAX_SELECTION = 25;

/** Batch-action handlers `AnimeCollection` exposes so a per-item menu drives the same ops as the sticky-bar Edit menu. */
export interface BatchMenuCtl {
	count: number;
	hasOffListSelected: boolean;
	deletableCount: number;
	setStatus: (status: AnilistAnimeUserStatus) => void;
	openScore: () => void;
	openDelete: () => void;
	/* --- Tracked context only (omitted elsewhere). --- */
	/** True when viewing the archived list (offer Unarchive instead of Archive). */
	archived?: boolean;
	/** Archive the whole selection (tracked page). */
	archive?: () => void;
	/** Unarchive the whole selection (tracked page, archived view). */
	unarchive?: () => void;
	/** Delete the whole selection's tracking (tracked page). */
	deleteTracked?: () => void;
}

/** The reactive bundle threaded to views/items: mode flag, per-row check, click handlers.
 *  Range math lives in `AnimeCollection` (it knows the display order). */
export interface SelectionCtl {
	active: boolean;
	isSelected: (anilistId: number) => boolean;
	/** Selection-mode click (toggle, or shift-range). */
	click: (row: AnimeRow, e: MouseEvent) => void;
	/** Enter selection mode and select this row (context menu / actions menu). */
	enter: (row: AnimeRow) => void;
	/** Batch actions for the in-mode right-click menu (acts on the whole selection). */
	batch?: BatchMenuCtl;
}

class SelectionStore {
	#active = new SvelteMap<string, boolean>();
	#anchor = new SvelteMap<string, number | null>();
	#ids = new SvelteMap<string, SvelteSet<number>>();

	#set(id: string): SvelteSet<number> {
		let s = this.#ids.get(id);
		if (!s) {
			s = new SvelteSet<number>();
			this.#ids.set(id, s);
		}
		return s;
	}

	/* --- reads (reactive) --- */
	isActive(id: string): boolean {
		return this.#active.get(id) ?? false;
	}
	count(id: string): number {
		return this.#ids.get(id)?.size ?? 0;
	}
	isSelected(id: string, anilistId: number): boolean {
		return this.#ids.get(id)?.has(anilistId) ?? false;
	}
	all(id: string): number[] {
		return [...(this.#ids.get(id) ?? [])];
	}

	/* --- mode --- */
	enter(id: string, seedId?: number): void {
		this.#active.set(id, true);
		if (seedId != null) {
			this.#set(id).add(seedId);
			this.#anchor.set(id, seedId);
		}
	}
	exit(id: string): void {
		this.#active.set(id, false);
		this.#anchor.set(id, null);
		this.#set(id).clear();
	}
	/** Toolbar button: leave mode when active, otherwise enter empty. */
	toggleActive(id: string): void {
		if (this.isActive(id)) this.exit(id);
		else this.enter(id);
	}

	/* --- selection --- */

	/** Toggle one item (enters mode if needed). Returns false when adding would exceed the cap. */
	toggle(id: string, anilistId: number): boolean {
		if (!this.isActive(id)) this.#active.set(id, true);
		const set = this.#set(id);
		if (set.has(anilistId)) {
			set.delete(anilistId);
			if (set.size === 0) this.exit(id);
			return true;
		}
		if (set.size >= MAX_SELECTION) return false;
		set.add(anilistId);
		this.#anchor.set(id, anilistId);
		return true;
	}

	/** Shift-range toggle against the anchor (`orderedIds` = display order). Single toggle if
	 *  no anchor; false (whole range rejected) if a select would exceed the cap. */
	toggleRange(id: string, clickedId: number, orderedIds: number[]): boolean {
		if (!this.isActive(id)) this.#active.set(id, true);
		const anchor = this.#anchor.get(id) ?? null;
		if (anchor == null) return this.toggle(id, clickedId);

		const a = orderedIds.indexOf(anchor);
		const b = orderedIds.indexOf(clickedId);
		if (a === -1 || b === -1) return this.toggle(id, clickedId);

		const range = orderedIds.slice(Math.min(a, b), Math.max(a, b) + 1);
		const set = this.#set(id);
		const allSelected = range.every((x) => set.has(x));

		if (allSelected) {
			for (const x of range) set.delete(x);
			if (set.size === 0) this.exit(id);
			else this.#anchor.set(id, clickedId);
			return true;
		}

		const additions = range.filter((x) => !set.has(x)).length;
		if (set.size + additions > MAX_SELECTION) return false;
		for (const x of range) set.add(x);
		this.#anchor.set(id, clickedId);
		return true;
	}

	/** Remove ids after a successful batch action — unlike a user deselect, keeps selection mode even when empty. */
	prune(id: string, anilistIds: number[]): void {
		const set = this.#ids.get(id);
		if (!set) return;
		for (const x of anilistIds) set.delete(x);
		this.#anchor.set(id, null);
	}

	/** Drop a whole instance's state (e.g. its query changed → different dataset). */
	reset(id: string): void {
		this.exit(id);
	}
}

export const selection = new SelectionStore();
