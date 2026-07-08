/* =============================================================================
 * SABERR CALENDAR — SWIPE ACTION — horizontal-swipe period navigation on touch. Fires only for a
 * decisively horizontal flick (vertical scrolling unaffected).
 * ========================================================================== */

import type { Action } from 'svelte/action';

interface SwipeOptions {
	onLeft?: () => void;
	onRight?: () => void;
	/** Gesture is ignored when false (e.g. month view, where it conflicts with cell taps). */
	enabled?: boolean;
}

export const swipe: Action<HTMLElement, SwipeOptions> = (node, options) => {
	let opts = options;
	let startX = 0;
	let startY = 0;
	let startedAt = 0;

	function start(e: TouchEvent) {
		const t = e.touches[0];
		startX = t.clientX;
		startY = t.clientY;
		startedAt = Date.now();
	}

	function end(e: TouchEvent) {
		if (opts?.enabled === false) return;
		const t = e.changedTouches[0];
		const dx = t.clientX - startX;
		const dy = t.clientY - startY;
		const dt = Date.now() - startedAt;
		// Decisive, fast, mostly-horizontal flick only.
		if (dt < 600 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
			if (dx < 0) opts?.onLeft?.();
			else opts?.onRight?.();
		}
	}

	node.addEventListener('touchstart', start, { passive: true });
	node.addEventListener('touchend', end, { passive: true });

	return {
		update(next) {
			opts = next;
		},
		destroy() {
			node.removeEventListener('touchstart', start);
			node.removeEventListener('touchend', end);
		}
	};
};
