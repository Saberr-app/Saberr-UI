<script lang="ts">
	import type { CalendarEpisode } from '$lib/calendar/enrich';
	import type { CardSize } from '$lib/stores/calendar-prefs.svelte';
	import { groupByDay } from '$lib/calendar/enrich';
	import { daysOfWeek, isToday, localDateKey } from '$lib/calendar/datetime';
	import { cn } from '$lib/utils';
	import EpisodeCard from './EpisodeCard.svelte';
	import EpisodePopover from './EpisodePopover.svelte';

	let {
		episodes,
		loading = false,
		anchor,
		firstDay,
		cardSize,
		onDownloadStatus,
		onEditEntry,
		onTrack
	}: {
		episodes: CalendarEpisode[];
		loading?: boolean;
		anchor: Date;
		firstDay: number;
		cardSize: CardSize;
		onDownloadStatus: (ep: CalendarEpisode) => void;
		onEditEntry: (ep: CalendarEpisode) => void;
		onTrack: (ep: CalendarEpisode) => void;
	} = $props();

	const days = $derived(daysOfWeek(anchor, firstDay));
	const byDay = $derived(groupByDay(episodes));
	const dowFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

	function epsFor(day: Date): CalendarEpisode[] {
		return byDay[localDateKey(day)] ?? [];
	}
</script>

<!-- Desktop: 7 fluid equal columns (collapse to stacked sooner, at xl) -->
<div class="hidden grid-cols-7 gap-2 xl:grid">
	{#each days as day (day.getTime())}
		{@const eps = epsFor(day)}
		<div class="min-w-0 rounded-lg">
			<div class="flex items-baseline justify-between border-b border-border px-2 py-1.5">
				<span class={cn('text-xs font-semibold', isToday(day) ? 'text-info' : 'text-foreground')}>
					{dowFmt.format(day)}
				</span>
				<span class={cn('text-xs', isToday(day) ? 'font-bold text-info' : 'text-muted-foreground')}>
					{day.getDate()}
				</span>
			</div>
			<div class="flex flex-col gap-2 p-1.5">
				{#if loading}
					{#each Array.from({ length: 2 }, (_, i) => i) as i (i)}
						<div class="h-12 animate-pulse rounded-lg border border-border bg-muted/40"></div>
					{/each}
				{:else}
					{#each eps as ep (ep.id)}
						<EpisodePopover episode={ep} {onDownloadStatus} {onEditEntry} {onTrack}>
							{#snippet trigger(props)}
								<EpisodeCard episode={ep} size={cardSize} orientation="stack" {...props} />
							{/snippet}
						</EpisodePopover>
					{/each}
				{/if}
			</div>
		</div>
	{/each}
</div>

<!-- Narrow: stacked day sections (skip empty days) -->
<div class="space-y-4 xl:hidden">
	{#each days as day (day.getTime())}
		{@const eps = epsFor(day)}
		{#if loading || eps.length}
			<section>
				<h3
					class={cn(
						'mb-2 flex items-baseline gap-2 text-sm font-semibold',
						isToday(day) && 'text-info'
					)}
				>
					{dowFmt.format(day)}
					<span class="text-muted-foreground">{day.getDate()}</span>
				</h3>
				<div class="space-y-2">
					{#if loading}
						{#each Array.from({ length: 2 }, (_, i) => i) as i (i)}
							<div class="h-16 animate-pulse rounded-lg border border-border bg-muted/40"></div>
						{/each}
					{:else}
						{#each eps as ep (ep.id)}
							<EpisodePopover episode={ep} {onDownloadStatus} {onEditEntry} {onTrack}>
								{#snippet trigger(props)}
									<EpisodeCard episode={ep} size={cardSize} orientation="row" {...props} />
								{/snippet}
							</EpisodePopover>
						{/each}
					{/if}
				</div>
			</section>
		{/if}
	{/each}
</div>
