<script lang="ts">
	import type { AnimeRow } from '$lib/anilist/row';
	import { rowMutationContext } from '$lib/anilist/row';
	import type { SelectionCtl } from '$lib/stores/selection.svelte';
	import type { TrackingMenuCtl } from '$lib/tracked/menu';
	import { contextMenu } from '$lib/stores/context-menu.svelte';
	import { displayTitle, secondaryTitle } from '$lib/anilist/titles';
	import { seasonYearLabel, sourceLabel } from '$lib/anilist/enums';
	import { descriptionText } from '$lib/anilist/description';
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

	let {
		row,
		onOpen,
		onEdit,
		onIncrement,
		tracking,
		selection
	}: {
		row: AnimeRow;
		onOpen: (row: AnimeRow) => void;
		onEdit: (row: AnimeRow) => void;
		onIncrement: (row: AnimeRow) => void;
		tracking?: (row: AnimeRow) => TrackingMenuCtl | undefined;
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
	const synopsis = $derived(descriptionText(row.description));

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
	// Significant tags only: rank > 50, top 10 by rank, no rank shown (per spec).
	const tags = $derived(
		[...row.tags]
			.sort((a, b) => b.rank - a.rank)
			.filter((t) => t.rank > 50)
			.slice(0, 10)
	);

	function edit(e: MouseEvent) {
		e.stopPropagation();
		onEdit(row);
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
			'group relative flex h-full cursor-pointer gap-4 overflow-hidden rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-4',
			selected
				? 'border-brand-light bg-brand-light/5 ring-2 ring-brand-light hover:bg-brand-light/10'
				: 'border-border bg-card hover:border-foreground/15'
		)}
	>
		<span class={cn('absolute inset-y-0 left-0 w-1', accent.edge)}></span>

		<AnimePoster
			src={row.coverLarge}
			alt={title}
			isAdult={row.isAdult}
			class="aspect-[2/3] w-28 shrink-0 rounded-lg sm:w-36"
		/>

		<div class="flex min-w-0 flex-1 flex-col gap-2">
			<div>
				<h3 class="line-clamp-1 text-base leading-tight font-semibold sm:text-lg">{title}</h3>
				{#if secondary}
					<p class="line-clamp-1 text-xs text-muted-foreground">{secondary}</p>
				{/if}
			</div>

			<div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
				{#if row.format}<FormatBadge format={row.format} size="xs" />{/if}
				<AiringBadge status={row.airingStatus} size="xs" />
				{#if row.season || row.seasonYear}
					<span class="text-muted-foreground">{seasonYearLabel(row.season, row.seasonYear)}</span>
				{/if}
				<AnimeScore score={row.meanScore} size={13} />
				<Popularity count={row.popularity} iconSide="left" />
				<NextEpisode next={row.nextEpisode} size="xs" />
			</div>

			<div class="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
				{#if row.episodes != null}<span>{row.episodes} eps</span>{/if}
				{#if row.source}<span>{sourceLabel(row.source)}</span>{/if}
				{#if row.studio}
					<span class="inline-flex items-center gap-1 truncate">
						<Icon name="settings" size={11} class="opacity-70" />
						{row.studio}
					</span>
				{/if}
			</div>

			{#if synopsis}
				<p class="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{synopsis}</p>
			{/if}

			{#if row.genres.length > 0}
				<div class="flex flex-wrap gap-1">
					{#each row.genres.slice(0, 6) as g (g)}
						<span class="rounded-full border border-border px-2 py-0.5 text-[0.65rem] font-medium">
							{g}
						</span>
					{/each}
				</div>
			{/if}

			{#if tags.length > 0}
				<div class="flex flex-wrap gap-1">
					{#each tags as t (t.name)}
						{@const spoiler = t.is_media_spoiler || t.is_general_spoiler}
						<span
							class="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground"
							title={spoiler ? `Spoiler — ${t.name}` : t.name}
						>
							<span class={cn(spoiler && 'blur-[4px] transition select-none hover:blur-none')}>
								{t.name}
							</span>
						</span>
					{/each}
				</div>
			{/if}

			{#if row.entry}
				<div class="mt-auto flex flex-wrap items-center gap-2 pt-1">
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
		</div>

		{#if row.trackedAnimeId != null}
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
				<button
					type="button"
					onclick={edit}
					class="hidden rounded-md border border-border bg-background/80 p-1 text-muted-foreground opacity-0 backdrop-blur transition group-hover:opacity-100 hover:text-foreground sm:inline-flex"
					title={row.entry ? 'Edit list entry' : 'Add to list'}
					aria-label={row.entry ? 'Edit list entry' : 'Add to list'}
				>
					<Icon name={row.entry ? 'edit' : 'plus'} size={14} />
				</button>
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
