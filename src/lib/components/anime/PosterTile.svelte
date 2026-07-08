<script lang="ts">
	import type { AnimeRow } from '$lib/anilist/row';
	import { rowMutationContext } from '$lib/anilist/row';
	import type { SelectionCtl } from '$lib/stores/selection.svelte';
	import type { TrackingMenuCtl } from '$lib/tracked/menu';
	import { contextMenu } from '$lib/stores/context-menu.svelte';
	import { displayTitle } from '$lib/anilist/titles';
	import { WATCH_STATUS_ACCENT, AIRING_STATUS_ACCENT } from '$lib/anilist/colors';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';
	import AnimePoster from './AnimePoster.svelte';
	import AnimeContextMenu from './AnimeContextMenu.svelte';
	import AnimeActionsMenu from './AnimeActionsMenu.svelte';
	import SelectControls from './SelectControls.svelte';
	import StatusBadge from './StatusBadge.svelte';
	import AnimeScore from './AnimeScore.svelte';
	import ProgressControl from './ProgressControl.svelte';
	import EpisodeProgress from '$lib/components/tracked/EpisodeProgress.svelte';

	let {
		row,
		onOpen,
		onEdit,
		onIncrement,
		tracking,
		trackedContext = false,
		selection
	}: {
		row: AnimeRow;
		onOpen: (row: AnimeRow) => void;
		onEdit: (row: AnimeRow) => void;
		onIncrement: (row: AnimeRow) => void;
		tracking?: (row: AnimeRow) => TrackingMenuCtl | undefined;
		/** On the tracked page: hide the redundant tracked badge. */
		trackedContext?: boolean;
		selection?: SelectionCtl;
	} = $props();

	const track = $derived(tracking?.(row));

	const title = $derived(displayTitle(row));
	const titles = $derived({
		english: row.english_title,
		romaji: row.romaji_title,
		native: row.native_title
	});
	const accent = $derived(
		row.entry ? WATCH_STATUS_ACCENT[row.entry.status] : AIRING_STATUS_ACCENT[row.airingStatus]
	);

	const selecting = $derived(selection?.active ?? false);
	const selected = $derived(selection?.isSelected(row.anilistId) ?? false);

	function activate(e: MouseEvent) {
		// A tap while a context menu is open (or just dismissed it) only closes it.
		if (contextMenu.isOpen || contextMenu.recentlyClosed()) {
			e.preventDefault();
			contextMenu.closeAll();
			return;
		}
		if (selection && (selection.active || e.shiftKey)) {
			e.preventDefault();
			selection.click(row, e);
		} else {
			onOpen(row);
		}
	}
	function onKey(e: KeyboardEvent) {
		if (e.key !== 'Enter' && e.key !== ' ') return;
		e.preventDefault();
		if (selection?.active) selection.click(row, e as unknown as MouseEvent);
		else onOpen(row);
	}
</script>

<AnimeContextMenu
	ctx={rowMutationContext(row)}
	idMal={row.idMal}
	tvdbId={row.tvdbId}
	{title}
	{titles}
	onEdit={() => onEdit(row)}
	onSelect={selection ? () => selection.enter(row) : undefined}
	tracking={track}
	{selecting}
	batch={selection?.batch}
	triggerClass="block min-w-0"
>
	<div role="button" tabindex="0" onclick={activate} onkeydown={onKey} class="group cursor-pointer">
		<div class="relative">
			<AnimePoster
				src={row.coverLarge}
				alt={title}
				isAdult={row.isAdult}
				class={cn(
					'aspect-[2/3] w-full rounded-lg ring-1 ring-border transition-all group-hover:ring-2',
					row.entry && accent.ring,
					selected && 'ring-2 ring-brand-light group-hover:ring-brand'
				)}
			/>

			{#if row.airingStatus === 'RELEASING'}
				<span class="absolute top-1.5 left-1.5 flex size-2.5" title="Airing">
					<span
						class="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75"
					></span>
					<span
						class="relative inline-flex size-2.5 rounded-full bg-emerald-500 ring-2 ring-background"
					></span>
				</span>
			{/if}

			{#if row.trackedAnimeId != null && !trackedContext}
				<span
					class="absolute top-1.5 right-1.5 rounded-md bg-amber-500/90 p-1 text-white shadow"
					title="Tracked by Saberr"
				>
					<Icon name="tracked" size={12} />
				</span>
			{/if}

			<!-- action overlay: hover on desktop, always shown on touch -->
			<div
				class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 rounded-b-lg bg-gradient-to-t from-black/80 via-black/30 to-transparent p-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
			>
				<div class="flex flex-col gap-1">
					{#if row.entry}
						<StatusBadge status={row.entry.status} size="xs" />
						<ProgressControl
							progress={row.entry.progress}
							episodes={row.episodes}
							size="xs"
							onIncrement={() => onIncrement(row)}
							class="text-white"
						/>
					{/if}
				</div>
				{#if selecting}
					<SelectControls
						{selected}
						onView={() => onOpen(row)}
						onToggle={(e) => selection?.click(row, e)}
						buttonClass="bg-background/90 text-foreground shadow hover:bg-background"
					/>
				{:else}
					<AnimeActionsMenu
						ctx={rowMutationContext(row)}
						idMal={row.idMal}
						tvdbId={row.tvdbId}
						{title}
						{titles}
						onEdit={() => onEdit(row)}
						onSelect={selection ? () => selection.enter(row) : undefined}
						tracking={track}
						triggerClass="bg-background/90 text-foreground shadow hover:bg-background"
					/>
				{/if}
			</div>
		</div>

		{#if trackedContext && row.episodeStats}
			<EpisodeProgress stats={row.episodeStats} fromEpisode={row.fromEpisode ?? 1} class="mt-1.5" />
		{/if}

		<h3 class="mt-1.5 line-clamp-2 text-xs leading-snug font-medium break-words">{title}</h3>
		<div class="mt-0.5 flex items-center gap-2 text-[0.7rem]">
			<AnimeScore score={row.meanScore} size={12} />
			{#if row.noDownloads}
				<span
					title="All release groups are disabled — nothing will download"
					class="inline-flex items-center text-warning"
				>
					<Icon name="alert-triangle" size={12} />
				</span>
			{/if}
		</div>
	</div>
</AnimeContextMenu>
