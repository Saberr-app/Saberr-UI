/* =============================================================================
 * SABERR INFINITE-SCROLL SENTINEL — Svelte action: fires `onIntersect` when a
 * bottom-of-list element scrolls into view. Pagination state lives in the consumer.
 * ========================================================================== */

export interface IntersectOptions {
	/** Called each time the sentinel enters the viewport. */
	onIntersect: () => void;
	/** Pre-fetch margin so the next page loads before the user hits the very bottom. */
	rootMargin?: string;
	/** Skip observing entirely (e.g. while a load is in flight or the list is done). */
	disabled?: boolean;
}

export function intersect(node: HTMLElement, options: IntersectOptions) {
	let observer: IntersectionObserver | undefined;
	let current = options;

	const connect = () => {
		observer?.disconnect();
		if (current.disabled) return;
		observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) current.onIntersect();
			},
			{ rootMargin: current.rootMargin ?? '200px' }
		);
		observer.observe(node);
	};

	connect();

	return {
		update(next: IntersectOptions) {
			current = next;
			connect();
		},
		destroy() {
			observer?.disconnect();
		}
	};
}
