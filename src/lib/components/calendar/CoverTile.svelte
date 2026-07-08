<script lang="ts">
	import { ringBackground, type RingStyle } from '$lib/calendar/style';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	let {
		image,
		ring,
		class: className
	}: {
		image: string | null;
		ring: RingStyle;
		/** Sizing utilities, e.g. "h-14 w-10". */
		class?: string;
	} = $props();

	// Solid airing-status ring painted as an inline border; `none` → hairline fallback.
	const paint = $derived(ringBackground(ring));
</script>

{#snippet inner()}
	{#if image}
		<img src={image} alt="" class="h-full w-full object-cover" loading="lazy" decoding="async" />
	{:else}
		<div class="flex h-full w-full items-center justify-center text-muted-foreground/40">
			<Icon name="play" size={14} />
		</div>
	{/if}
{/snippet}

{#if paint}
	<div
		class={cn('relative shrink-0 overflow-hidden rounded-[3px]', className)}
		style="background:{paint};padding:2px"
	>
		<!-- bg layer = the offset gap between the painted ring and the image -->
		<div class="h-full w-full rounded-[2px] bg-background p-[2px]">
			<div class="h-full w-full overflow-hidden rounded-[1px] bg-muted">
				{@render inner()}
			</div>
		</div>
	</div>
{:else}
	<div
		class={cn(
			'relative shrink-0 overflow-hidden rounded-[3px] border border-border bg-muted',
			className
		)}
	>
		{@render inner()}
	</div>
{/if}
