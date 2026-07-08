<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import CalendarToolbar from '$lib/components/calendar/CalendarToolbar.svelte';
	import DailyView from '$lib/components/calendar/DailyView.svelte';
	import WeeklyView from '$lib/components/calendar/WeeklyView.svelte';
	import MonthlyView from '$lib/components/calendar/MonthlyView.svelte';
	import CalendarLegend from '$lib/components/calendar/CalendarLegend.svelte';
	import DownloadStatusDialog from '$lib/components/calendar/DownloadStatusDialog.svelte';
	import EditListEntryDialog from '$lib/components/anime/EditListEntryDialog.svelte';
	import TrackDialog from '$lib/components/tracked/TrackDialog.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { getAnime, getUserAnimeEntry } from '$lib/api/anime';
	import { getTrackedAnime } from '$lib/api/tracked';
	import { ApiError } from '$lib/api/errors';
	import { summaryFromAnime, type TrackAnimeSummary } from '$lib/tracked/draft';
	import type {
		AnilistAnimeStatus,
		TrackedAnimeItem,
		UserAnimeListItem,
		UserEntry
	} from '$lib/api/types';
	import { type CalendarEpisode, sortEpisodes } from '$lib/calendar/enrich';
	import { schedule } from '$lib/stores/schedule.svelte';
	import {
		calendarAnchor,
		calendarCardSize,
		calendarFilters,
		calendarFirstDay,
		calendarScope,
		calendarSort,
		calendarView
	} from '$lib/stores/calendar-prefs.svelte';
	import { clock } from '$lib/stores/clock.svelte';
	import { stepPeriod, toScheduleParam } from '$lib/calendar/datetime';
	import { swipe } from '$lib/calendar/swipe';

	// Seed from the session-scoped store (restores the viewed period); mirror changes back.
	let anchor = $state(calendarAnchor.current);
	$effect(() => {
		calendarAnchor.current = anchor;
	});

	// Discovery scopes pull a lot from AniList — force-refreshing them is rate-limit-risky.
	const HEAVY_SCOPES = new Set(['current_season', 'next_season', 'all_airing']);

	onMount(() => {
		clock.start();
		calendarFilters.premieresOnly = false; // page-scoped: a fresh visit starts unfiltered
		void schedule.ensureScopeSeeded();
		schedule.startPolling();
	});
	onDestroy(() => schedule.stopPolling());

	// Single source of truth: (re)load whenever view / period / first-day / scope change.
	$effect(() => {
		schedule.show(calendarView.current, anchor, calendarFirstDay.current, calendarScope.current);
	});

	const showSkeleton = $derived(!schedule.loaded && schedule.loading);
	// Key the fade on the PERIOD, not the exact day — re-picking a day in the same week/month shouldn't remount.
	const viewKey = $derived(
		`${calendarView.current}|${toScheduleParam(calendarView.current, anchor, calendarFirstDay.current)}`
	);
	const episodes = $derived.by(() => {
		const sorted = sortEpisodes(schedule.episodes, calendarSort.current);
		return calendarFilters.premieresOnly ? sorted.filter((e) => e.isFirst) : sorted;
	});

	let dlEpisode = $state<CalendarEpisode | null>(null);
	let confirmRefresh = $state(false);

	// Edit/Add list-entry dialog. Fetches the full entry (episode count + current entry) before opening;
	// `user_list_status` decides Add (entry: null) vs Edit.
	let editOpen = $state(false);
	let editTarget = $state<{
		anilistId: number;
		title: string;
		episodes: number | null;
		airingStatus: AnilistAnimeStatus;
		entry: UserEntry | null;
	} | null>(null);

	async function openEdit(ep: CalendarEpisode) {
		const onList = ep.anime.user_list_status != null;
		// Adding: not on the list yet → the GET 404s; fetch silently and treat the miss as "no entry".
		// Editing: it should exist, so let errors surface.
		let item: UserAnimeListItem | null = null;
		try {
			item = await getUserAnimeEntry(ep.anilistId, onList);
		} catch (e) {
			if (onList || !(e instanceof ApiError) || e.status !== 404) throw e;
		}
		editTarget = {
			anilistId: ep.anilistId,
			title: ep.animeTitle,
			episodes: item?.anime?.episodes ?? null,
			airingStatus: ep.anime.status,
			entry: onList ? item : null
		};
		editOpen = true;
	}

	// Track/Edit dialog. Tracked → fetch full settings to edit; not tracked → fetch the full anime to
	// seed a create summary (the schedule shape is too slim). TrackDialog broadcasts the new id on save.
	let trackOpen = $state(false);
	let trackSummary = $state<TrackAnimeSummary | null>(null);
	let trackItem = $state<TrackedAnimeItem | null>(null);

	async function openTrack(ep: CalendarEpisode) {
		if (ep.anime.tracked_anime_id != null) {
			trackItem = await getTrackedAnime(ep.anime.tracked_anime_id, false, false);
			trackSummary = null;
		} else {
			trackItem = null;
			trackSummary = summaryFromAnime(await getAnime(ep.anilistId));
		}
		trackOpen = true;
	}

	function pickDay(day: Date) {
		anchor = day;
		calendarView.current = 'day';
	}
	function go(dir: -1 | 1) {
		anchor = stepPeriod(calendarView.current, anchor, dir);
	}
	function requestRefresh() {
		if (calendarScope.current.some((s) => HEAVY_SCOPES.has(s))) confirmRefresh = true;
		else schedule.refresh();
	}
</script>

<div class="flex flex-col gap-5">
	<PageHeader title="Calendar" icon="calendar" />

	<CalendarToolbar
		{anchor}
		loading={schedule.loading}
		onAnchor={(d) => (anchor = d)}
		onRefresh={requestRefresh}
	/>

	{#if schedule.slowLoading}
		<div
			class="flex items-center justify-center gap-2 rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-sm text-info"
		>
			<Icon name="spinner" size={15} class="animate-spin" />
			Fetching data from AniList, this could take a moment…
		</div>
	{/if}

	{#if schedule.loadFailed}
		<div
			class="flex flex-col items-center gap-2 rounded-xl border border-border py-16 text-center text-muted-foreground"
		>
			<Icon name="alert-triangle" size={28} />
			<p class="text-sm">Couldn't load the schedule.</p>
			<button
				type="button"
				onclick={() => schedule.refresh()}
				class="text-sm font-medium text-info hover:underline"
			>
				Try again
			</button>
		</div>
	{:else}
		<div
			use:swipe={{
				onLeft: () => go(1),
				onRight: () => go(-1),
				enabled: calendarView.current !== 'month'
			}}
		>
			{#key viewKey}
				<div in:fade={{ duration: 120 }}>
					{#if calendarView.current === 'day'}
						<DailyView
							{episodes}
							loading={showSkeleton}
							cardSize={calendarCardSize.current}
							onDownloadStatus={(ep) => (dlEpisode = ep)}
							onEditEntry={(ep) => void openEdit(ep)}
							onTrack={(ep) => void openTrack(ep)}
						/>
					{:else if calendarView.current === 'week'}
						<WeeklyView
							{episodes}
							loading={showSkeleton}
							{anchor}
							firstDay={calendarFirstDay.current}
							cardSize={calendarCardSize.current}
							onDownloadStatus={(ep) => (dlEpisode = ep)}
							onEditEntry={(ep) => void openEdit(ep)}
							onTrack={(ep) => void openTrack(ep)}
						/>
					{:else}
						<MonthlyView
							{episodes}
							loading={showSkeleton}
							{anchor}
							firstDay={calendarFirstDay.current}
							onPickDay={pickDay}
							onDownloadStatus={(ep) => (dlEpisode = ep)}
							onEditEntry={(ep) => void openEdit(ep)}
							onTrack={(ep) => void openTrack(ep)}
						/>
					{/if}
				</div>
			{/key}
		</div>

		<CalendarLegend />
	{/if}
</div>

<DownloadStatusDialog episode={dlEpisode} onClose={() => (dlEpisode = null)} />

<TrackDialog bind:open={trackOpen} summary={trackSummary} item={trackItem} />

{#if editTarget}
	<EditListEntryDialog
		bind:open={editOpen}
		anilistId={editTarget.anilistId}
		title={editTarget.title}
		episodes={editTarget.episodes}
		airingStatus={editTarget.airingStatus}
		entry={editTarget.entry}
	/>
{/if}

<ConfirmDialog
	bind:open={confirmRefresh}
	title="Force refresh a large scope?"
	description="Force refreshing with a season or all-airing scope refetches a large amount of data from AniList and may hit a rate limit. Consider reducing the scope first."
	confirmLabel="Refresh anyway"
	onConfirm={() => schedule.refresh()}
/>
