<script lang="ts">
	import type { CalendarEpisode } from '$lib/calendar/enrich';
	import {
		calendarShowAiringStatus,
		calendarShowDownloadStatus,
		calendarShowEpisodeMarkers,
		type CardSize
	} from '$lib/stores/calendar-prefs.svelte';
	import { WATCH_STATUS_ACCENT } from '$lib/anilist/colors';
	import { ANILIST_STATUS_LABELS } from '$lib/anilist/entry';
	import { FORMAT_LABELS } from '$lib/anilist/enums';
	import { timeLabel } from '$lib/calendar/datetime';
	import { airingRing, markerGradient, markerOf } from '$lib/calendar/style';
	import { cn } from '$lib/utils';
	import CoverTile from './CoverTile.svelte';
	import CoverageIcon from './CoverageIcon.svelte';

	let {
		episode,
		size,
		orientation = 'row',
		...rest
	}: {
		episode: CalendarEpisode;
		size: CardSize;
		/** Full-card layout: horizontal (daily) vs stacked (narrow weekly column). */
		orientation?: 'row' | 'stack';
		/** Popover trigger props, spread onto the root button. */
		[key: string]: unknown;
	} = $props();

	const anime = $derived(episode.anime);
	const userStatus = $derived(anime.user_list_status);
	const userAccent = $derived(userStatus ? WATCH_STATUS_ACCENT[userStatus] : null);
	const time = $derived(timeLabel(episode.airingAt));

	const ring = $derived(airingRing(anime.status, calendarShowAiringStatus.current));
	const showCoverage = $derived(calendarShowDownloadStatus.current);
	const marker = $derived(calendarShowEpisodeMarkers.current ? markerOf(episode) : null);
	// Single-release formats (Movie/Special/OVA/ONA/Music) read as their label, not "Episode 1".
	const formatLabel = $derived(episode.formatTag ? FORMAT_LABELS[episode.formatTag] : null);

	// Dim every already-aired episode (no exceptions — past is past).
	const dim = $derived(episode.isPast);
</script>

{#snippet banner()}
	{#if episode.bannerUrl}
		<div
			class="absolute inset-0 scale-105 bg-cover bg-center opacity-[0.1] blur-[2px]"
			style="background-image:url('{episode.bannerUrl}')"
		></div>
	{/if}
{/snippet}

{#snippet markerTint()}
	{#if marker}
		<div class="absolute inset-0 opacity-[0.13]" style="background:{markerGradient(marker)}"></div>
	{/if}
{/snippet}

{#snippet userChip()}
	{#if userStatus && userAccent}
		<span
			class={cn(
				'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold',
				userAccent.chip
			)}
		>
			<span class={cn('size-1.5 rounded-full', userAccent.dot)}></span>
			{ANILIST_STATUS_LABELS[userStatus] ?? userStatus}
		</span>
	{/if}
{/snippet}

<button
	{...rest}
	type="button"
	class={cn(
		'group relative block w-full overflow-hidden rounded-lg border border-border bg-card text-left transition hover:bg-muted/40',
		dim && 'opacity-60 hover:opacity-100'
	)}
>
	{@render banner()}
	{@render markerTint()}

	{#if size === 'compact'}
		<div class="relative flex items-center gap-2 p-1.5">
			<CoverTile image={episode.coverUrl} {ring} class="h-8 w-6" />
			<div class="min-w-0 flex-1">
				<div class="truncate text-xs font-semibold text-foreground">{episode.animeTitle}</div>
				<div class="truncate text-[0.65rem] font-medium text-muted-foreground">
					{time} · {#if formatLabel}{formatLabel}{:else}Ep {episode.episode}{/if}
				</div>
			</div>
			{#if showCoverage && episode.coverage}
				<CoverageIcon coverage={episode.coverage} size={14} class="shrink-0" />
			{/if}
		</div>
	{:else if orientation === 'stack'}
		<!-- Full, stacked (narrow weekly column) -->
		<div class="relative p-2">
			<div class="flex gap-2">
				<CoverTile image={episode.coverUrl} {ring} class="h-12 w-9" />
				<div class="min-w-0 flex-1">
					<div class="line-clamp-2 text-xs leading-tight font-semibold text-foreground">
						{episode.animeTitle}
					</div>
					<div class="mt-0.5 text-[0.65rem] font-semibold text-muted-foreground">
						{#if formatLabel}{formatLabel}{:else}Episode {episode.episode}{/if}
					</div>
				</div>
			</div>
			<div class="mt-2 flex items-center gap-1.5 border-t border-border pt-1.5">
				{@render userChip()}
				<span class="text-[0.65rem] font-semibold text-muted-foreground">{time}</span>
				{#if showCoverage && episode.coverage}
					<CoverageIcon coverage={episode.coverage} size={14} class="ml-auto shrink-0" />
				{/if}
			</div>
		</div>
	{:else}
		<!-- Full, horizontal (daily) -->
		<div class="relative flex items-center gap-3 p-2.5">
			<CoverTile image={episode.coverUrl} {ring} class="h-14 w-10" />
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-2">
					<span class="text-xs font-semibold text-muted-foreground">{time}</span>
					{@render userChip()}
				</div>
				<div class="mt-0.5 line-clamp-1 text-sm font-semibold text-foreground">
					{episode.animeTitle}
				</div>
				<div class="line-clamp-1 text-xs font-medium text-muted-foreground">
					{#if formatLabel}{formatLabel}{:else}Episode {episode.episode}{/if}{#if episode.episodeTitle}
						· <span class="italic">{episode.episodeTitle}</span>{/if}
				</div>
			</div>
			{#if showCoverage && episode.coverage}
				<CoverageIcon
					coverage={episode.coverage}
					size={18}
					showLabel
					class="w-16 shrink-0 flex-col justify-center text-center"
				/>
			{/if}
		</div>
	{/if}
</button>
