<script lang="ts">
	/* Shared episode download-status popup. Loads a tracked episode's torrents (assumes anilist
	   episode number == tracked episode number) + live status while open. Used by RSS, calendar, and
	   Downloads — each supplies its own `header` chrome + a sorted `episodes` list (multi-episode
	   sources page through with Next/Previous). */
	import { onDestroy, onMount, type Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import type {
		Download,
		TVDBSeriesEpisode,
		TorrentDownloadStatus,
		TorrentItem
	} from '$lib/api/types';
	import { getTrackedAnimeEpisodeDetails } from '$lib/api/tracked';
	import { overrideTorrent } from '$lib/api/torrents';
	import { notifySuccess } from '$lib/api/notify';
	import { downloadUpdates } from '$lib/stores/download-updates.svelte';
	import { status } from '$lib/stores/status.svelte';
	import { applyLiveToDownload } from '$lib/downloads/resolve';
	import {
		absoluteSuffix,
		episodeCode,
		episodeImages,
		joinTvdbTitles,
		sortTvdbEpisodes
	} from '$lib/tracked/episode';
	import { episodeOuterStatus, type StatusTone, TONE_CHIP } from '$lib/tracked/status';
	import * as Dialog from '$lib/components/ui/dialog';
	import EpisodeTvdbLine from '$lib/components/tracked/EpisodeTvdbLine.svelte';
	import EpisodeTorrent from '$lib/components/tracked/EpisodeTorrent.svelte';
	import OverrideConfirmDialog from '$lib/components/OverrideConfirmDialog.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	/** Derived display data passed to the header snippet so callers can lay out the
	    TVDB line / status indicator wherever their header design wants them. */
	export type EpisodeDisplay = {
		episode: number;
		code: string | null;
		absolute: string | null;
		titles: string | null;
		outer: { label: string | null; tone: StatusTone };
		loading: boolean;
		hasTorrents: boolean;
	};

	let {
		open,
		trackedAnimeId,
		episodes,
		romajiTitle = null,
		onClose,
		header,
		headerOwnsMeta = false,
		contentClass
	}: {
		open: boolean;
		trackedAnimeId: number | null;
		/** Episode numbers this source covers; shown one at a time, sorted ascending. */
		episodes: number[];
		/** Preferred title for the "Search for torrents" deep-link (caller resolves romaji → english). */
		romajiTitle?: string | null;
		onClose: () => void;
		/** Top chrome (Dialog.Title etc.); receives the current episode + display state. */
		header: Snippet<[EpisodeDisplay]>;
		/** When true the header renders the TVDB line + status itself, so the body skips them. */
		headerOwnsMeta?: boolean;
		contentClass?: string;
	} = $props();

	const sorted = $derived([...episodes].sort((a, b) => a - b));

	let index = $state(0);
	const episode = $derived(sorted[index] ?? null);
	const hasPrev = $derived(index > 0);
	const hasNext = $derived(index < sorted.length - 1);

	// Reset to the first episode whenever the dialog (re)opens for a new source.
	const resetKey = $derived(open ? `${trackedAnimeId}:${sorted.join(',')}` : '');
	$effect(() => {
		resetKey; // track
		index = 0;
	});

	let torrents = $state<TorrentItem[] | null>(null);
	let liveStatus = $state<TorrentDownloadStatus | null>(null);
	let downloadId = $state<number | null>(null);
	let tvdb = $state<TVDBSeriesEpisode[]>([]);
	let loading = $state(false);
	let imageIdx = $state(0);
	let showOther = $state(false);
	let loadedKey = '';
	let watchToken: number | undefined;
	/** `download_added` seen at our last fetch — an advance means a new torrent appeared. */
	let seenAddedAt: string | null = null;

	const code = $derived(episodeCode(tvdb));
	const absolute = $derived(absoluteSuffix(tvdb));
	const titles = $derived(joinTvdbTitles(tvdb));
	const images = $derived(episodeImages(tvdb));
	const image = $derived(images[imageIdx] ?? null);
	const overview = $derived(tvdb.find((e) => e.overview)?.overview ?? null);

	// Overlay live status/progress from the download-updates stream; drop any deleted backend-side.
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

	const outer = $derived(episodeOuterStatus(downloadId, liveStatus, liveTorrents));
	const downloaded = $derived(liveTorrents ? liveTorrents.filter((t) => t.download != null) : []);
	const other = $derived(liveTorrents ? liveTorrents.filter((t) => t.download == null) : []);
	const latest = $derived(downloaded.find((t) => t.download?.id === downloadId) ?? null);
	const older = $derived(downloaded.filter((t) => t !== latest));

	/** Register the episode's non-PROCESSED download ids with the live stream. */
	function updateWatch() {
		if (watchToken === undefined) return;
		const ids = (torrents ?? [])
			.map((t) => t.download)
			.filter((d): d is Download => d != null && d.status !== 'PROCESSED')
			.map((d) => d.id);
		downloadUpdates.update(watchToken, ids);
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
			// The chosen torrent becomes the Latest release — its download flips to (or is created as)
			// PENDING with the returned id (unchanged when it already had one). Identity by parent_id,
			// since `t` came from the live-overlaid copy, not the `torrents` source array.
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
			downloadId = newId;
			liveStatus = 'PENDING';
			updateWatch(); // register the (possibly new) PENDING id with the stream
			notifySuccess(
				overrideConfirmLabel === 'Revert' ? 'Reverting to this release' : 'Override started'
			);
		} catch {
			/* apiFetch already toasted */
		}
	}

	/* --- search for torrents --- */
	const searchQuery = $derived(romajiTitle && episode != null ? `${romajiTitle} ${episode}` : null);
	function searchTorrents() {
		if (searchQuery) void goto(`/rss?q=${encodeURIComponent(searchQuery)}`);
	}

	async function fetchDetails(trackedId: number, ep: number) {
		const d = await getTrackedAnimeEpisodeDetails(trackedId, ep);
		torrents = d.torrents;
		liveStatus = d.download_status;
		downloadId = d.download_id;
		tvdb = sortTvdbEpisodes(d.tvdb_series_episodes);
		seenAddedAt = status.downloadAddedAt;
		updateWatch();
	}

	$effect(() => {
		const trackedId = open ? trackedAnimeId : null;
		const ep = open ? episode : null;
		if (trackedId == null || ep == null) {
			loadedKey = '';
			if (watchToken !== undefined) downloadUpdates.update(watchToken, []); // stop watching while closed
			return;
		}
		const key = `${trackedId}:${ep}`;
		if (key === loadedKey) return;
		loadedKey = key;
		// Reset for the new episode.
		torrents = null;
		liveStatus = null;
		downloadId = null;
		tvdb = [];
		imageIdx = 0;
		showOther = false;
		loading = true;
		(async () => {
			try {
				await fetchDetails(trackedId, ep);
			} catch {
				torrents = [];
			} finally {
				loading = false;
			}
		})();
	});

	// A new download appearing (`download_added` advanced) → silently refetch the open episode.
	$effect(() => {
		const added = status.downloadAddedAt;
		if (!loadedKey || added === seenAddedAt) return;
		seenAddedAt = added;
		const [tid, ep] = loadedKey.split(':').map(Number);
		void fetchDetails(tid, ep).catch(() => {});
	});

	onMount(() => {
		watchToken = downloadUpdates.register([]);
	});
	onDestroy(() => {
		if (watchToken !== undefined) downloadUpdates.unregister(watchToken);
	});
</script>

<Dialog.Root {open} onOpenChange={(o) => !o && onClose()}>
	<Dialog.Content
		class={cn('flex max-h-[88vh] flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl', contentClass)}
	>
		{#if episode != null}
			<div class="shrink-0">
				{@render header({
					episode,
					code,
					absolute,
					titles,
					outer,
					loading,
					hasTorrents: torrents != null
				})}
			</div>

			{#if hasPrev || hasNext}
				<div class="absolute top-11 right-2 z-10 flex flex-col gap-1">
					{#if hasNext}
						<button
							type="button"
							title="Next episode"
							onclick={() => (index += 1)}
							class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							<Icon name="chevron-right" size={16} />
							<span class="sr-only">Next episode</span>
						</button>
					{/if}
					{#if hasPrev}
						<button
							type="button"
							title="Previous episode"
							onclick={() => (index -= 1)}
							class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							<Icon name="chevron-left" size={16} />
							<span class="sr-only">Previous episode</span>
						</button>
					{/if}
				</div>
			{/if}

			<div class="flex flex-col gap-3 px-4 pt-2 pb-4">
				{#if !headerOwnsMeta}
					<EpisodeTvdbLine {code} {absolute} {titles} />

					{#if outer.label}
						<span
							class={cn(
								'inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
								TONE_CHIP[outer.tone]
							)}
						>
							{outer.label}
						</span>
					{/if}
				{/if}

				{#if image}
					<img
						src={image}
						alt=""
						onerror={() => (imageIdx += 1)}
						class="aspect-video w-full rounded-lg object-cover"
						loading="lazy"
						decoding="async"
					/>
				{/if}
				{#if overview}
					<p class="text-sm text-muted-foreground">{overview}</p>
				{/if}

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

				{#if loading}
					<p class="flex items-center gap-2 text-sm text-muted-foreground">
						<Icon name="spinner" size={14} class="animate-spin" /> Loading torrents…
					</p>
				{:else if torrents && torrents.length > 0}
					{#if latest}
						<div class="flex flex-col gap-2">
							<h4 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
								Latest release
							</h4>
							<EpisodeTorrent torrent={latest} kind="latest" />
						</div>
					{/if}
					{#if older.length > 0}
						<div class="flex flex-col gap-2">
							<h4 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
								{latest ? 'Older releases' : 'Releases'}
							</h4>
							{#each older as torrent, i (i)}
								<EpisodeTorrent
									{torrent}
									kind="older"
									onOverride={() => requestOverride(torrent, 'older')}
								/>
							{/each}
						</div>
					{/if}
					{#if other.length > 0}
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
									({other.length})
								</span>
							</button>
							{#if showOther}
								<div class="flex flex-col gap-2">
									{#each other as torrent, i (i)}
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
		{/if}
	</Dialog.Content>
</Dialog.Root>

<OverrideConfirmDialog
	bind:open={overrideOpen}
	title={overrideTitle}
	confirmLabel={overrideConfirmLabel}
	onConfirm={doOverride}
/>
