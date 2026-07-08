<script lang="ts">
	/* One download row: a dense collapsed line (status edge · title · episode · status · specs) that
	   expands to the full record. Status/progress overlaid live from the download-updates stream. */
	import { untrack } from 'svelte';
	import { slide } from 'svelte/transition';
	import type { DownloadItem, TorrentDownloadStatus } from '$lib/api/types';
	import { TORRENT_DOWNLOAD_STATUS_LABELS } from '$lib/api/types';
	import { downloadUpdates } from '$lib/stores/download-updates.svelte';
	import {
		applyLive,
		downloadTitle,
		downloadEpisode,
		downloadSpecChips
	} from '$lib/downloads/resolve';
	import { statusTone, TONE_EDGE, TONE_CHIP, TONE_DOT } from '$lib/tracked/status';
	import { qbitTone, formatEta, formatProgress } from '$lib/tracked/qbit';
	import Icon from '$lib/components/Icon.svelte';
	import RelativeTime from '$lib/components/RelativeTime.svelte';
	import DownloadDetails from './DownloadDetails.svelte';
	import DownloadRowMenu from './DownloadRowMenu.svelte';
	import { cn } from '$lib/utils';

	let { item, startOpen = false }: { item: DownloadItem; startOpen?: boolean } = $props();

	// Overlay the latest streamed fields (status/qbit) onto the row.
	const live = $derived(applyLive(item, downloadUpdates.get(item.id)));
	const tone = $derived(statusTone(live.status));
	const title = $derived(downloadTitle(live));
	const episode = $derived(downloadEpisode(live));
	const chips = $derived(downloadSpecChips(live));
	const qbit = $derived(live.qbit_status);
	// Collapsed bar: any reported qbit state, coloured by category — except once the download is
	// terminal (imported, deleted, or discarded), where progress no longer means anything.
	const BAR_HIDDEN_STATUSES: TorrentDownloadStatus[] = ['PROCESSED', 'DELETED', 'DISCARDED'];
	const showBar = $derived(qbit != null && !BAR_HIDDEN_STATUSES.includes(live.status));
	const barTone = $derived(qbit ? qbitTone(qbit.status) : 'neutral');

	// Single view opens expanded; the prop is only an initial value (never re-read).
	let open = $state(untrack(() => startOpen));
	function toggle() {
		open = !open;
	}
	function onKeydown(e: KeyboardEvent) {
		if (e.target !== e.currentTarget) return;
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			open = !open;
		}
	}
</script>

<div class="relative overflow-hidden rounded-lg border bg-card">
	<div class={cn('absolute inset-y-0 left-0 w-1', TONE_EDGE[tone])}></div>

	<div
		role="button"
		tabindex="0"
		onclick={toggle}
		onkeydown={onKeydown}
		aria-expanded={open}
		class="block w-full cursor-pointer py-3 pr-3 pl-4 text-left transition-colors outline-none hover:bg-muted/40 focus-visible:bg-muted/40"
	>
		<div class="flex items-start gap-3">
			<div class="min-w-0 flex-1">
				<!-- Title + episode -->
				<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
					<span class="truncate font-medium" {title}>{title}</span>
					{#if episode}
						<span class="shrink-0 text-xs text-muted-foreground">{episode}</span>
					{/if}
				</div>

				<!-- Status + progress + specs -->
				<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
					<span
						class={cn(
							'inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-medium',
							TONE_CHIP[tone]
						)}
					>
						{TORRENT_DOWNLOAD_STATUS_LABELS[live.status]}
					</span>

					{#if live.superseded}
						<span
							class="inline-flex items-center rounded-full border border-superseded bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground"
						>
							Superseded
						</span>
					{/if}

					{#if showBar && qbit}
						<div class="flex min-w-32 flex-1 items-center gap-2">
							<div class="h-1.5 min-w-12 flex-1 overflow-hidden rounded-full bg-muted">
								<div
									class={cn('h-full rounded-full transition-[width]', TONE_DOT[barTone])}
									style="width: {Math.round(qbit.progress * 100)}%"
								></div>
							</div>
							<span class="shrink-0 text-xs text-muted-foreground tabular-nums">
								{formatProgress(qbit.progress)}{#if formatEta(qbit.eta)}<span>
										· {formatEta(qbit.eta)} left</span
									>{/if}
							</span>
						</div>
					{:else}
						{#each chips as chip (chip)}
							<span class="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground"
								>{chip}</span
							>
						{/each}
					{/if}

					{#if live.created_at}
						<RelativeTime
							iso={live.created_at}
							scope="downloads"
							defaultAbsolute
							class="ml-auto shrink-0 text-xs text-muted-foreground"
						/>
					{/if}
				</div>
			</div>

			<div class="flex shrink-0 items-center gap-0.5">
				<DownloadRowMenu item={live} />
				<Icon
					name="chevron-down"
					size={16}
					class={cn('mt-0.5 text-muted-foreground transition-transform', open && 'rotate-180')}
				/>
			</div>
		</div>
	</div>

	{#if open}
		<div transition:slide={{ duration: 180 }} class="border-t px-4 py-3 pl-5">
			<DownloadDetails item={live} />
		</div>
	{/if}
</div>
