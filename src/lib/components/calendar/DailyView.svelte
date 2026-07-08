<script lang="ts">
	import type { CalendarEpisode } from '$lib/calendar/enrich';
	import type { CardSize } from '$lib/stores/calendar-prefs.svelte';
	import EpisodeCard from './EpisodeCard.svelte';
	import EpisodePopover from './EpisodePopover.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let {
		episodes,
		loading = false,
		cardSize,
		onDownloadStatus,
		onEditEntry,
		onTrack
	}: {
		episodes: CalendarEpisode[];
		loading?: boolean;
		cardSize: CardSize;
		onDownloadStatus: (ep: CalendarEpisode) => void;
		onEditEntry: (ep: CalendarEpisode) => void;
		onTrack: (ep: CalendarEpisode) => void;
	} = $props();
</script>

<div class="mx-auto w-full max-w-2xl space-y-2">
	{#if loading}
		{#each Array.from({ length: 6 }, (_, i) => i) as i (i)}
			<div class="h-16 animate-pulse rounded-lg border border-border bg-muted/40"></div>
		{/each}
	{:else if episodes.length === 0}
		<div
			class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground"
		>
			<Icon name="calendar" size={28} />
			<p class="text-sm">Nothing airing this day in the selected scope.</p>
		</div>
	{:else}
		{#each episodes as ep (ep.id)}
			<EpisodePopover episode={ep} {onDownloadStatus} {onEditEntry} {onTrack}>
				{#snippet trigger(props)}
					<EpisodeCard episode={ep} size={cardSize} orientation="row" {...props} />
				{/snippet}
			</EpisodePopover>
		{/each}
	{/if}
</div>
