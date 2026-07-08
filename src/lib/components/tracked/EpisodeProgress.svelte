<script lang="ts">
	import type { EpisodeStats } from '$lib/api/types';
	import type { IconName } from '$lib/config/icons';
	import { cn } from '$lib/utils';
	import Icon from '$lib/components/Icon.svelte';

	// 4-segment coverage bar over the inclusive range [fromEpisode, latest]: processed (green) ·
	// downloading (striped blue) · missing (amber) · failed (striped red, last). latest===0 → "No
	// episodes yet"; latest===null → unknown range (counts + a " ? " tail). The non-processed buckets
	// also surface as icon+count combos, placed by `placement` ('below' the bar, or 'beside' it).
	let {
		stats,
		fromEpisode,
		placement = 'beside',
		class: className
	}: {
		stats: EpisodeStats;
		fromEpisode: number;
		placement?: 'below' | 'beside';
		class?: string;
	} = $props();

	const latest = $derived(stats.latest_known_episode_number);
	const processed = $derived(stats.processed_episode_count);
	const downloading = $derived(stats.downloading_episode_count);
	const failed = $derived(stats.failed_episode_count);

	const noEpisodes = $derived(latest === 0);
	const unknown = $derived(latest == null);

	// Range size (inclusive); missing = range minus the three known buckets.
	const total = $derived(latest != null ? Math.max(0, latest - fromEpisode + 1) : 0);
	const missing = $derived(Math.max(0, total - processed - downloading - failed));

	// Non-zero buckets, in display order, as icon + count combos (zeros omitted).
	type Chip = { icon: IconName; count: number; label: string; class: string };
	const chips = $derived.by<Chip[]>(() => {
		const out: Chip[] = [];
		if (processed > 0)
			out.push({
				icon: 'circle-check',
				count: processed,
				label: 'imported',
				class: 'text-success'
			});
		if (downloading > 0)
			out.push({
				icon: 'circle-download',
				count: downloading,
				label: 'downloading',
				class: 'text-info'
			});
		if (!unknown && missing > 0)
			out.push({ icon: 'circle-help', count: missing, label: 'missing', class: 'text-missing' });
		if (failed > 0)
			out.push({ icon: 'circle-x', count: failed, label: 'failed', class: 'text-destructive' });
		return out;
	});

	// Show the combos whenever any bucket has a count (or the range is unknown).
	const showCombos = $derived(chips.length > 0 || unknown);

	// Hover hint: same content as the combos, zeros hidden, "missing" wording.
	const summary = $derived.by(() => {
		if (noEpisodes) return 'No episodes have aired yet';
		const parts: string[] = [];
		if (processed > 0) parts.push(`${processed} imported`);
		if (downloading > 0) parts.push(`${downloading} downloading`);
		if (!unknown && missing > 0) parts.push(`${missing} missing`);
		if (failed > 0) parts.push(`${failed} failed`);
		if (unknown) parts.push('latest episode unknown');
		return parts.length ? parts.join(' · ') : 'All episodes imported';
	});
</script>

{#snippet bars()}
	{#if processed > 0}<div
			class="bg-success opacity-65 dark:opacity-100"
			style="flex:{processed}"
		></div>{/if}
	{#if downloading > 0}<div
			class="bg-info opacity-65 dark:opacity-100"
			style="flex:{downloading}; background-image: repeating-linear-gradient(45deg, transparent 0 1.5px, color-mix(in oklab, var(--info), #000 40%) 1.5px 3px)"
		></div>{/if}
	{#if unknown}
		<div
			class="flex shrink-0 items-center justify-center px-1.5 text-[0.6rem] leading-none font-semibold text-muted-foreground"
		>
			?
		</div>
	{:else if missing > 0}
		<div class="bg-missing opacity-65 dark:opacity-100" style="flex:{missing}"></div>
	{/if}
	{#if failed > 0}<div
			class="bg-destructive opacity-65 dark:opacity-100"
			style="flex:{failed}; background-image: repeating-linear-gradient(45deg, transparent 0 1.5px, color-mix(in oklab, var(--destructive), #000 40%) 1.5px 3px)"
		></div>{/if}
{/snippet}

{#snippet combos()}
	{#each chips as chip (chip.label)}
		<span
			class={cn('inline-flex items-center gap-0.5 tabular-nums', chip.class)}
			title="{chip.count} {chip.label}"
		>
			<Icon name={chip.icon} size={12} />{chip.count}
		</span>
	{/each}
	{#if unknown}
		<span class="inline-flex items-center gap-0.5 text-muted-foreground" title={summary}>
			<Icon name="circle-help" size={12} />?
		</span>
	{/if}
{/snippet}

{#if noEpisodes}
	<div
		title={summary}
		class={cn(
			'flex h-3.5 w-full items-center justify-center rounded-full bg-muted px-2 text-[0.6rem] leading-none font-medium whitespace-nowrap text-muted-foreground',
			className
		)}
	>
		No episodes yet
	</div>
{:else if placement === 'below'}
	<div class={cn('flex flex-col gap-1', className)}>
		<div title={summary} class="flex h-3.5 w-full overflow-hidden rounded-full bg-muted">
			{@render bars()}
		</div>
		{#if showCombos}
			<div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.65rem] leading-none">
				{@render combos()}
			</div>
		{/if}
	</div>
{:else}
	<div class={cn('flex items-center gap-2', className)}>
		<div title={summary} class="flex h-3.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
			{@render bars()}
		</div>
		{#if showCombos}
			<div class="flex shrink-0 items-center gap-x-2 text-[0.65rem] leading-none">
				{@render combos()}
			</div>
		{/if}
	</div>
{/if}
