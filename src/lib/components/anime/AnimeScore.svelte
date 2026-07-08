<script lang="ts">
	import { formatPercentScore } from '$lib/anilist/score';
	import { scoreAccent } from '$lib/anilist/colors';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	let {
		score,
		size = 14,
		class: className
	}: { score: number | null | undefined; size?: number; class?: string } = $props();

	const accent = $derived(scoreAccent(score));
	const set = $derived(score != null && score > 0);
</script>

{#if set}
	<span
		class={cn('inline-flex items-center gap-1 font-semibold tabular-nums', accent.text, className)}
	>
		<Icon name="star" {size} class="fill-current opacity-80" />
		{formatPercentScore(score)}
	</span>
{:else}
	<span class={cn('text-muted-foreground/60', className)}>—</span>
{/if}
