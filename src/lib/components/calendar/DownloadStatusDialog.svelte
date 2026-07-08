<script lang="ts">
	/* Calendar episode download-status popup — a thin wrapper over the shared
	   EpisodeDownloadDetailsDialog that keeps the calendar's richer banner/cover
	   header. A calendar popup is always a single airing episode, so it passes one
	   episode number and the Next/Prev nav never shows. */
	import type { CalendarEpisode } from '$lib/calendar/enrich';
	import { timeLabel } from '$lib/calendar/datetime';
	import { airingRing } from '$lib/calendar/style';
	import {
		calendarShowAiringStatus,
		calendarShowDownloadStatus
	} from '$lib/stores/calendar-prefs.svelte';
	import { TONE_CHIP } from '$lib/tracked/status';
	import * as Dialog from '$lib/components/ui/dialog';
	import CoverTile from './CoverTile.svelte';
	import CoverageIcon from './CoverageIcon.svelte';
	import EpisodeTvdbLine from '$lib/components/tracked/EpisodeTvdbLine.svelte';
	import EpisodeDownloadDetailsDialog from '$lib/components/tracked/EpisodeDownloadDetailsDialog.svelte';
	import { cn } from '$lib/utils';

	let {
		episode,
		onClose
	}: {
		episode: CalendarEpisode | null;
		onClose: () => void;
	} = $props();

	const ring = $derived(
		episode
			? airingRing(episode.anime.status, calendarShowAiringStatus.current)
			: { kind: 'none' as const }
	);
	const showCoverage = $derived(calendarShowDownloadStatus.current);
</script>

<EpisodeDownloadDetailsDialog
	open={episode != null}
	trackedAnimeId={episode?.anime.tracked_anime_id ?? null}
	episodes={episode ? [episode.episode] : []}
	romajiTitle={episode?.anime.romaji_title ?? episode?.anime.english_title ?? null}
	headerOwnsMeta
	{onClose}
>
	{#snippet header({ code, absolute, titles, outer, loading, hasTorrents })}
		{#if episode}
			<!-- Header over a faint banner backdrop -->
			<div class="relative overflow-hidden">
				{#if episode.bannerUrl}
					<div
						class="absolute inset-0 scale-105 bg-cover bg-center opacity-15 blur-[3px]"
						style="background-image:url('{episode.bannerUrl}')"
					></div>
				{/if}
				<div class="relative flex gap-3 p-4">
					<CoverTile image={episode.coverUrl} {ring} class="h-20 w-14" />
					<div class="min-w-0 flex-1 pr-6">
						<Dialog.Title class="text-base leading-tight font-bold">
							{episode.animeTitle}
						</Dialog.Title>
						<Dialog.Description class="mt-0.5 text-xs text-muted-foreground">
							Episode {episode.episode}{#if episode.episodeTitle}
								· <span class="italic">{episode.episodeTitle}</span>{/if} · {timeLabel(
								episode.airingAt
							)}
						</Dialog.Description>

						{#if code || titles}
							<div class="mt-1.5">
								<EpisodeTvdbLine {code} {absolute} {titles} />
							</div>
						{/if}

						<div class="mt-2">
							{#if loading && !hasTorrents}
								{#if showCoverage && episode.coverage}
									<CoverageIcon coverage={episode.coverage} size={15} showLabel />
								{/if}
							{:else if outer.label}
								<span
									class={cn(
										'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
										TONE_CHIP[outer.tone]
									)}
								>
									{outer.label}
								</span>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}
	{/snippet}
</EpisodeDownloadDetailsDialog>
