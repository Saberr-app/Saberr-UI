<script lang="ts">
	import type { AnimeRow } from '$lib/anilist/row';
	import { rowMutationContext } from '$lib/anilist/row';
	import type { SelectionCtl } from '$lib/stores/selection.svelte';
	import type { TrackingMenuCtl } from '$lib/tracked/menu';
	import { contextMenu } from '$lib/stores/context-menu.svelte';
	import { displayTitle, secondaryTitle } from '$lib/anilist/titles';
	import { seasonYearLabel } from '$lib/anilist/enums';
	import { WATCH_STATUS_ACCENT, AIRING_STATUS_ACCENT } from '$lib/anilist/colors';
	import { isScoreSet } from '$lib/anilist/score';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';
	import AnimePoster from './AnimePoster.svelte';
	import AnimeContextMenu from './AnimeContextMenu.svelte';
	import AnimeActionsMenu from './AnimeActionsMenu.svelte';
	import SelectControls from './SelectControls.svelte';
	import FormatBadge from './FormatBadge.svelte';
	import AiringBadge from './AiringBadge.svelte';
	import StatusBadge from './StatusBadge.svelte';
	import ScoreDisplay from './ScoreDisplay.svelte';
	import AnimeScore from './AnimeScore.svelte';
	import Popularity from './Popularity.svelte';
	import NextEpisode from './NextEpisode.svelte';
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
		/** On the tracked page: hide the redundant tracked badge + edit the tracking, not the list. */
		trackedContext?: boolean;
		selection?: SelectionCtl;
	} = $props();

	const track = $derived(tracking?.(row));

	const title = $derived(displayTitle(row));
	const secondary = $derived(secondaryTitle(row));
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

	// In selection mode a plain (or shift) click toggles instead of opening; a
	// shift-click outside selection mode enters it (range from the anchor).
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

	function edit(e: MouseEvent) {
		e.stopPropagation();
		// On the tracked page the pencil edits the tracking, not the AniList list entry.
		if (trackedContext && track) track.onEditTracking();
		else onEdit(row);
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
	<div
		role="button"
		tabindex="0"
		onclick={activate}
		onkeydown={onKey}
		class={cn(
			'group relative flex cursor-pointer gap-3 overflow-hidden rounded-xl border p-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md',
			selected
				? 'border-brand-light bg-brand-light/5 ring-2 ring-brand-light hover:bg-brand-light/10'
				: 'border-border bg-card hover:border-foreground/15'
		)}
	>
		<span class={cn('absolute inset-y-0 left-0 w-1', accent.edge)}></span>

		<AnimePoster
			src={row.cover}
			alt={title}
			isAdult={row.isAdult}
			class="aspect-[2/3] w-[4.75rem] shrink-0 rounded-lg"
		/>

		<div class="flex min-w-0 flex-1 flex-col">
			<h3 class="truncate text-sm leading-tight font-semibold">{title}</h3>
			{#if secondary}
				<p class="truncate text-xs text-muted-foreground">{secondary}</p>
			{/if}

			<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
				{#if row.format}<FormatBadge format={row.format} size="xs" />{/if}
				<AiringBadge status={row.airingStatus} size="xs" />
				{#if row.season || row.seasonYear}
					<span class="text-[0.7rem] text-muted-foreground">
						{seasonYearLabel(row.season, row.seasonYear)}
					</span>
				{/if}
				{#if row.noDownloads}
					<span
						title="All release groups are disabled — nothing will download"
						class="inline-flex items-center gap-0.5 rounded-full border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[0.6rem] font-medium text-warning"
					>
						<Icon name="alert-triangle" size={10} />
						No downloads
					</span>
				{/if}
			</div>

			<div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
				<AnimeScore score={row.meanScore} />
				<Popularity count={row.popularity} iconSide="left" />
				<NextEpisode next={row.nextEpisode} size="xs" />
			</div>

			{#if row.entry}
				<div class="mt-auto flex flex-wrap items-center gap-2 pt-1.5">
					<StatusBadge status={row.entry.status} size="xs" />
					<ProgressControl
						progress={row.entry.progress}
						episodes={row.episodes}
						size="xs"
						onIncrement={() => onIncrement(row)}
					/>
					{#if isScoreSet(row.entry.score)}
						<ScoreDisplay score={row.entry.score} size={13} />
					{/if}
				</div>
			{/if}

			{#if trackedContext && row.episodeStats}
				<div class={cn('pt-2', !row.entry && 'mt-auto')}>
					<EpisodeProgress stats={row.episodeStats} fromEpisode={row.fromEpisode ?? 1} />
				</div>
			{/if}
		</div>

		{#if row.trackedAnimeId != null && !trackedContext}
			<span
				class="absolute right-2 bottom-2 rounded-md bg-amber-500/15 p-1 text-amber-600 dark:text-amber-400"
				title="Tracked by Saberr"
			>
				<Icon name="tracked" size={13} />
			</span>
		{/if}

		<div class="absolute top-2 right-2 flex items-center gap-1">
			{#if selecting}
				<SelectControls
					{selected}
					onView={() => onOpen(row)}
					onToggle={(e) => selection?.click(row, e)}
					buttonClass="border border-border bg-background/80 backdrop-blur"
				/>
			{:else}
				{@const editLabel = trackedContext
					? 'Edit tracking'
					: row.entry
						? 'Edit list entry'
						: 'Add to list'}
				<button
					type="button"
					onclick={edit}
					class="hidden rounded-md border border-border bg-background/80 p-1 text-muted-foreground opacity-0 backdrop-blur transition group-hover:opacity-100 hover:text-foreground sm:inline-flex"
					title={editLabel}
					aria-label={editLabel}
				>
					<Icon name={!trackedContext && !row.entry ? 'plus' : 'edit'} size={14} />
				</button>
				<!-- Always-tappable actions (touch has no right-click / hover). -->
				<div class="opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
					<AnimeActionsMenu
						ctx={rowMutationContext(row)}
						idMal={row.idMal}
						tvdbId={row.tvdbId}
						{title}
						{titles}
						onEdit={() => onEdit(row)}
						onSelect={selection ? () => selection.enter(row) : undefined}
						tracking={track}
						triggerClass="border border-border bg-background/80 backdrop-blur"
					/>
				</div>
			{/if}
		</div>
	</div>
</AnimeContextMenu>
