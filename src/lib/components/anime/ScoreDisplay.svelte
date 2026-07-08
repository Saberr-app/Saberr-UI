<script lang="ts">
	import type { AnilistScoreFormat } from '$lib/api/types';
	import { SCORE_KIND, currentScoreFormat, formatScoreText, isScoreSet } from '$lib/anilist/score';
	import { userScoreAccent } from '$lib/anilist/colors';
	import { type SmileyValue } from '$lib/config/score-smileys';
	import Icon from '$lib/components/Icon.svelte';
	import ScoreSmiley from './ScoreSmiley.svelte';
	import { cn } from '$lib/utils';

	let {
		score,
		format = currentScoreFormat(),
		size = 16,
		class: className
	}: {
		score: number | null | undefined;
		format?: AnilistScoreFormat;
		size?: number;
		class?: string;
	} = $props();

	const kind = $derived(SCORE_KIND[format]);
	const accent = $derived(userScoreAccent(score, format));
	const set = $derived(isScoreSet(score));
</script>

{#if !set}
	<span class={cn('text-muted-foreground/60', className)}>—</span>
{:else if kind === 'stars'}
	<span class={cn('inline-flex items-center gap-0.5', className)} title={`${score}/5`}>
		{#each [1, 2, 3, 4, 5] as n (n)}
			<Icon
				name="star"
				{size}
				class={n <= (score ?? 0) ? cn('fill-current', accent.text) : 'text-muted-foreground/25'}
			/>
		{/each}
	</span>
{:else if kind === 'smiley'}
	<ScoreSmiley
		value={(score ?? 1) as SmileyValue}
		size={size + 4}
		class={cn(accent.text, className)}
	/>
{:else}
	<span
		class={cn('inline-flex items-center gap-1 font-semibold tabular-nums', accent.text, className)}
	>
		<Icon name="star" size={size - 2} class="fill-current opacity-80" />
		{formatScoreText(score, format)}
	</span>
{/if}
