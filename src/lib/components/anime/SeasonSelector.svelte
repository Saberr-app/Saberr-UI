<script lang="ts">
	import { untrack } from 'svelte';
	import type { AnilistAnimeSeason } from '$lib/api/types';
	import { ANILIST_ANIME_SEASONS } from '$lib/api/types';
	import { seasonLabel } from '$lib/anilist/enums';
	import { currentSeason, stepSeason } from '$lib/anilist/dates';
	import { SEASON_ACCENT } from '$lib/anilist/colors';
	import * as Popover from '$lib/components/ui/popover';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	let {
		season,
		year,
		onSelect
	}: {
		season: AnilistAnimeSeason;
		year: number;
		onSelect: (season: AnilistAnimeSeason, year: number) => void;
	} = $props();

	let open = $state(false);
	let viewYear = $state(untrack(() => year));

	// The actual current season (no 2-week look-ahead) — for the "Current" link
	// and the in-popover marker dot.
	const real = currentSeason(new Date(), 0);
	const isReal = (s: AnilistAnimeSeason, y: number) => s === real.season && y === real.year;

	const accent = $derived(SEASON_ACCENT[season]);

	function step(dir: 1 | -1) {
		const next = stepSeason(season, year, dir);
		onSelect(next.season, next.year);
	}
	function choose(s: AnilistAnimeSeason) {
		onSelect(s, viewYear);
		open = false;
	}
	function goCurrent() {
		onSelect(real.season, real.year);
	}
</script>

<div class="flex flex-col items-center gap-1">
	<div
		class="inline-flex items-stretch overflow-hidden rounded-full border border-border shadow-sm"
	>
		<button
			type="button"
			onclick={() => step(-1)}
			class="flex items-center border-r border-border px-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
			aria-label="Previous season"
		>
			<Icon name="chevron-left" size={16} />
		</button>

		<Popover.Root bind:open onOpenChange={(o) => o && (viewYear = year)}>
			<Popover.Trigger
				class={cn(
					'px-4 py-1.5 text-sm font-semibold transition-colors',
					accent.chip,
					'hover:brightness-105'
				)}
			>
				{seasonLabel(season)}
				{year}
			</Popover.Trigger>
			<Popover.Content class="w-64 p-3" align="center">
				<div class="mb-3 flex items-center justify-between">
					<button
						type="button"
						onclick={() => (viewYear -= 1)}
						class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
						aria-label="Previous year"
					>
						<Icon name="chevron-left" size={16} />
					</button>
					<span class="text-sm font-semibold">{viewYear}</span>
					<button
						type="button"
						onclick={() => (viewYear += 1)}
						class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
						aria-label="Next year"
					>
						<Icon name="chevron-right" size={16} />
					</button>
				</div>

				<div class="grid grid-cols-2 gap-2">
					{#each ANILIST_ANIME_SEASONS as s (s)}
						{@const selected = s === season && viewYear === year}
						<button
							type="button"
							onclick={() => choose(s)}
							class={cn(
								'relative rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
								selected
									? cn('border-transparent', SEASON_ACCENT[s].chip, 'ring-2', SEASON_ACCENT[s].ring)
									: 'border-border hover:bg-muted'
							)}
						>
							{seasonLabel(s)}
							{#if isReal(s, viewYear)}
								<span
									class={cn('absolute top-1 right-1 size-1.5 rounded-full', SEASON_ACCENT[s].dot)}
									title="Current season"
								></span>
							{/if}
						</button>
					{/each}
				</div>
			</Popover.Content>
		</Popover.Root>

		<button
			type="button"
			onclick={() => step(1)}
			class="flex items-center border-l border-border px-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
			aria-label="Next season"
		>
			<Icon name="chevron-right" size={16} />
		</button>
	</div>

	{#if !isReal(season, year)}
		<button
			type="button"
			onclick={goCurrent}
			class="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
		>
			Go to current
		</button>
	{/if}
</div>
