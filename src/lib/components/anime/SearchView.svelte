<script lang="ts">
	import { onMount } from 'svelte';
	import type { AnimeRow } from '$lib/anilist/row';
	import { browse } from '$lib/stores/browse.svelte';
	import { anilistMetadata } from '$lib/stores/anilist-metadata.svelte';
	import { selection } from '$lib/stores/selection.svelte';
	import {
		SEARCH_SORT_OPTIONS,
		defaultSearchForm,
		type SearchForm,
		type SearchSortKey
	} from '$lib/anilist/search';
	import { emptyFilter, filterCount } from '$lib/anilist/collection';
	import { ANILIST_ANIME_SEASONS, type AnilistAnimeSeason } from '$lib/api/types';
	import { seasonLabel } from '$lib/anilist/enums';
	import { intersect } from '$lib/utils/infinite-scroll';
	import AnimeCollection from './AnimeCollection.svelte';
	import FilterPanel from './filter/FilterPanel.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import SimpleSelect from '$lib/components/settings/SimpleSelect.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import * as Sheet from '$lib/components/ui/sheet';
	import { cn } from '$lib/utils';

	let { onOpen }: { onOpen: (row: AnimeRow) => void } = $props();

	// Pending (draft) form, seeded from the store's last applied form so controls + results survive nav.
	let form = $state<SearchForm>(
		browse.searchForm ? structuredClone($state.snapshot(browse.searchForm)) : defaultSearchForm()
	);

	let isMobile = $state(false);
	let filterOpen = $state(false);

	onMount(() => {
		void anilistMetadata.ensureFresh();
		// Show trending on first open; re-run if the preserved results aged past the TTL.
		if (!browse.searchForm || browse.isSearchStale()) {
			browse.runSearch(structuredClone($state.snapshot(form)));
		}

		const mq = window.matchMedia('(max-width: 767px)');
		const update = () => (isMobile = mq.matches);
		update();
		mq.addEventListener('change', update);
		return () => mq.removeEventListener('change', update);
	});

	const fCount = $derived(filterCount(form.filter));

	const seasonOptions = [
		{ value: '', label: 'Any season' },
		...ANILIST_ANIME_SEASONS.map((s) => ({ value: s, label: seasonLabel(s) }))
	];
	// Newest (this year + 2) at the top, down to 1940 — themed dropdown, capped height.
	const thisYear = new Date().getFullYear();
	const yearOptions = [
		{ value: '', label: 'Any year' },
		...Array.from({ length: thisYear + 2 - 1940 + 1 }, (_, i) => {
			const y = thisYear + 2 - i;
			return { value: String(y), label: String(y) };
		})
	];

	/** Commit the current draft → a fresh server search. */
	function submit() {
		// A new query is a different dataset → drop any active selection.
		selection.reset('search');
		browse.runSearch(structuredClone($state.snapshot(form)));
	}
	function onSearchKey(e: KeyboardEvent) {
		if (e.key === 'Enter') submit();
	}
	// Sort / direction / season / year apply immediately (cheap, expected to feel live).
	function setSort(v: string) {
		form.sortKey = v as SearchSortKey;
		submit();
	}
	function toggleDir() {
		form.sortDir = form.sortDir === 'asc' ? 'desc' : 'asc';
		submit();
	}
	function setSeason(v: string) {
		form.season = (v || null) as AnilistAnimeSeason | null;
		submit();
	}
	function setYear(v: string) {
		form.seasonYear = v ? Number(v) : null;
		submit();
	}
	function applyFilter() {
		filterOpen = false;
		submit();
	}
	// Clear all filters → reset the filter portion and re-run immediately.
	function clearFilters() {
		form.filter = emptyFilter();
		filterOpen = false;
		submit();
	}
</script>

<div class="space-y-5">
	<!-- Search section (deliberately not centered on the bar — empty query is fine) -->
	<section class="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
		<div class="flex flex-col gap-2 sm:flex-row">
			<div class="relative flex-1">
				<Icon
					name="search"
					size={18}
					class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					bind:value={form.query}
					onkeydown={onSearchKey}
					placeholder="Search anime by title…"
					class="h-11 pl-10 text-base"
				/>
			</div>
			<Button type="button" variant="affirmative" class="h-11 px-6" onclick={submit}>
				<Icon name="search" size={16} />
				Search
			</Button>
		</div>

		<!-- Request options: grouped + centered. Query commits on Enter/Search; sort,
		     direction, season and year apply immediately; filters apply on Apply. -->
		<div class="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
			<!-- Sort + direction -->
			<div class="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
				<div class="w-40">
					<SimpleSelect
						value={form.sortKey}
						options={SEARCH_SORT_OPTIONS}
						onValueChange={setSort}
					/>
				</div>
				<button
					type="button"
					onclick={toggleDir}
					class="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
					title={form.sortDir === 'asc' ? 'Ascending' : 'Descending'}
					aria-label="Toggle sort direction"
				>
					<Icon name={form.sortDir === 'asc' ? 'sort-asc' : 'sort-desc'} size={15} />
				</button>
			</div>

			<!-- Season + year -->
			<div class="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
				<div class="w-36">
					<SimpleSelect
						value={form.season ?? ''}
						options={seasonOptions}
						onValueChange={setSeason}
					/>
				</div>
				<div class="w-28">
					<SimpleSelect
						value={form.seasonYear != null ? String(form.seasonYear) : ''}
						options={yearOptions}
						onValueChange={setYear}
						contentClass="max-h-72"
					/>
				</div>
			</div>

			<!-- Filters (status / format / source / genres / tags / on-list) -->
			<div class="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
				{#if isMobile}
					<Sheet.Root bind:open={filterOpen}>
						<Sheet.Trigger
							class={cn(
								'inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm hover:bg-muted',
								fCount > 0 ? 'border-info/40 text-foreground' : 'text-muted-foreground'
							)}
						>
							<Icon name="filter" size={15} />
							Filters
							{#if fCount > 0}
								<span
									class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-info/15 px-1 text-xs font-semibold text-info"
									>{fCount}</span
								>
							{/if}
						</Sheet.Trigger>
						<Sheet.Content side="right" class="w-full p-0 sm:max-w-sm">
							<FilterPanel
								bind:draft={form.filter}
								genres={anilistMetadata.genres}
								categoryToTags={anilistMetadata.categoryToTags}
								searchMode
								onApply={applyFilter}
								onClear={clearFilters}
							/>
						</Sheet.Content>
					</Sheet.Root>
				{:else}
					<Popover.Root bind:open={filterOpen}>
						<Popover.Trigger
							class={cn(
								'inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm hover:bg-muted',
								fCount > 0 ? 'border-info/40 text-foreground' : 'text-muted-foreground'
							)}
						>
							<Icon name="filter" size={15} />
							Filters
							{#if fCount > 0}
								<span
									class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-info/15 px-1 text-xs font-semibold text-info"
									>{fCount}</span
								>
							{/if}
						</Popover.Trigger>
						<Popover.Content align="start" class="w-96 p-0">
							<FilterPanel
								bind:draft={form.filter}
								genres={anilistMetadata.genres}
								categoryToTags={anilistMetadata.categoryToTags}
								searchMode
								onApply={applyFilter}
								onClear={clearFilters}
							/>
						</Popover.Content>
					</Popover.Root>
				{/if}

				{#if fCount > 0}
					<Button type="button" variant="ghost" size="sm" onclick={clearFilters}>Clear</Button>
				{/if}
			</div>
		</div>
	</section>

	<!-- Results: the shared engine in server mode (view + columns client-side only) -->
	<AnimeCollection
		rows={browse.searchResults}
		context="browse"
		loading={browse.searchLoading}
		refreshing={browse.searchLoading || browse.searchLoadingMore}
		refreshLabel="Force refresh"
		enableSearch={false}
		enableSort={false}
		enableGroup={false}
		enableFilter={false}
		enableSelection
		enableTracking
		selectionId="search"
		defaultView="list"
		{onOpen}
		onRefresh={() => browse.refreshSearch()}
		emptyLabel="No anime matched your search."
		{footer}
	/>
</div>

{#snippet footer()}
	{#if browse.searchResults.length > 0}
		{#if browse.searchReachedEnd}
			<p class="py-6 text-center text-sm text-muted-foreground">
				{browse.searchError ? 'Could not load more results.' : "You've reached the end."}
			</p>
		{:else if browse.searchGated}
			<div class="flex justify-center py-6">
				<Button type="button" variant="outline" onclick={() => browse.loadMoreClicked()}>
					Load more
				</Button>
			</div>
		{:else}
			<div
				class="flex justify-center py-6 text-sm text-muted-foreground"
				use:intersect={{
					onIntersect: () => browse.loadMoreOnScroll(),
					disabled: browse.searchLoadingMore
				}}
			>
				{#if browse.searchLoadingMore}
					<span class="flex items-center gap-2">
						<Icon name="spinner" size={14} class="animate-spin" />
						Loading more…
					</span>
				{/if}
			</div>
		{/if}
	{/if}
{/snippet}
