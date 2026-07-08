/* =============================================================================
 * SABERR SCROLL-FADE ACTION — sets `--fade-start`/`--fade-end` (0|1) on a
 * horizontally-scrollable node so a `.scroll-fade` mask-image crops the cut-off edge.
 * ========================================================================== */

export interface ScrollFadeOptions {
	/** Fade the start (left) edge when scrolled away from it. Default true. */
	start?: boolean;
	/** Fade the end (right) edge when there's more to the right. Default true. */
	end?: boolean;
}

export function scrollFade(node: HTMLElement, options: ScrollFadeOptions = {}) {
	const start = options.start ?? true;
	const end = options.end ?? true;

	const update = () => {
		const max = node.scrollWidth - node.clientWidth;
		const canScroll = max > 1;
		const atStart = node.scrollLeft <= 1;
		const atEnd = node.scrollLeft >= max - 1;
		node.style.setProperty('--fade-start', start && canScroll && !atStart ? '1' : '0');
		node.style.setProperty('--fade-end', end && canScroll && !atEnd ? '1' : '0');
	};

	update();
	node.addEventListener('scroll', update, { passive: true });
	const ro = new ResizeObserver(update);
	ro.observe(node);

	return {
		destroy() {
			node.removeEventListener('scroll', update);
			ro.disconnect();
		}
	};
}

/** Left-button click-drag horizontal panning for an overflow-x container. */
export function dragScroll(node: HTMLElement) {
	let down = false;
	let startX = 0;
	let startLeft = 0;

	const onDown = (e: PointerEvent) => {
		if (e.button !== 0) return;
		down = true;
		startX = e.clientX;
		startLeft = node.scrollLeft;
		node.setPointerCapture(e.pointerId);
		node.style.cursor = 'grabbing';
	};
	const onMove = (e: PointerEvent) => {
		if (!down) return;
		node.scrollLeft = startLeft - (e.clientX - startX);
	};
	const onUp = (e: PointerEvent) => {
		down = false;
		node.style.cursor = '';
		try {
			node.releasePointerCapture(e.pointerId);
		} catch {
			/* pointer already released */
		}
	};

	node.style.cursor = 'grab';
	node.addEventListener('pointerdown', onDown);
	node.addEventListener('pointermove', onMove);
	node.addEventListener('pointerup', onUp);
	node.addEventListener('pointercancel', onUp);

	return {
		destroy() {
			node.removeEventListener('pointerdown', onDown);
			node.removeEventListener('pointermove', onMove);
			node.removeEventListener('pointerup', onUp);
			node.removeEventListener('pointercancel', onUp);
		}
	};
}
