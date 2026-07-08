<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import type {
		TrackedAnimeItem,
		TrackedAnimeItemEpisode,
		TrackedAnimeItemWithEpisodes
	} from '$lib/api/types';
	import { getTrackedAnime, listTrackedAnimeEpisodes } from '$lib/api/tracked';
	import { sortEpisodes, trackedEpisodeRange } from '$lib/tracked/episode';
	import { noEnabledGroups } from '$lib/tracked/release-groups';
	import { isDefaultProfile, joinShowPath } from '$lib/tracked/draft';
	import { tracked } from '$lib/stores/tracked.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { pageTitleOverride } from '$lib/stores/page-title.svelte';
	import { displayTitle, secondaryTitle } from '$lib/anilist/titles';
	import { formatLabel, seasonYearLabel } from '$lib/anilist/enums';
	import { coverImage } from '$lib/anilist/media';
	import {
		anilistAnimeUrl,
		malAnimeUrl,
		tvdbSeriesUrl,
		ANILIST_LOGO,
		MAL_LOGO,
		TVDB_LOGO
	} from '$lib/config/external';
	import { mode } from 'mode-watcher';
	import Icon from '$lib/components/Icon.svelte';
	import { Button } from '$lib/components/ui/button';
	import StructuringBadge from '$lib/components/settings/StructuringBadge.svelte';
	import TrackDialog from '$lib/components/tracked/TrackDialog.svelte';
	import TrackedEpisodeRow from '$lib/components/tracked/TrackedEpisodeRow.svelte';
	import EpisodeProgress from '$lib/components/tracked/EpisodeProgress.svelte';

	const EPISODE_PAGE = 50;
	const id = $derived(Number(page.params.id));

	let item = $state<TrackedAnimeItemWithEpisodes | null>(null);
	let episodes = $state<TrackedAnimeItemEpisode[]>([]);
	let loading = $state(true);
	let notFound = $state(false);
	let refreshing = $state(false);

	let exhaustedUp = $state(false);
	let exhaustedDown = $state(false);
	let loadingUp = $state(false);
	let loadingDown = $state(false);

	let editOpen = $state(false);

	const lowest = $derived(episodes[0]?.episode_number ?? null);
	const highest = $derived(episodes[episodes.length - 1]?.episode_number ?? null);
	const showEarlier = $derived(lowest != null && lowest > 1 && !exhaustedUp);
	const showLater = $derived(episodes.length > 0 && !exhaustedDown);

	const tvdbLogo = $derived(mode.current === 'dark' ? TVDB_LOGO.dark : TVDB_LOGO.light);
	const noDownloads = $derived(
		item
			? noEnabledGroups(
					item.release_profile?.preferred_release_groups ??
						settings.current.profile.preferred_release_groups
				)
			: false
	);

	// Joined folder path, split after each slash so it wraps instead of overflowing.
	const folderPathSegments = $derived(
		item ? joinShowPath(item.show_parent_directory, item.show_folder_name).split(/(?<=[\\/])/) : []
	);

	// (Re)load whenever the route id changes.
	$effect(() => {
		const current = id;
		untrack(() => void load(current, false));
	});

	// Backend reported a change (status poll) → silently re-pull, merging into the loaded episode
	// window so paging/scroll are preserved (no spinner). Not a force-refresh.
	let syncSeen = tracked.syncTick;
	$effect(() => {
		const tick = tracked.syncTick;
		untrack(() => {
			if (tick === syncSeen) return;
			syncSeen = tick;
			if (item) void resync(id);
		});
	});

	async function resync(targetId: number) {
		try {
			const data = await getTrackedAnime(targetId, false);
			if (id !== targetId) return; // superseded by a newer navigation
			item = data;
			merge(data.episodes);
			exhaustedDown = false; // a newly-aired episode may now exist past our window
		} catch {
			/* keep what we have; the next poll/visit retries */
		}
	}

	async function load(targetId: number, force: boolean) {
		loading = item?.id !== targetId; // keep showing the old one while refreshing the same id
		refreshing = true;
		notFound = false;
		try {
			const data = await getTrackedAnime(targetId, force);
			if (id !== targetId) return; // superseded by a newer navigation
			item = data;
			episodes = sortEpisodes(data.episodes);
			exhaustedUp = (episodes[0]?.episode_number ?? 1) <= 1;
			exhaustedDown = false;
		} catch {
			notFound = true;
		} finally {
			if (id === targetId) {
				loading = false;
				refreshing = false;
			}
		}
	}

	/** Merge a window of episodes, dedupe by number, keep sorted. */
	function merge(next: TrackedAnimeItemEpisode[]) {
		const byNum: Record<number, TrackedAnimeItemEpisode> = {};
		for (const e of episodes) byNum[e.episode_number] = e;
		for (const e of next) byNum[e.episode_number] = e;
		episodes = sortEpisodes(Object.values(byNum));
	}

	async function loadEarlier() {
		if (lowest == null || loadingUp) return;
		loadingUp = true;
		const offset = Math.max(0, lowest - 1 - EPISODE_PAGE);
		try {
			const res = await listTrackedAnimeEpisodes(id, offset, EPISODE_PAGE);
			const fresh = res.episodes.filter((e) => e.episode_number < lowest);
			merge(res.episodes);
			if (res.episodes.length < EPISODE_PAGE || fresh.length === 0) exhaustedUp = true;
			if ((episodes[0]?.episode_number ?? 1) <= 1) exhaustedUp = true;
		} catch {
			/* toasted */
		} finally {
			loadingUp = false;
		}
	}

	async function loadLater() {
		if (highest == null || loadingDown) return;
		loadingDown = true;
		try {
			const res = await listTrackedAnimeEpisodes(id, highest, EPISODE_PAGE);
			const fresh = res.episodes.filter((e) => e.episode_number > highest);
			merge(res.episodes);
			if (res.episodes.length < EPISODE_PAGE || fresh.length === 0) exhaustedDown = true;
		} catch {
			/* toasted */
		} finally {
			loadingDown = false;
		}
	}

	function onSaved(saved: TrackedAnimeItem) {
		if (!item) return;
		item = { ...item, ...saved };
		tracked.upsert(saved);
	}

	// Feed the browser-tab title to the layout's single <title>; clear on leave so it reverts to the
	// nav-derived title (a competing per-page <title> wouldn't reliably reset on unmount).
	$effect(() => {
		pageTitleOverride.set(`${item ? displayTitle(item.anime) : 'Tracked anime'} · Saberr`);
		return () => pageTitleOverride.set(null);
	});
</script>

<a
	href="/tracked"
	class="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
>
	<Icon name="chevron-left" size={16} /> Tracked Anime
</a>

{#if loading && !item}
	<div class="flex min-h-[40vh] items-center justify-center text-muted-foreground">
		<Icon name="spinner" size={22} class="animate-spin" />
	</div>
{:else if notFound && !item}
	<div class="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-muted-foreground">
		<Icon name="alert-triangle" size={28} class="opacity-50" />
		<p>This tracked anime could not be found.</p>
		<Button href="/tracked" variant="outline">Back to Tracked Anime</Button>
	</div>
{:else if item}
	{@const anime = item.anime}
	<!-- Settings summary -->
	<section class="overflow-hidden rounded-xl border border-border bg-card/40">
		<div class="flex gap-4 p-4">
			{#if coverImage(anime, 'medium')}
				<img
					src={coverImage(anime, 'medium')}
					alt=""
					class="hidden h-28 w-20 shrink-0 rounded-lg object-cover sm:block"
					loading="lazy"
					decoding="async"
				/>
			{/if}
			<div class="min-w-0 flex-1">
				<div class="flex items-start gap-3">
					<div class="min-w-0 flex-1">
						<h1 class="truncate text-lg font-semibold">{displayTitle(anime)}</h1>
						{#if secondaryTitle(anime)}
							<p class="truncate text-sm text-muted-foreground">{secondaryTitle(anime)}</p>
						{/if}
						<div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
							{#if anime.format}<span>{formatLabel(anime.format)}</span>{/if}
							<span>{seasonYearLabel(anime.season, anime.season_year)}</span>
							{#if anime.episodes}<span>· {anime.episodes} eps</span>{/if}
						</div>
					</div>
					<div class="flex shrink-0 items-center gap-1.5">
						<Button
							href={`/rss?q=${encodeURIComponent(anime.romaji_title ?? anime.english_title ?? '')}`}
							variant="outline"
							size="sm"
							title="Search for torrents"
						>
							<Icon name="rss" size={15} />
							<span class="hidden sm:inline">Torrents</span>
						</Button>
						<Button href={`/browse?anilist_id=${anime.id}`} variant="outline" size="sm">
							<Icon name="browse" size={15} />
							<span class="hidden sm:inline">Go to anime</span>
						</Button>
						<Button type="button" variant="outline" size="sm" onclick={() => load(id, true)}>
							<Icon name="refresh" size={15} class={refreshing ? 'animate-spin' : ''} />
							<span class="hidden sm:inline">Force refresh</span>
						</Button>
						<Button type="button" size="sm" onclick={() => (editOpen = true)}>
							<Icon name="edit" size={15} /> Edit
						</Button>
					</div>
				</div>

				<!-- Settings grid -->
				<dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm md:grid-cols-3">
					<div class="min-w-0">
						<dt class="text-xs text-muted-foreground">Structure</dt>
						<dd class="mt-0.5">
							<StructuringBadge type={item.tvdb_structure_enabled ? 'tvdb' : 'anilist'} />
						</dd>
					</div>
					<div class="min-w-0">
						<dt class="text-xs text-muted-foreground">Release profile</dt>
						<dd class="mt-0.5">{isDefaultProfile(item.release_profile) ? 'Default' : 'Custom'}</dd>
					</div>
					<div class="min-w-0">
						<dt class="text-xs text-muted-foreground">Tracked episodes</dt>
						<dd class="mt-0.5 tabular-nums">
							{trackedEpisodeRange(item.from_episode, anime.episodes)}
						</dd>
					</div>
					<div class="col-span-2 min-w-0 md:col-span-3">
						<dt class="text-xs text-muted-foreground">Coverage</dt>
						<dd class="mt-1 flex items-center gap-3">
							<EpisodeProgress
								stats={item.episode_stats}
								fromEpisode={item.from_episode}
								placement="below"
								class="max-w-xs flex-1"
							/>
						</dd>
					</div>
					<div class="col-span-2 min-w-0 md:col-span-3">
						<dt class="text-xs text-muted-foreground">Folder</dt>
						<dd class="mt-0.5 font-mono text-xs break-words">
							{#each folderPathSegments as seg, i (i)}{seg}<wbr />{/each}
						</dd>
					</div>
				</dl>

				{#if noDownloads}
					<p
						class="mt-3 flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-warning"
					>
						<Icon name="alert-triangle" size={14} class="shrink-0" />
						Every release group is disabled, so nothing will be downloaded for this anime.
					</p>
				{/if}

				<div class="mt-3 flex items-center gap-1.5">
					<a
						href={anilistAnimeUrl(anime.id)}
						target="_blank"
						rel="noopener noreferrer"
						title="Open in AniList"
						class="inline-flex h-8 items-center rounded-md border border-border bg-card px-2.5 transition hover:bg-muted"
					>
						<img src={ANILIST_LOGO} alt="AniList" class="h-3.5 w-auto" />
					</a>
					{#if anime.idMal != null}
						<a
							href={malAnimeUrl(anime.idMal)}
							target="_blank"
							rel="noopener noreferrer"
							title="Open in MyAnimeList"
							class="inline-flex h-8 items-center rounded-md border border-border bg-card px-2.5 transition hover:bg-muted"
						>
							<img src={MAL_LOGO} alt="MyAnimeList" class="h-3.5 w-auto" />
						</a>
					{/if}
					{#if anime.tvdb_series_id != null}
						<a
							href={tvdbSeriesUrl(anime.tvdb_series_id)}
							target="_blank"
							rel="noopener noreferrer"
							title="Open in TheTVDB"
							class="inline-flex h-8 items-center rounded-md border border-border bg-card px-2.5 transition hover:bg-muted"
						>
							<img src={tvdbLogo} alt="TheTVDB" class="h-3.5 w-auto" />
						</a>
					{/if}
				</div>
			</div>
		</div>
	</section>

	<!-- Episodes -->
	<div class="mt-6">
		<h2 class="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
			Episodes
		</h2>

		{#if episodes.length === 0}
			<p
				class="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground"
			>
				No episodes yet.
			</p>
		{:else}
			{#if showEarlier}
				<div class="mb-2 flex justify-center">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={loadingUp}
						onclick={loadEarlier}
					>
						{#if loadingUp}<Icon name="spinner" size={14} class="animate-spin" />{/if}
						Show earlier episodes
					</Button>
				</div>
			{/if}

			<div class="flex flex-col gap-2">
				{#each episodes as episode (episode.episode_number)}
					<TrackedEpisodeRow
						trackedId={id}
						{episode}
						fromEpisode={item.from_episode}
						latestKnown={item.episode_stats.latest_known_episode_number}
						romajiTitle={anime.romaji_title ?? anime.english_title}
					/>
				{/each}
			</div>

			{#if showLater}
				<div class="mt-2 flex justify-center">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={loadingDown}
						onclick={loadLater}
					>
						{#if loadingDown}<Icon name="spinner" size={14} class="animate-spin" />{/if}
						Show more episodes
					</Button>
				</div>
			{/if}
		{/if}
	</div>

	<TrackDialog bind:open={editOpen} {item} {onSaved} onDeleted={() => goto('/tracked')} />
{/if}
