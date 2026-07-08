<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { AnimeRow } from '$lib/anilist/row';
	import { rowMutationContext } from '$lib/anilist/row';
	import type { SelectionCtl } from '$lib/stores/selection.svelte';
	import type { TrackingMenuCtl } from '$lib/tracked/menu';
	import { contextMenu } from '$lib/stores/context-menu.svelte';
	import { displayTitle, secondaryTitle } from '$lib/anilist/titles';
	import { seasonYearLabel } from '$lib/anilist/enums';
	import { formatFuzzyDate } from '$lib/anilist/dates';
	import { isScoreSet } from '$lib/anilist/score';
	import { flagUrl, countryName } from '$lib/anilist/country';
	import {
		columnDef,
		columnLabel,
		type ColumnId,
		type ColumnSort,
		type CollectionContext
	} from '$lib/anilist/columns';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';
	import AnimePoster from '../AnimePoster.svelte';
	import AnimeActionsMenu from '../AnimeActionsMenu.svelte';
	import AnimeContextMenu from '../AnimeContextMenu.svelte';
	import SelectControls from '../SelectControls.svelte';
	import StructuringBadge from '$lib/components/settings/StructuringBadge.svelte';
	import FormatBadge from '../FormatBadge.svelte';
	import AiringBadge from '../AiringBadge.svelte';
	import StatusBadge from '../StatusBadge.svelte';
	import ScoreDisplay from '../ScoreDisplay.svelte';
	import AnimeScore from '../AnimeScore.svelte';
	import Popularity from '../Popularity.svelte';
	import NextEpisode from '../NextEpisode.svelte';
	import ProgressControl from '../ProgressControl.svelte';
	import EpisodeProgress from '$lib/components/tracked/EpisodeProgress.svelte';
	import { trackedEpisodeRange } from '$lib/tracked/episode';

	let {
		rows,
		columns,
		context,
		withPoster = true,
		index = false,
		onOpen,
		onEdit,
		onIncrement,
		tracking,
		selection,
		columnSort
	}: {
		rows: AnimeRow[];
		columns: ColumnId[];
		context: CollectionContext;
		withPoster?: boolean;
		/** Show a leading agnostic "#" index column (tracked list). */
		index?: boolean;
		onOpen: (row: AnimeRow) => void;
		onEdit: (row: AnimeRow) => void;
		onIncrement: (row: AnimeRow) => void;
		/** Per-row tracking actions (tracked list + cross-view "Track anime"). */
		tracking?: (row: AnimeRow) => TrackingMenuCtl | undefined;
		selection?: SelectionCtl;
		/** Click-to-sort on column headers; omit to render plain (non-clickable) headers. */
		columnSort?: ColumnSort;
	} = $props();

	const defs = $derived(columns.map((id) => columnDef(id)).filter((d) => d !== undefined));

	// Selection-mode click toggles (or shift-ranges); otherwise open the row.
	function activate(row: AnimeRow, e: MouseEvent) {
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

	const alignClass = (a?: 'left' | 'right' | 'center') =>
		a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

	// Horizontal scroll: native scrollbar hidden, driven by a sticky proxy scrollbar at the viewport
	// bottom (reachable without scrolling to the table's end). Fades show which side has more off-screen.
	let scroller = $state<HTMLElement | null>(null);
	let proxy = $state<HTMLElement | null>(null);
	let atStart = $state(true);
	let atEnd = $state(true);
	let canScroll = $state(false);
	let tableWidth = $state(0);

	function updateScroll() {
		const el = scroller;
		if (!el) return;
		tableWidth = el.scrollWidth;
		canScroll = el.scrollWidth > el.clientWidth + 1;
		atStart = el.scrollLeft <= 1;
		atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
	}

	function onScrollerScroll() {
		updateScroll();
		if (proxy && scroller && proxy.scrollLeft !== scroller.scrollLeft) {
			proxy.scrollLeft = scroller.scrollLeft;
		}
	}
	function onProxyScroll() {
		if (scroller && proxy && scroller.scrollLeft !== proxy.scrollLeft) {
			scroller.scrollLeft = proxy.scrollLeft;
		}
		updateScroll();
	}

	onMount(() => {
		updateScroll();
		const onResize = () => updateScroll();
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});

	// Recompute when the column set or row count changes.
	$effect(() => {
		void defs.length;
		void rows.length;
		updateScroll();
	});
</script>

<div class="relative">
	<div
		bind:this={scroller}
		onscroll={onScrollerScroll}
		class="no-scrollbar overflow-x-auto rounded-xl border border-border"
	>
		<table class="w-full border-collapse text-sm">
			<thead>
				<tr class="text-xs text-muted-foreground">
					{#if index}
						<th
							class="sticky top-0 z-10 w-10 border-b border-border bg-muted px-3 py-2 text-right font-medium"
							>#</th
						>
					{/if}
					{#each defs as def (def.id)}
						{@const sortKey = columnSort?.sortKeyFor(def.id) ?? null}
						{@const sorted = sortKey != null && columnSort!.key === sortKey}
						<th
							class={cn(
								'sticky top-0 z-10 border-b border-border bg-muted px-3 py-2 font-medium whitespace-nowrap',
								alignClass(def.align),
								def.id === 'title' && 'min-w-[62vw] text-left sm:min-w-0'
							)}
							aria-sort={sorted
								? columnSort!.dir === 'asc'
									? 'ascending'
									: 'descending'
								: undefined}
						>
							{#if sortKey != null}
								<button
									type="button"
									onclick={() => columnSort!.onSort(def.id)}
									class="inline-flex items-center gap-1 transition-colors hover:text-foreground"
								>
									{columnLabel(def, context)}
									{#if sorted}
										<Icon name={columnSort!.dir === 'asc' ? 'sort-asc' : 'sort-desc'} size={12} />
									{/if}
								</button>
							{:else}
								{columnLabel(def, context)}
							{/if}
						</th>
					{/each}
					<th class="sticky top-0 z-10 w-10 border-b border-border bg-muted px-2 py-2"></th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row, i (row.anilistId)}
					{@const title = displayTitle(row)}
					{@const selecting = selection?.active ?? false}
					{@const selected = selection?.isSelected(row.anilistId) ?? false}
					{@const track = tracking?.(row)}
					<AnimeContextMenu
						ctx={rowMutationContext(row)}
						idMal={row.idMal}
						tvdbId={row.tvdbId}
						{title}
						titles={{
							english: row.english_title,
							romaji: row.romaji_title,
							native: row.native_title
						}}
						onEdit={() => onEdit(row)}
						onSelect={selection ? () => selection.enter(row) : undefined}
						tracking={track}
						{selecting}
						batch={selection?.batch}
					>
						{#snippet child({ props })}
							<tr
								{...props}
								class={cn(
									'cursor-pointer border-b border-border/60 transition-colors last:border-0',
									selected ? 'bg-brand-light/10 hover:bg-brand-light/20' : 'hover:bg-muted/40',
									props.class as string
								)}
								onclick={(e) => activate(row, e)}
							>
								{#if index}
									<td
										class="px-3 py-2 text-right align-middle text-xs text-muted-foreground tabular-nums"
									>
										{i + 1}
									</td>
								{/if}
								{#each defs as def (def.id)}
									<td
										class={cn(
											'px-3 py-2 align-middle',
											alignClass(def.align),
											def.id === 'title' && 'max-w-[62vw] min-w-[62vw] sm:max-w-[24rem] sm:min-w-0'
										)}
									>
										{#if def.id === 'title'}
											<div class="flex items-center gap-2.5">
												{#if withPoster}
													<AnimePoster
														src={row.coverThumb}
														alt={title}
														isAdult={row.isAdult}
														class="aspect-[2/3] w-8 shrink-0 rounded"
													/>
												{/if}
												<div class="min-w-0">
													<div class="flex items-center gap-1.5">
														<span class="line-clamp-2 font-medium break-words sm:line-clamp-1">
															{title}
														</span>
														{#if row.noDownloads}
															<span
																title="All release groups are disabled — nothing will download"
																class="inline-flex shrink-0 items-center rounded-full border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[0.6rem] font-medium whitespace-nowrap text-warning"
															>
																<Icon name="alert-triangle" size={10} class="mr-0.5" />
																No downloads
															</span>
														{/if}
													</div>
													{#if secondaryTitle(row)}
														<div class="hidden truncate text-xs text-muted-foreground sm:block">
															{secondaryTitle(row)}
														</div>
													{/if}
												</div>
											</div>
										{:else if def.id === 'structure'}
											<StructuringBadge
												type={row.tvdbStructureEnabled ? 'tvdb' : 'anilist'}
												class="h-4"
											/>
										{:else if def.id === 'trackedEpisodes'}
											<span class="whitespace-nowrap tabular-nums">
												{#if row.fromEpisode != null}
													{trackedEpisodeRange(row.fromEpisode, row.episodes)}
												{:else}—{/if}
											</span>
										{:else if def.id === 'episodeProgress'}
											{#if row.episodeStats}
												<EpisodeProgress
													stats={row.episodeStats}
													fromEpisode={row.fromEpisode ?? 1}
													placement="below"
													class="w-28"
												/>
											{:else}
												—
											{/if}
										{:else if def.id === 'showName'}
											<span
												class="line-clamp-1 max-w-48 text-muted-foreground"
												title={row.showFolderName ?? ''}>{row.showFolderName ?? '—'}</span
											>
										{:else if def.id === 'format'}
											{#if row.format}<FormatBadge format={row.format} size="xs" />{:else}—{/if}
										{:else if def.id === 'airing'}
											<AiringBadge status={row.airingStatus} size="xs" />
										{:else if def.id === 'season'}
											<span class="whitespace-nowrap text-muted-foreground"
												>{seasonYearLabel(row.season, row.seasonYear)}</span
											>
										{:else if def.id === 'episodes'}
											{row.episodes ?? '—'}
										{:else if def.id === 'next'}
											<NextEpisode next={row.nextEpisode} size="xs" />
										{:else if def.id === 'meanScore'}
											<AnimeScore score={row.meanScore} size={13} />
										{:else if def.id === 'popularity'}
											<Popularity count={row.popularity} iconSide="right" class="justify-end" />
										{:else if def.id === 'genres'}
											<div class="flex flex-wrap gap-1">
												{#each row.genres.slice(0, 3) as g (g)}
													<span
														class="rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground"
														>{g}</span
													>
												{/each}
											</div>
										{:else if def.id === 'startDate'}
											<span class="whitespace-nowrap text-muted-foreground"
												>{formatFuzzyDate(row.startDate) ?? '—'}</span
											>
										{:else if def.id === 'endDate'}
											<span class="whitespace-nowrap text-muted-foreground"
												>{formatFuzzyDate(row.endDate) ?? '—'}</span
											>
										{:else if def.id === 'studio'}
											<span class="text-muted-foreground">{row.studio ?? '—'}</span>
										{:else if def.id === 'country'}
											{#if row.country}
												<span class="inline-flex items-center" title={countryName(row.country)}>
													<img
														src={flagUrl(row.country)}
														alt={countryName(row.country)}
														class="h-3 rounded-sm"
													/>
												</span>
											{:else}—{/if}
										{:else if def.id === 'myStatus'}
											{#if row.entry}
												<button
													type="button"
													onclick={(e) => {
														e.stopPropagation();
														onEdit(row);
													}}
													title="Edit list entry"
													aria-label="Edit list entry"
													class="-mx-1 inline-flex cursor-pointer rounded-md px-1 py-0.5 transition-colors hover:bg-muted"
												>
													<StatusBadge status={row.entry.status} size="xs" />
												</button>
											{:else}<span class="text-muted-foreground/60">—</span>{/if}
										{:else if def.id === 'progress'}
											{#if row.entry}
												<ProgressControl
													progress={row.entry.progress}
													episodes={row.episodes}
													size="xs"
													onIncrement={() => onIncrement(row)}
												/>
											{:else}<span class="text-muted-foreground/60">—</span>{/if}
										{:else if def.id === 'myScore'}
											{#if row.entry && isScoreSet(row.entry.score)}
												<ScoreDisplay score={row.entry.score} size={13} />
											{:else}<span class="text-muted-foreground/60">—</span>{/if}
										{:else if def.id === 'started'}
											<span class="whitespace-nowrap text-muted-foreground"
												>{(row.entry && formatFuzzyDate(row.entry.started_at)) || '—'}</span
											>
										{:else if def.id === 'completed'}
											<span class="whitespace-nowrap text-muted-foreground"
												>{(row.entry && formatFuzzyDate(row.entry.completed_at)) || '—'}</span
											>
										{:else if def.id === 'repeat'}
											{row.entry?.repeat_count || '—'}
										{:else if def.id === 'private'}
											{#if row.entry?.is_private}<Icon
													name="lock"
													size={14}
													class="mx-auto text-muted-foreground"
												/>{:else}—{/if}
										{:else if def.id === 'notes'}
											<span class="line-clamp-1 max-w-40 text-muted-foreground"
												>{row.entry?.notes ?? '—'}</span
											>
										{:else if def.id === 'tracked'}
											{#if row.trackedAnimeId != null}
												<button
													type="button"
													onclick={(e) => {
														e.stopPropagation();
														goto(`/tracked/${row.trackedAnimeId}`);
													}}
													title="Go to tracked page"
													aria-label="Go to tracked page"
													class="mx-auto inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-amber-600 transition-colors hover:bg-muted dark:text-amber-400"
												>
													<Icon name="tracked" size={15} />
												</button>
											{:else}<span class="text-muted-foreground/40">—</span>{/if}
										{/if}
									</td>
								{/each}
								<td class="px-2 py-2 text-right">
									{#if selecting}
										<div class="flex items-center justify-end gap-1">
											<SelectControls
												{selected}
												onView={() => onOpen(row)}
												onToggle={(e) => selection?.click(row, e)}
											/>
										</div>
									{:else}
										<div class="flex items-center justify-end gap-0.5">
											{#if context === 'userlist'}
												<!-- User list: the quick pencil edits the AniList list entry, not tracking. -->
												<button
													type="button"
													onclick={(e) => {
														e.stopPropagation();
														onEdit(row);
													}}
													aria-label="Edit list entry"
													title="Edit list entry"
													class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
												>
													<Icon name="edit" size={15} />
												</button>
											{:else if track && track.trackedAnimeId != null}
												<button
													type="button"
													onclick={(e) => {
														e.stopPropagation();
														track.onEditTracking();
													}}
													aria-label="Edit tracking"
													title="Edit tracking"
													class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
												>
													<Icon name="edit" size={15} />
												</button>
											{/if}
											<AnimeActionsMenu
												ctx={rowMutationContext(row)}
												idMal={row.idMal}
												tvdbId={row.tvdbId}
												{title}
												titles={{
													english: row.english_title,
													romaji: row.romaji_title,
													native: row.native_title
												}}
												onEdit={() => onEdit(row)}
												onSelect={selection ? () => selection.enter(row) : undefined}
												tracking={track}
											/>
										</div>
									{/if}
								</td>
							</tr>
						{/snippet}
					</AnimeContextMenu>
				{/each}
			</tbody>
		</table>
	</div>

	{#if canScroll && !atStart}
		<div
			class="pointer-events-none absolute inset-y-0 left-0 w-8 rounded-l-xl bg-gradient-to-r from-background to-transparent"
		></div>
	{/if}
	{#if canScroll && !atEnd}
		<div
			class="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-xl bg-gradient-to-l from-background to-transparent"
		></div>
	{/if}

	<!-- Sticky proxy scrollbar: floats at the viewport bottom while the table is in
	     view, so horizontal scroll is reachable without scrolling to the end. -->
	{#if canScroll}
		<div
			bind:this={proxy}
			onscroll={onProxyScroll}
			class="sticky bottom-0 z-20 overflow-x-auto overflow-y-hidden"
		>
			<div style="width: {tableWidth}px; height: 1px;"></div>
		</div>
	{/if}
</div>
