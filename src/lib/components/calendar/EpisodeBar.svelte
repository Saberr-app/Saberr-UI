<script lang="ts">
	import type { CalendarEpisode } from '$lib/calendar/enrich';
	import { FORMAT_MINIMAL_LABELS } from '$lib/anilist/enums';
	import { AIRING_BAR, markerGradient, markerOf } from '$lib/calendar/style';
	import {
		calendarShowAiringStatus,
		calendarShowDownloadStatus,
		calendarShowEpisodeMarkers
	} from '$lib/stores/calendar-prefs.svelte';
	import { cn } from '$lib/utils';
	import Icon from '$lib/components/Icon.svelte';
	import CoverageIcon from './CoverageIcon.svelte';

	let {
		episode,
		...rest
	}: {
		episode: CalendarEpisode;
		/** Popover trigger props, spread onto the root button. */
		[key: string]: unknown;
	} = $props();

	const dim = $derived(episode.isPast);
	const barClass = $derived(
		calendarShowAiringStatus.current ? AIRING_BAR[episode.anime.status] : 'bg-muted-foreground/30'
	);
	const showCoverage = $derived(calendarShowDownloadStatus.current);
	const marker = $derived(calendarShowEpisodeMarkers.current ? markerOf(episode) : null);
	const minimalLabel = $derived(
		episode.formatTag ? FORMAT_MINIMAL_LABELS[episode.formatTag] : null
	);
</script>

<button
	{...rest}
	type="button"
	title={`${episode.animeTitle} · Episode ${episode.episode}`}
	class={cn(
		'relative isolate flex w-full items-stretch gap-1.5 overflow-hidden rounded-sm py-0.5 pr-1 pl-1 text-left transition hover:bg-muted',
		dim && 'opacity-60 hover:opacity-100'
	)}
>
	{#if marker}
		<span
			class="pointer-events-none absolute inset-0 -z-10 opacity-[0.13]"
			style="background:{markerGradient(marker)}"
		></span>
	{/if}
	<span class={cn('w-1 shrink-0 rounded-full', barClass)}></span>
	<span class="min-w-0 flex-1 self-center truncate text-[0.7rem] font-semibold text-foreground/90">
		{episode.animeTitle}
	</span>
	<span class="shrink-0 self-center text-[0.7rem] font-semibold text-muted-foreground">
		{#if episode.formatTag === 'MUSIC'}
			<Icon name="music" size={11} class="inline" />
		{:else if minimalLabel}
			{minimalLabel}
		{:else}
			E{episode.episode}
		{/if}
	</span>
	{#if showCoverage && episode.coverage}
		<CoverageIcon coverage={episode.coverage} size={12} class="shrink-0 self-center" />
	{/if}
</button>
