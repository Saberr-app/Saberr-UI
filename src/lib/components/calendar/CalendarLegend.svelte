<script lang="ts">
	import type { AnilistAnimeStatus } from '$lib/api/types';
	import { AIRING_BAR, MARKER_LEGEND, markerGradient } from '$lib/calendar/style';
	import { AIRING_STATUS_LABELS } from '$lib/anilist/enums';
	import { COVERAGE_LEGEND } from '$lib/calendar/coverage';
	import {
		calendarShowAiringStatus,
		calendarShowDownloadStatus,
		calendarShowEpisodeMarkers
	} from '$lib/stores/calendar-prefs.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	// Only the statuses that actually show up on the calendar's airing items.
	const AIRING: AnilistAnimeStatus[] = ['RELEASING', 'FINISHED', 'NOT_YET_RELEASED'];

	const showAiring = $derived(calendarShowAiringStatus.current);
	const showDownload = $derived(calendarShowDownloadStatus.current);
	const showMarkers = $derived(calendarShowEpisodeMarkers.current);
	const anyRow = $derived(showAiring || showDownload || showMarkers);
</script>

{#if anyRow}
	<div class="flex flex-col gap-2 rounded-lg border border-border bg-card/40 px-4 py-3 text-xs">
		{#if showAiring}
			<div class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
				<span class="font-semibold text-muted-foreground">Airing status</span>
				{#each AIRING as status (status)}
					<span class="inline-flex items-center gap-1.5">
						<span class={cn('h-3 w-1 rounded-full', AIRING_BAR[status])}></span>
						<span class="text-muted-foreground">{AIRING_STATUS_LABELS[status]}</span>
					</span>
				{/each}
			</div>
		{/if}

		{#if showMarkers}
			<div class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
				<span class="font-semibold text-muted-foreground">Episode</span>
				{#each MARKER_LEGEND as m (m.kind)}
					<span class="inline-flex items-center gap-1.5">
						<span class="h-3 w-5 rounded-[2px]" style="background:{markerGradient(m.kind)}"></span>
						<span class="text-muted-foreground">{m.label}</span>
					</span>
				{/each}
			</div>
		{/if}

		{#if showDownload}
			<div class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
				<span class="font-semibold text-muted-foreground">Download status</span>
				{#each COVERAGE_LEGEND as c (c.kind)}
					<span class={cn('inline-flex items-center gap-1.5', c.textClass)}>
						<Icon name={c.icon} size={14} />
						<span>{c.label}</span>
					</span>
				{/each}
			</div>
		{/if}
	</div>
{/if}
