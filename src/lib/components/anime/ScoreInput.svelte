<script lang="ts">
	import type { AnilistScoreFormat } from '$lib/api/types';
	import { SCORE_KIND, SCORE_MAX, SCORE_STEP, currentScoreFormat } from '$lib/anilist/score';
	import { userScoreAccent } from '$lib/anilist/colors';
	import { SMILEY_LABELS, type SmileyValue } from '$lib/config/score-smileys';
	import Icon from '$lib/components/Icon.svelte';
	import ScoreSmiley from './ScoreSmiley.svelte';
	import NumberStepper from './NumberStepper.svelte';
	import { cn } from '$lib/utils';

	let {
		score = $bindable(0),
		format = currentScoreFormat(),
		numberClass
	}: { score?: number; format?: AnilistScoreFormat; numberClass?: string } = $props();

	const kind = $derived(SCORE_KIND[format]);
	const max = $derived(SCORE_MAX[format]);
	const accent = $derived(userScoreAccent(score, format));

	let hover = $state(0);
	const starsFilled = $derived(hover || score);

	function pick(n: number) {
		score = score === n ? 0 : n; // click the active value again to clear
	}
</script>

{#if kind === 'stars'}
	<div
		class="inline-flex items-center gap-1"
		role="group"
		aria-label="Score"
		onmouseleave={() => (hover = 0)}
	>
		{#each [1, 2, 3, 4, 5] as n (n)}
			<button
				type="button"
				class="rounded p-0.5 transition-transform hover:scale-110"
				aria-label={`${n} star${n > 1 ? 's' : ''}`}
				onmouseenter={() => (hover = n)}
				onclick={() => pick(n)}
			>
				<Icon
					name="star"
					size={26}
					class={n <= starsFilled ? cn('fill-current', accent.text) : 'text-muted-foreground/30'}
				/>
			</button>
		{/each}
		{#if score > 0}
			<button
				type="button"
				class="ml-1 text-xs text-muted-foreground hover:text-foreground"
				onclick={() => (score = 0)}
			>
				Clear
			</button>
		{/if}
	</div>
{:else if kind === 'smiley'}
	<div class="inline-flex items-center gap-2" aria-label="Score">
		{#each [1, 2, 3] as n (n)}
			{@const active = score === n}
			<button
				type="button"
				class={cn(
					'rounded-full p-1 transition-all hover:scale-110',
					active
						? userScoreAccent(n, format).text
						: 'text-muted-foreground/40 hover:text-muted-foreground'
				)}
				aria-label={SMILEY_LABELS[n as SmileyValue]}
				title={SMILEY_LABELS[n as SmileyValue]}
				onclick={() => pick(n)}
			>
				<ScoreSmiley value={n as SmileyValue} size={30} />
			</button>
		{/each}
	</div>
{:else}
	<div class="inline-flex items-center gap-2">
		<NumberStepper
			value={score}
			min={0}
			{max}
			step={SCORE_STEP[format]}
			decimals={format === 'POINT_10_DECIMAL' ? 1 : 0}
			emptyAtZero
			onChange={(n) => (score = n ?? 0)}
			ariaLabel="Score"
			class={numberClass}
		/>
		<span class="text-sm text-muted-foreground">/ {max}</span>
	</div>
{/if}
