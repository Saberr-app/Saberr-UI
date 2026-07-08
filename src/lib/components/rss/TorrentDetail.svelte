<script lang="ts">
	/* The expanded detail beneath a torrent row. Read-only (row actions live in the context/⋯ menus).
	   Order: header, attribute pills, description + link, download details, notes, profile shortcomings. */
	import type { TorrentListItem } from '$lib/api/types';
	import { TORRENT_DOWNLOAD_STATUS_LABELS } from '$lib/api/types';
	import { statusTone, TONE_CHIP, TONE_DOT } from '$lib/tracked/status';
	import { qbitDisplay, formatEta, formatProgress } from '$lib/tracked/qbit';
	import { resolveTitle, resolveEpisode } from '$lib/rss/resolve';
	import { shortcomingLabels } from '$lib/rss/shortcomings';
	import { downloadUpdates } from '$lib/stores/download-updates.svelte';
	import { applyLiveToDownload } from '$lib/downloads/resolve';
	import { slide } from 'svelte/transition';
	import Icon from '$lib/components/Icon.svelte';
	import RelativeTime from '$lib/components/RelativeTime.svelte';
	import { cn } from '$lib/utils';

	let { item }: { item: TorrentListItem } = $props();

	const title = $derived(resolveTitle(item).value);
	const episode = $derived(resolveEpisode(item));
	// Overlay live status/paths from the download-updates stream; deleted backend-side → null.
	const download = $derived(
		item.download && !downloadUpdates.isDeleted(item.download.id)
			? applyLiveToDownload(item.download, downloadUpdates.get(item.download.id))
			: null
	);
	const tone = $derived(statusTone(download?.status));
	// Live qbit line — only while the client reports a state and we're not yet imported.
	const qbitState = $derived(download?.qbit_status ?? null);
	const showQbit = $derived(qbitState != null && download?.status !== 'PROCESSED');
	const qd = $derived(qbitState ? qbitDisplay(qbitState) : null);
	const shortcomings = $derived(shortcomingLabels(item.profile_shortcomings));
	// Selected / Discarded / Superseded are independent now — any combination can show together.
	const showDiscarded = $derived(item.discarded);
	const isSelected = $derived(item.selected || item.download != null);
</script>

<div transition:slide={{ duration: 160 }} class="flex flex-col gap-3 p-4 pl-5">
	<!-- Header -->
	<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
		<h4 class="text-sm font-semibold text-foreground">{title}</h4>
		{#if episode}
			<span class="text-xs text-muted-foreground">
				Episode{episode.value.includes('-') ? 's' : ''}
				<span class={cn(episode.fuzzy && 'text-fuzzy')}>{episode.value}</span>
			</span>
		{/if}
	</div>

	<!-- Attribute pills -->
	{#if isSelected || item.superseded || showDiscarded}
		<div class="flex flex-wrap gap-1.5">
			{#if isSelected}
				<span
					class="rounded-full border border-success/35 bg-success/10 px-2 py-0.5 text-[0.7rem] font-medium text-success"
					>Selected</span
				>
			{/if}
			{#if item.superseded}
				<span
					class="rounded-full border border-border bg-muted px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground"
					>Superseded</span
				>
			{/if}
			{#if showDiscarded}
				<span
					class="rounded-full border border-border bg-muted px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground"
					>Discarded</span
				>
			{/if}
		</div>
	{/if}

	<!-- Description + external link -->
	<p class="text-xs leading-relaxed text-muted-foreground">
		{item.rss_torrent.description}
	</p>
	<a
		href={item.rss_torrent.web_link}
		target="_blank"
		rel="noopener noreferrer"
		class="inline-flex w-fit items-center gap-1 text-xs font-medium text-info hover:underline"
	>
		<Icon name="external-link" size={13} /> View external torrent
	</a>

	<!-- Download details -->
	{#if download}
		<div class="flex flex-col gap-2 rounded-lg border bg-card px-3 py-2">
			<div class="flex flex-wrap items-center gap-2">
				<span
					class={cn('rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold', TONE_CHIP[tone])}
				>
					{TORRENT_DOWNLOAD_STATUS_LABELS[download.status]}
				</span>
				{#if download.destination_path}
					<span
						class="min-w-0 flex-1 truncate text-xs text-muted-foreground"
						title={download.destination_path}
					>
						{download.destination_path}
					</span>
				{/if}
				{#if download.copied_to_destination_path_at}
					<RelativeTime
						iso={download.copied_to_destination_path_at}
						scope="rss"
						defaultAbsolute
						class="text-xs text-muted-foreground"
					/>
				{/if}
				<a
					href={`/downloads?id=${download.id}`}
					class="ml-auto inline-flex items-center gap-1 text-xs font-medium text-info hover:underline"
				>
					<Icon name="external-link" size={13} /> Go to download
				</a>
			</div>
			{#if showQbit && qd}
				<div class="flex items-center gap-2">
					<span class="shrink-0 text-xs text-muted-foreground">{qd.label}</span>
					{#if (download.qbit_progress ?? 0) < 1}
						<div class="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-muted">
							<div
								class={cn('h-full rounded-full transition-[width]', TONE_DOT[qd.tone])}
								style="width: {Math.round((download.qbit_progress ?? 0) * 100)}%"
							></div>
						</div>
					{/if}
					<span class="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
						{formatProgress(download.qbit_progress)}{#if formatEta(download.qbit_eta)}<span>
								· {formatEta(download.qbit_eta)} left</span
							>{/if}
					</span>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Notes -->
	{#if item.notes.length}
		<div class="flex flex-col gap-1">
			{#each item.notes as note, i (i)}
				<p class="flex items-start gap-2 text-xs">
					<span
						class={cn(
							'mt-px shrink-0 rounded px-1.5 py-0.5 text-[0.6rem] font-bold tracking-wide uppercase',
							note.is_error ? 'bg-destructive/15 text-destructive' : 'bg-info/15 text-info'
						)}
					>
						{note.is_error ? 'Error' : 'Info'}
					</span>
					<span class="text-muted-foreground">{note.text}</span>
				</p>
			{/each}
		</div>
	{/if}

	<!-- Profile shortcomings -->
	{#if shortcomings.length}
		<div class="flex flex-wrap items-center gap-1.5">
			{#each shortcomings as text (text)}
				<span
					class="rounded-full border border-warning/35 bg-warning/10 px-2 py-0.5 text-[0.7rem] font-medium text-warning"
					>{text}</span
				>
			{/each}
		</div>
	{/if}
</div>
