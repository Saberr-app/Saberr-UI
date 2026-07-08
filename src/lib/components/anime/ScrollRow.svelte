<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { children }: { children: Snippet } = $props();

	let scroller = $state<HTMLElement | null>(null);
	let atStart = $state(true);
	let atEnd = $state(true);
	let canScroll = $state(false);

	function update() {
		const el = scroller;
		if (!el) return;
		canScroll = el.scrollWidth > el.clientWidth + 1;
		atStart = el.scrollLeft <= 1;
		atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
	}

	function nudge(dir: 1 | -1) {
		scroller?.scrollBy({
			left: dir * Math.max(220, scroller.clientWidth * 0.8),
			behavior: 'smooth'
		});
	}

	onMount(() => {
		update();
		const ro = new ResizeObserver(update);
		if (scroller) ro.observe(scroller);
		return () => ro.disconnect();
	});
</script>

<div class="relative">
	<div bind:this={scroller} onscroll={update} class="no-scrollbar flex gap-3 overflow-x-auto pb-1">
		{@render children()}
	</div>

	{#if canScroll && !atStart}
		<div
			class="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent"
		></div>
		<button
			type="button"
			onclick={() => nudge(-1)}
			class="absolute top-1/2 left-1 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/90 text-foreground shadow-md backdrop-blur transition hover:bg-muted"
			aria-label="Scroll left"
		>
			<Icon name="chevron-left" size={18} />
		</button>
	{/if}

	{#if canScroll && !atEnd}
		<div
			class="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent"
		></div>
		<button
			type="button"
			onclick={() => nudge(1)}
			class="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/90 text-foreground shadow-md backdrop-blur transition hover:bg-muted"
			aria-label="Scroll right"
		>
			<Icon name="chevron-right" size={18} />
		</button>
	{/if}
</div>
