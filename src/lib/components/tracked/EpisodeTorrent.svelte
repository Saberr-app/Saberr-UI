<script lang="ts">
	import type { TorrentItem } from '$lib/api/types';
	import { TORRENT_DOWNLOAD_STATUS_LABELS } from '$lib/api/types';
	import { statusTone, TONE_CHIP, TONE_DOT, TONE_EDGE } from '$lib/tracked/status';
	import { qbitDisplay, formatEta, formatProgress } from '$lib/tracked/qbit';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import Icon from '$lib/components/Icon.svelte';
	import RelativeTime from '$lib/components/RelativeTime.svelte';
	import { cn } from '$lib/utils';

	// One torrent under an expanded episode. The DOWNLOAD lifecycle status is the
	// truth (a failed download reads "failed", never qbit's "completed"); the live qbit
	// line shows only when the client reports a state and we're not yet imported.
	// `kind` places it in the latest/older/other grouping; older + other expose an
	// override action ("Revert" / "Override with") that the parent dialog carries out.
	let {
		torrent,
		kind = 'other',
		onOverride
	}: {
		torrent: TorrentItem;
		kind?: 'latest' | 'older' | 'other';
		onOverride?: () => void;
	} = $props();

	const overrideLabel = $derived(
		kind === 'older'
			? 'Revert to this release'
			: kind === 'other'
				? 'Override with this release'
				: null
	);

	const raw = $derived(torrent.raw_torrent);
	const download = $derived(torrent.download);
	const tone = $derived(statusTone(download?.status));
	const qbitState = $derived(download?.qbit_status ?? null);
	const showQbit = $derived(qbitState != null && download?.status !== 'PROCESSED');
	const qd = $derived(qbitState ? qbitDisplay(qbitState) : null);
	const progress = $derived(download?.qbit_progress ?? null);
	const eta = $derived(formatEta(download?.qbit_eta));

	// Attribute chips (release group / resolution / encoding / source / size). The
	// catch-all "Other" source carries no info, so it's dropped rather than shown.
	const source = $derived(raw.source === 'Other' ? null : raw.source);
	const chips = $derived(
		[raw.release_group, raw.resolution, raw.encoding, source, raw.size].filter(
			(v): v is string => !!v
		)
	);
</script>

<div
	class="relative flex flex-col gap-2 overflow-hidden rounded-lg border border-border bg-background/40 p-3 pl-4"
>
	<div
		class={cn(
			'absolute inset-y-0 left-0 w-1',
			download ? TONE_EDGE[tone] : 'bg-muted-foreground/30'
		)}
	></div>
	<div class="flex items-start gap-2">
		<div class="min-w-0 flex-1">
			<a
				href={raw.web_link}
				target="_blank"
				rel="noopener noreferrer"
				class="line-clamp-2 font-mono text-xs break-all hover:underline"
				title={raw.title}
			>
				{raw.title}
			</a>
			{#if chips.length}
				<div class="mt-1.5 flex flex-wrap items-center gap-1">
					{#each chips as chip (chip)}
						<span class="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground"
							>{chip}</span
						>
					{/each}
				</div>
			{/if}
		</div>
		<div class="flex shrink-0 items-center gap-1">
			{#if download}
				<a
					href={`/downloads?id=${download.id}`}
					class="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					title="Open download"
				>
					<Icon name="external-link" size={13} />
					Download
				</a>
			{/if}
			{#if overrideLabel && onOverride}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						title="More actions"
					>
						<Icon name="more-horizontal" size={16} />
						<span class="sr-only">More actions</span>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-52">
						<DropdownMenu.Item onSelect={onOverride}>
							<Icon name="refresh" size={15} />
							{overrideLabel}
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{/if}
		</div>
	</div>

	<div class="flex flex-col gap-2">
		{#if download}
			<div class="flex flex-wrap items-center gap-2">
				<span
					class={cn(
						'inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-medium',
						TONE_CHIP[tone]
					)}
				>
					{TORRENT_DOWNLOAD_STATUS_LABELS[download.status]}
				</span>
				{#if download.status_details}
					<span class="text-xs text-muted-foreground">{download.status_details}</span>
				{/if}
			</div>
			{#if showQbit && qd}
				<!-- qBittorrent line, below the status chip. -->
				<div class="flex min-w-0 items-center gap-2">
					<Icon name="qbit" size={14} class="shrink-0 text-muted-foreground" />
					<span class="shrink-0 text-xs text-muted-foreground">{qd.label}</span>
					{#if (progress ?? 0) < 1}
						<div class="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-muted">
							<div
								class={cn('h-full rounded-full transition-[width]', TONE_DOT[qd.tone])}
								style="width: {Math.round((progress ?? 0) * 100)}%"
							></div>
						</div>
					{/if}
					<span class="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
						{formatProgress(progress)}{#if eta}<span> · {eta} left</span>{/if}
					</span>
				</div>
			{/if}
		{:else}
			<span class="text-xs text-muted-foreground">Not downloaded</span>
		{/if}
	</div>

	{#if download?.copied_to_destination_path_at}
		<div class="text-xs text-muted-foreground">
			Imported <RelativeTime
				iso={download.copied_to_destination_path_at}
				scope="tracked"
				defaultAbsolute
				class="text-foreground/80"
			/>
		</div>
	{/if}
</div>
