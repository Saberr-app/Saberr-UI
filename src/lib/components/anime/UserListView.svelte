<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { AnimeRow } from '$lib/anilist/row';
	import type {
		AnilistAnimeFormat,
		AnilistAnimeSeason,
		AnilistAnimeStatus,
		UserAnimeListSortBy
	} from '$lib/api/types';
	import {
		ANILIST_ANIME_FORMATS,
		ANILIST_ANIME_SEASONS,
		ANILIST_ANIME_STATUSES
	} from '$lib/api/types';
	import { airingStatusLabel, formatLabel, seasonLabel } from '$lib/anilist/enums';
	import type { ColumnId, ColumnSort } from '$lib/anilist/columns';
	import TriChip from './filter/TriChip.svelte';
	import { userlist, USERLIST_SORT_OPTIONS, type ListTab } from '$lib/stores/userlist.svelte';
	import { selection } from '$lib/stores/selection.svelte';
	import { intersect } from '$lib/utils/infinite-scroll';
	import AnimeCollection from './AnimeCollection.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import SimpleSelect from '$lib/components/settings/SimpleSelect.svelte';
	import { cn } from '$lib/utils';

	let {
		status,
		onOpen,
		initialTracked,
		onTrackedChange
	}: {
		status: ListTab;
		onOpen: (row: AnimeRow) => void;
		/** Seed the tracked filter from the URL (e.g. tracked-page banner); undefined = leave as-is. */
		initialTracked?: boolean;
		/** Reflect a tracked-filter change back to the URL. */
		onTrackedChange?: (value: boolean | null) => void;
	} = $props();

	const tab = $derived(userlist.get(status));
	const selId = $derived(`list:${status}`);

	// Local, debounced search box (seeded once from the tab's preserved query).
	let searchText = $state(untrack(() => userlist.get(status).query));
	let debounce: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		// A ?tracked deep link seeds the filter only when it differs from the tab's preserved state.
		if (
			initialTracked !== undefined &&
			untrack(() => userlist.get(status).isTracked) !== initialTracked
		) {
			selection.reset(selId);
			userlist.setIsTracked(status, initialTracked);
		} else {
			userlist.ensure(status);
		}
		return () => clearTimeout(debounce);
	});

	function onSearch(e: Event & { currentTarget: HTMLInputElement }) {
		searchText = e.currentTarget.value;
		clearTimeout(debounce);
		debounce = setTimeout(() => {
			selection.reset(selId); // new query → different dataset
			userlist.setQuery(status, searchText.trim());
		}, 500);
	}

	const seasonOptions = [
		{ value: '', label: 'Any season' },
		...ANILIST_ANIME_SEASONS.map((s) => ({ value: s, label: seasonLabel(s) }))
	];
	const thisYear = new Date().getFullYear();
	const yearOptions = [
		{ value: '', label: 'Any year' },
		...Array.from({ length: thisYear + 2 - 1940 + 1 }, (_, i) => {
			const y = thisYear + 2 - i;
			return { value: String(y), label: String(y) };
		})
	];

	// Sort changes re-query the server (different ordering) → reset.
	const setSort = (key: string) => {
		selection.reset(selId);
		userlist.setSort(status, key as UserAnimeListSortBy, tab.sortDir);
	};
	const toggleDir = () => {
		selection.reset(selId);
		userlist.setSort(status, tab.sortKey, tab.sortDir === 'asc' ? 'desc' : 'asc');
	};
	const sortLabel = $derived(
		USERLIST_SORT_OPTIONS.find((o) => o.value === tab.sortKey)?.label ?? 'Sort'
	);

	// Server-driven header sort: 1:1 column→UserAnimeListSortBy map. Columns absent aren't sortable.
	const USERLIST_COLUMN_SORT: Partial<Record<ColumnId, UserAnimeListSortBy>> = {
		title: 'title',
		season: 'season_and_year',
		myScore: 'score',
		progress: 'progress',
		episodes: 'episodes',
		next: 'time_until_airing',
		started: 'started_at',
		completed: 'completed_at',
		format: 'format',
		airing: 'airing_status',
		repeat: 'repeat_count'
	};
	const columnSort = $derived<ColumnSort>({
		key: tab.sortKey,
		dir: tab.sortDir,
		sortKeyFor: (col) => USERLIST_COLUMN_SORT[col] ?? null,
		onSort: (col) => {
			const key = USERLIST_COLUMN_SORT[col];
			if (!key) return;
			if (tab.sortKey === key) toggleDir();
			else setSort(key);
		}
	});

	const trackedOptions = [
		{ value: '', label: 'Either' },
		{ value: 'tracked', label: 'Tracked' },
		{ value: 'nottracked', label: 'Not tracked' }
	];

	// --- Filter popover (season/year/tracked): draft + Apply, mirroring Browse ---
	let filterOpen = $state(false);
	let isMobile = $state(false);
	onMount(() => {
		const mq = window.matchMedia('(max-width: 767px)');
		const update = () => (isMobile = mq.matches);
		update();
		mq.addEventListener('change', update);
		return () => mq.removeEventListener('change', update);
	});

	// Draft mirrors the SimpleSelect string values; seeded from the committed tab state on open.
	let draftSeason = $state('');
	let draftYear = $state('');
	let draftTracked = $state('');
	let draftAiringStatuses = $state<AnilistAnimeStatus[]>([]);
	let draftFormats = $state<AnilistAnimeFormat[]>([]);

	const activeFilterCount = $derived(
		(tab.season != null ? 1 : 0) +
			(tab.year != null ? 1 : 0) +
			(tab.isTracked != null ? 1 : 0) +
			tab.airingStatuses.length +
			tab.formats.length
	);

	// Toggle a value in/out of a draft include-list.
	function toggle<T>(list: T[], value: T): T[] {
		return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
	}

	function openFilter() {
		draftSeason = tab.season ?? '';
		draftYear = tab.year != null ? String(tab.year) : '';
		draftTracked = tab.isTracked === true ? 'tracked' : tab.isTracked === false ? 'nottracked' : '';
		draftAiringStatuses = [...tab.airingStatuses];
		draftFormats = [...tab.formats];
		filterOpen = true;
	}
	// Set equality (order-insensitive) — the include-lists' order is irrelevant to the query.
	const sameSet = <T,>(a: T[], b: T[]) => a.length === b.length && a.every((v) => b.includes(v));

	// True when the draft differs from the committed tab state — gates the re-query so closing the
	// popover without touching anything doesn't refetch.
	function draftChanged(): boolean {
		return (
			draftSeason !== (tab.season ?? '') ||
			draftYear !== (tab.year != null ? String(tab.year) : '') ||
			draftTracked !==
				(tab.isTracked === true ? 'tracked' : tab.isTracked === false ? 'nottracked' : '') ||
			!sameSet(draftAiringStatuses, tab.airingStatuses) ||
			!sameSet(draftFormats, tab.formats)
		);
	}

	function applyFilter() {
		if (!draftChanged()) {
			filterOpen = false;
			return;
		}
		selection.reset(selId);
		const val = draftTracked === 'tracked' ? true : draftTracked === 'nottracked' ? false : null;
		userlist.setFilters(
			status,
			(draftSeason || null) as AnilistAnimeSeason | null,
			draftYear ? Number(draftYear) : null,
			val,
			draftAiringStatuses,
			draftFormats
		);
		onTrackedChange?.(val); // keep the URL ?tracked in sync
		filterOpen = false;
	}
	function clearFilters() {
		selection.reset(selId);
		userlist.setFilters(status, null, null, null, [], []);
		onTrackedChange?.(null);
		draftSeason = draftYear = draftTracked = '';
		draftAiringStatuses = [];
		draftFormats = [];
		filterOpen = false;
	}
	function onFilterOpenChange(open: boolean) {
		if (open) openFilter();
		else applyFilter(); // closing (click-outside) commits the draft
	}

	const filterTriggerClass = $derived(
		cn(
			'inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm hover:bg-muted',
			activeFilterCount > 0 ? 'border-info/40 text-foreground' : 'text-muted-foreground'
		)
	);
</script>

<div class="space-y-4">
	<!-- The server-driven search + sort/filter are threaded into AnimeCollection's toolbar (via
	     searchSlot/controlsSlot) so they share the browse-style row 1 (select · refresh · search). -->
	<AnimeCollection
		rows={tab.items}
		context="userlist"
		loading={tab.loading}
		refreshing={tab.loading || tab.loadingMore || tab.refreshing}
		enableSearch={false}
		enableSort={false}
		enableGroup={false}
		enableFilter={false}
		enableSelection
		enableTracking
		selectionId={selId}
		defaultView="list"
		{onOpen}
		onRefresh={() => userlist.refresh(status)}
		emptyLabel="Nothing in this list yet."
		{searchSlot}
		{controlsSlot}
		{columnSort}
		{footer}
	/>
</div>

{#snippet searchSlot()}
	<div class="relative flex-1 sm:w-64 sm:flex-none">
		<Icon
			name="search"
			size={15}
			class="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
		/>
		<Input
			value={searchText}
			oninput={onSearch}
			placeholder="Search this list…"
			class="h-8 w-full pl-8"
		/>
	</div>
{/snippet}

{#snippet controlsSlot()}
	<!-- Row (mobile): sort · filter — flattens into the desktop toolbar row via sm:contents -->
	<div class="flex flex-wrap items-center justify-center gap-2 sm:contents">
		<!-- Sort + direction (matches Browse/Tracked) -->
		<div class="inline-flex">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger
					class="inline-flex h-8 items-center gap-1.5 rounded-l-lg border border-border px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					<Icon name="arrow-down-up" size={15} />
					<span>Sort: {sortLabel}</span>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content class="w-48" align="end">
					{#each USERLIST_SORT_OPTIONS as opt (opt.value)}
						<DropdownMenu.Item onSelect={() => setSort(opt.value)}>
							<span class="flex-1">{opt.label}</span>
							{#if tab.sortKey === opt.value}<Icon name="check" size={14} />{/if}
						</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
			<button
				type="button"
				onclick={toggleDir}
				class="inline-flex size-8 items-center justify-center rounded-r-lg border border-l-0 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
				title={tab.sortDir === 'asc' ? 'Ascending' : 'Descending'}
				aria-label="Toggle sort direction"
			>
				<Icon name={tab.sortDir === 'asc' ? 'sort-asc' : 'sort-desc'} size={15} />
			</button>
		</div>

		<!-- Filter (season/year/tracked) -->
		{#if activeFilterCount > 0}
			<Button type="button" variant="ghost" size="sm" onclick={clearFilters}>Clear filters</Button>
		{/if}
		{#if isMobile}
			<Sheet.Root bind:open={filterOpen} onOpenChange={onFilterOpenChange}>
				<Sheet.Trigger class={filterTriggerClass}>
					{@render filterTriggerInner()}
				</Sheet.Trigger>
				<Sheet.Content side="right" class="w-full p-0 sm:max-w-sm">
					{@render filterPanel()}
				</Sheet.Content>
			</Sheet.Root>
		{:else}
			<Popover.Root bind:open={filterOpen} onOpenChange={onFilterOpenChange}>
				<Popover.Trigger class={filterTriggerClass}>
					{@render filterTriggerInner()}
				</Popover.Trigger>
				<Popover.Content align="end" class="w-80 p-0">
					{@render filterPanel()}
				</Popover.Content>
			</Popover.Root>
		{/if}
	</div>
{/snippet}

{#snippet filterTriggerInner()}
	<Icon name="filter" size={15} />
	Filter
	{#if activeFilterCount > 0}
		<span
			class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-info/15 px-1 text-xs font-semibold text-info"
			>{activeFilterCount}</span
		>
	{/if}
{/snippet}

{#snippet filterPanel()}
	<div class="flex max-h-[70vh] flex-col">
		<div class="flex-1 space-y-4 overflow-y-auto px-4 py-3">
			<div class="space-y-1.5">
				<h4 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Season</h4>
				<div class="flex gap-2">
					<div class="flex-1">
						<SimpleSelect bind:value={draftSeason} options={seasonOptions} />
					</div>
					<div class="w-28">
						<SimpleSelect bind:value={draftYear} options={yearOptions} contentClass="max-h-72" />
					</div>
				</div>
			</div>
			<div class="space-y-1.5">
				<h4 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
					Tracking status
				</h4>
				<SimpleSelect bind:value={draftTracked} options={trackedOptions} />
			</div>
			<div class="space-y-1.5">
				<h4 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
					Airing status
				</h4>
				<div class="flex flex-wrap gap-1.5">
					{#each ANILIST_ANIME_STATUSES as s (s)}
						<TriChip
							label={airingStatusLabel(s)}
							state={draftAiringStatuses.includes(s) ? 'include' : undefined}
							onclick={() => (draftAiringStatuses = toggle(draftAiringStatuses, s))}
						/>
					{/each}
				</div>
			</div>
			<div class="space-y-1.5">
				<h4 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Format</h4>
				<div class="flex flex-wrap gap-1.5">
					{#each ANILIST_ANIME_FORMATS as f (f)}
						<TriChip
							label={formatLabel(f)}
							state={draftFormats.includes(f) ? 'include' : undefined}
							onclick={() => (draftFormats = toggle(draftFormats, f))}
						/>
					{/each}
				</div>
			</div>
		</div>
		<div class="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
			<button
				type="button"
				class="text-sm font-medium text-muted-foreground hover:text-foreground"
				onclick={clearFilters}
			>
				Clear all{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
			</button>
			<Button
				type="button"
				variant="affirmative"
				class="h-9 px-5 text-sm sm:h-7 sm:px-3 sm:text-xs"
				onclick={applyFilter}>Apply</Button
			>
		</div>
	</div>
{/snippet}

{#snippet footer()}
	{#if tab.items.length > 0}
		{#if tab.reachedEnd}
			<p class="py-6 text-center text-sm text-muted-foreground">You've reached the end.</p>
		{:else}
			<div
				class="flex justify-center py-6 text-sm text-muted-foreground"
				use:intersect={{ onIntersect: () => userlist.loadMore(status), disabled: tab.loadingMore }}
			>
				{#if tab.loadingMore}
					<span class="flex items-center gap-2">
						<Icon name="spinner" size={14} class="animate-spin" />
						Loading more…
					</span>
				{/if}
			</div>
		{/if}
	{/if}
{/snippet}
