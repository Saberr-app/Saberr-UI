<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { abbreviateCount } from '$lib/utils/number';
	import { cn } from '$lib/utils';

	let {
		count,
		iconSide = 'left',
		size = 13,
		class: className
	}: {
		count: number | null | undefined;
		/** `left` = "👤 5K" (card), `right` = "5K 👤" (list). */
		iconSide?: 'left' | 'right';
		size?: number;
		class?: string;
	} = $props();
</script>

{#if count != null}
	<span
		class={cn('inline-flex items-center gap-1 text-muted-foreground tabular-nums', className)}
		title="{count.toLocaleString()} members"
	>
		{#if iconSide === 'left'}
			<Icon name="user" {size} class="opacity-70" />
			{abbreviateCount(count)}
		{:else}
			{abbreviateCount(count)}
			<Icon name="user" {size} class="opacity-70" />
		{/if}
	</span>
{/if}
