<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { slide } from 'svelte/transition';
	import type {
		Download,
		TorrentDownloadStatus,
		TorrentItem,
		TrackedAnimeItemEpisode
	} from '$lib/api/types';
	import { getTrackedAnimeEpisodeDetails, updateTrackedAnimeEpisode } from '$lib/api/tracked';
	import { overrideTorrent } from '$lib/api/torrents';
	import { downloadUpdates } from '$lib/stores/download-updates.svelte';
	import { status } from '$lib/stores/status.svelte';
	import { applyLiveToDownload } from '$lib/downloads/resolve';
	import {
		absoluteSuffix,
		episodeAirDate,
		episodeCode,
		episodeFinaleType,
		episodeImages,
		joinTvdbTitles,
		partLabel,
		sortTvdbEpisodes
	} from '$lib/tracked/episode';
	import { episodeOuterStatus, TONE_CHIP, TONE_DOT, TONE_EDGE } from '$lib/tracked/status';
	import { notifyError, notifySuccess } from '$lib/api/notify';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import Icon from '$lib/components/Icon.svelte';
	import StructuringBadge from '$lib/components/settings/StructuringBadge.svelte';
	import EpisodeTorrent from './EpisodeTorrent.svelte';
	import OverrideConfirmDialog from '$lib/components/OverrideConfirmDialog.svelte';
	import { cn } from '$lib/utils';

	let {
		trackedId,
		episode,
		fromEpisode,
		latestKnown,
		romajiTitle = null
	}: {
		trackedId: number;
		episode: TrackedAnimeItemEpisode;
		/** Coverage range start — used to flag a missing episode Saberr should have. */
		fromEpisode: number;
		/** Latest known/aired episode (null = unknown). */
		latestKnown: number | null;
		/** Preferred title for the "Search for torrents" deep-link (romaji → english). */
		romajiTitle?: string | null;
	} = $props();

	// "Not downloaded" inside the coverage range [from, latest] = genuinely missing (red); outside = expected (grey).
	const inCoverageRange = $derived(
		latestKnown != null &&
			episode.episode_number >= fromEpisode &&
			episode.episode_number <= latestKnown
	);

	// Episodes before the tracked start aren't tracked at all (Saberr ignores them).
	const notTracked = $derived(episode.episode_number < fromEpisode);

	const tvdb = $derived(sortTvdbEpisodes(episode.tvdb_series_episodes));
	const code = $derived(episodeCode(tvdb));
	const absolute = $derived(absoluteSuffix(tvdb));
	const titles = $derived(joinTvdbTitles(tvdb));
	const part = $derived(partLabel(episode));
	const airDate = $derived(episodeAirDate(tvdb));

	// Aired? false = future, true = aired, null = unknown (no signal) → no chip. Episodes past the
	// latest aired one read as "Hasn't aired yet" rather than missing.
	const aired = $derived.by<boolean | null>(() => {
		if (latestKnown != null) return episode.episode_number <= latestKnown;
		if (airDate) {
			const t = Date.parse(airDate);
			if (!Number.isNaN(t)) return t <= Date.now();
		}
		return null;
	});
	const finale = $derived(episodeFinaleType(tvdb));
	const overview = $derived(tvdb.find((e) => e.overview)?.overview ?? null);
	const images = $derived(episodeImages(tvdb));

	const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
	const airDateLabel = $derived(airDate ? dateFmt.format(new Date(airDate)) : null);
	const finaleLabel = $derived(
		finale === 'series'
			? 'Series finale'
			: finale === 'midseason'
				? 'Midseason finale'
				: finale === 'season'
					? 'Season finale'
					: null
	);

	let autoDiscard = $state(untrack(() => episode.auto_discard));
	let togglingDiscard = $state(false);

	async function toggleAutoDiscard() {
		const next = !autoDiscard;
		togglingDiscard = true;
		try {
			await updateTrackedAnimeEpisode(trackedId, episode.episode_number, { auto_discard: next });
			autoDiscard = next;
			notifySuccess(next ? 'Future downloads will be discarded' : 'Auto-discard turned off');
		} catch {
			/* HTTP client toasted */
		} finally {
			togglingDiscard = false;
		}
	}

	// Expand → lazy-load torrents; live status/progress then come from the download-updates stream.
	let open = $state(false);
	let showOther = $state(false);
	let torrents = $state<TorrentItem[] | null>(null);
	let loadingTorrents = $state(false);
	let liveStatus = $state<TorrentDownloadStatus | null>(untrack(() => episode.download_status));
	let watchToken: number | undefined;
	/** `download_added` seen at our last fetch — an advance means a new torrent appeared. */
	let seenAddedAt: string | null = null;

	// Overlay live status/progress onto loaded torrents; drop any whose download was deleted backend-side.
	const liveTorrents = $derived(
		torrents
			? torrents
					.filter((t) => !(t.download && downloadUpdates.isDeleted(t.download.id)))
					.map((t) => ({
						...t,
						download: applyLiveToDownload(
							t.download,
							t.download ? downloadUpdates.get(t.download.id) : undefined
						)
					}))
			: null
	);

	// Outer status is upgrade-aware once torrents are known (newer release over an imported one → upgrade wording).
	const outer = $derived(episodeOuterStatus(episode.download_id, liveStatus, liveTorrents));
	// Torrents with a download split into Latest/Older; those with none go to a collapsed "Other releases".
	const downloadedTorrents = $derived(
		liveTorrents ? liveTorrents.filter((t) => t.download != null) : []
	);
	const otherTorrents = $derived(
		liveTorrents ? liveTorrents.filter((t) => t.download == null) : []
	);
	// After an override the chosen torrent becomes Latest; that overrides the prop-derived id until
	// the next refetch (which clears it). Falls back to `episode.download_id`.
	let overriddenDownloadId = $state<number | null>(null);
	const latestDownloadId = $derived(overriddenDownloadId ?? episode.download_id);
	const latestTorrent = $derived(
		downloadedTorrents.find((t) => t.download?.id === latestDownloadId) ?? null
	);
	const olderTorrents = $derived(downloadedTorrents.filter((t) => t !== latestTorrent));

	/** Watch the expanded episode's non-PROCESSED download ids (none while collapsed). */
	function updateWatch() {
		if (watchToken === undefined) return;
		const ids =
			open && torrents
				? torrents
						.map((t) => t.download)
						.filter((d): d is Download => d != null && d.status !== 'PROCESSED')
						.map((d) => d.id)
				: [];
		downloadUpdates.update(watchToken, ids);
	}

	async function fetchDetails() {
		const details = await getTrackedAnimeEpisodeDetails(trackedId, episode.episode_number);
		torrents = details.torrents;
		liveStatus = details.download_status;
		overriddenDownloadId = null; // fresh data → follow the backend's download_id again
		seenAddedAt = status.downloadAddedAt;
		updateWatch();
	}

	/* --- override (Revert / Override with this release) --- */
	let overrideOpen = $state(false);
	let overrideTitle = $state('Override existing download?');
	let overrideConfirmLabel = $state('Override');
	let pendingOverride: TorrentItem | null = null;

	function requestOverride(t: TorrentItem, k: 'older' | 'other') {
		pendingOverride = t;
		overrideTitle = k === 'older' ? 'Revert to this release?' : 'Override with this release?';
		overrideConfirmLabel = k === 'older' ? 'Revert' : 'Override';
		overrideOpen = true;
	}

	async function doOverride(discardFuture: boolean) {
		const t = pendingOverride;
		pendingOverride = null;
		if (!t || torrents == null) return;
		try {
			const res = await overrideTorrent(t.parent_id, { discard_future_torrents: discardFuture });
			const newId = res.download_id;
			// Chosen torrent becomes Latest — flip/create its download to PENDING with the returned id.
			// Identity by parent_id (`t` came from the live-overlaid copy, not the source array).
			torrents = torrents.map((cur) => {
				if (cur.parent_id !== t.parent_id) return cur;
				const download: Download = cur.download
					? { ...cur.download, id: newId, status: 'PENDING', status_details: null }
					: {
							id: newId,
							status: 'PENDING',
							status_details: null,
							download_directory_path: null,
							destination_path: null,
							copied_to_destination_path_at: null
						};
				return { ...cur, download };
			});
			overriddenDownloadId = newId;
			liveStatus = 'PENDING';
			updateWatch();
			notifySuccess(
				overrideConfirmLabel === 'Revert' ? 'Reverting to this release' : 'Override started'
			);
		} catch {
			/* apiFetch already toasted */
		}
	}

	/* --- search for torrents --- */
	const searchQuery = $derived(romajiTitle ? `${romajiTitle} ${episode.episode_number}` : null);
	function searchTorrents() {
		if (searchQuery) void goto(`/rss?q=${encodeURIComponent(searchQuery)}`);
	}

	async function toggleOpen() {
		if (open) {
			open = false;
			updateWatch(); // stop watching this row's ids
			return;
		}
		// First open: load torrents BEFORE expanding so the panel slides over stable content (no mid-animation resize).
		if (torrents === null) {
			loadingTorrents = true;
			try {
				await fetchDetails();
			} catch {
				torrents = [];
				notifyError("Couldn't load torrents for this episode");
			} finally {
				loadingTorrents = false;
			}
		}
		open = true;
		updateWatch();
	}

	// A new download appearing (`download_added` advanced) → silently refetch the open episode's torrents.
	$effect(() => {
		const added = status.downloadAddedAt;
		if (!open || torrents === null || added === seenAddedAt) return;
		seenAddedAt = added;
		void fetchDetails().catch(() => {});
	});

	onMount(() => {
		watchToken = downloadUpdates.register([]);
	});
	onDestroy(() => {
		if (watchToken !== undefined) downloadUpdates.unregister(watchToken);
	});

	// Try each image in order; fall back to the next when one fails to load.
	let imageIdx = $state(0);
	const currentImage = $derived(images[imageIdx] ?? null);
</script>

<!-- Untracked episodes (below from_episode) are "ghosted" — dimmed + dashed border
     to read as not-part-of-the-set; the effect lifts once the row is expanded. -->
<div
	class={cn(
		'relative overflow-hidden rounded-lg border border-border bg-card transition-opacity duration-200',
		notTracked && !open && 'border-dashed opacity-55'
	)}
>
	<div class={cn('absolute inset-y-0 left-0 w-1', TONE_EDGE[outer.tone])}></div>
	<div class="flex items-start gap-2">
		<button
			type="button"
			onclick={toggleOpen}
			aria-expanded={open}
			class="flex min-w-0 flex-1 items-start gap-3 py-3 pr-2 pl-3 text-left transition-colors hover:bg-muted/30"
		>
			{#if loadingTorrents && !open}
				<Icon name="spinner" size={16} class="mt-1 shrink-0 animate-spin text-muted-foreground" />
			{:else}
				<Icon
					name="chevron-down"
					size={16}
					class={cn(
						'mt-1 shrink-0 text-muted-foreground transition-transform',
						open && 'rotate-180'
					)}
				/>
			{/if}
			<div class="min-w-0 flex-1 space-y-1">
				<!-- Line 1: episode number + status -->
				<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
					<span class={cn('size-2 shrink-0 rounded-full', TONE_DOT[outer.tone])}></span>
					<span class="font-semibold">Episode {episode.episode_number}</span>
					{#if outer.label}
						<span
							class={cn(
								'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[0.65rem] font-medium',
								TONE_CHIP[outer.tone]
							)}>{outer.label}</span
						>
					{:else if aired === false}
						<span
							title="Outside the tracked range"
							class={cn(
								'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[0.65rem] font-medium',
								TONE_CHIP.neutral
							)}>Hasn't aired yet</span
						>
					{:else if notTracked}
						<span
							title="Outside the tracked range — Saberr isn't tracking this episode"
							class={cn(
								'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[0.65rem] font-medium',
								TONE_CHIP.neutral
							)}>Not tracked</span
						>
					{:else if aired === true}
						<span
							title={inCoverageRange
								? 'Inside the tracked range but not downloaded'
								: 'Outside the tracked range'}
							class={cn(
								'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[0.65rem] font-medium',
								TONE_CHIP[inCoverageRange ? 'error' : 'neutral']
							)}>Not downloaded</span
						>
					{/if}
					{#if autoDiscard}
						<span
							class="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-warning"
						>
							<Icon name="eye-off" size={11} /> Auto-discard
						</span>
					{/if}
				</div>

				<!-- Line 2: TVDB-sourced episode (logo · code · title as one) -->
				{#if code || titles}
					<div class="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 py-0.5 text-sm">
						<span class="inline-flex items-baseline gap-1.5">
							<StructuringBadge type="tvdb" class="h-3.5 w-auto translate-y-[3px]" />
							{#if code}
								<span class="font-medium text-foreground">{code}</span>
								{#if absolute}<span class="text-xs text-muted-foreground">{absolute}</span>{/if}
							{/if}
							{#if code && titles}<span class="text-muted-foreground">-</span>{/if}
							{#if titles}<span class="text-foreground">{titles}</span>{/if}
						</span>
						{#if part}
							<span class="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground"
								>{part}</span
							>
						{/if}
					</div>
				{/if}

				<!-- Line 3: air date + finale -->
				{#if airDateLabel || finaleLabel}
					<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
						{#if airDateLabel}<span>{airDateLabel}</span>{/if}
						{#if finaleLabel}
							<span
								class="inline-flex items-center rounded-full border border-brand/40 bg-brand-light/10 px-1.5 py-0.5 text-[0.65rem] font-medium text-foreground"
								>{finaleLabel}</span
							>
						{/if}
					</div>
				{/if}
			</div>
		</button>

		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				class="mt-2 mr-2 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				aria-label="Episode actions"
			>
				<Icon name="more-horizontal" size={16} />
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-56">
				<DropdownMenu.Item disabled={togglingDiscard} onSelect={toggleAutoDiscard}>
					<Icon name={autoDiscard ? 'eye' : 'eye-off'} size={15} />
					<span class="flex-1">Discard future downloads</span>
					{#if autoDiscard}<Icon name="check" size={14} />{/if}
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>

	{#if open}
		<div transition:slide={{ duration: 180 }} class="border-t border-border bg-muted/15 p-3">
			<div class="flex flex-col gap-3 sm:flex-row">
				{#if currentImage}
					<img
						src={currentImage}
						alt=""
						onerror={() => (imageIdx += 1)}
						class="aspect-video w-full shrink-0 rounded-md object-cover sm:w-56"
						loading="lazy"
						decoding="async"
					/>
				{/if}
				<div class="min-w-0 flex-1">
					{#if overview}
						<p class="text-sm text-muted-foreground">{overview}</p>
					{:else}
						<p class="text-sm text-muted-foreground/70 italic">No overview available.</p>
					{/if}
				</div>
			</div>

			<div class="mt-3 flex flex-col gap-3">
				{#if searchQuery}
					<button
						type="button"
						onclick={searchTorrents}
						class="inline-flex w-fit items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					>
						<Icon name="rss" size={14} />
						Search for torrents
					</button>
				{/if}

				{#if loadingTorrents}
					<p class="flex items-center gap-2 text-sm text-muted-foreground">
						<Icon name="spinner" size={14} class="animate-spin" /> Loading torrents…
					</p>
				{:else if torrents && torrents.length > 0}
					{#if latestTorrent}
						<div class="flex flex-col gap-2">
							<h4 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
								Latest release
							</h4>
							<EpisodeTorrent torrent={latestTorrent} kind="latest" />
						</div>
					{/if}
					{#if olderTorrents.length > 0}
						<div class="flex flex-col gap-2">
							<h4 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
								{latestTorrent ? 'Older releases' : 'Releases'}
							</h4>
							{#each olderTorrents as torrent, i (i)}
								<EpisodeTorrent
									{torrent}
									kind="older"
									onOverride={() => requestOverride(torrent, 'older')}
								/>
							{/each}
						</div>
					{/if}
					{#if otherTorrents.length > 0}
						<div class="flex flex-col gap-2">
							<button
								type="button"
								onclick={() => (showOther = !showOther)}
								aria-expanded={showOther}
								class="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
							>
								<Icon
									name="chevron-down"
									size={13}
									class={cn('transition-transform', !showOther && '-rotate-90')}
								/>
								Other releases
								<span class="font-normal text-muted-foreground/70 normal-case">
									({otherTorrents.length})
								</span>
							</button>
							{#if showOther}
								<div transition:slide={{ duration: 150 }} class="flex flex-col gap-2">
									{#each otherTorrents as torrent, i (i)}
										<EpisodeTorrent
											{torrent}
											kind="other"
											onOverride={() => requestOverride(torrent, 'other')}
										/>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				{:else}
					<p class="text-sm text-muted-foreground">No torrents for this episode.</p>
				{/if}
			</div>
		</div>
	{/if}
</div>

<OverrideConfirmDialog
	bind:open={overrideOpen}
	title={overrideTitle}
	confirmLabel={overrideConfirmLabel}
	onConfirm={doOverride}
/>
