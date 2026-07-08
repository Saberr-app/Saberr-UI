<script lang="ts">
	import { goto } from '$app/navigation';
	import { tracked } from '$lib/stores/tracked.svelte';
	import { status } from '$lib/stores/status.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { rowFromTrackedItem, type AnimeRow } from '$lib/anilist/row';
	import { emptyFilter, type FilterState } from '$lib/anilist/collection';
	import { currentSeason } from '$lib/anilist/dates';
	import { batchSetStatus } from '$lib/anilist/batch-actions';
	import type { TrackedAnimeItem } from '$lib/api/types';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import AnimeCollection from '$lib/components/anime/AnimeCollection.svelte';
	import TrackedBanners from '$lib/components/tracked/TrackedBanners.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';

	let showArchived = $state(false);
	let pageFilter = $state<FilterState>(emptyFilter());
	let adding = $state(false);
	let listEl = $state<HTMLElement | null>(null);

	// Load the relevant list on entry / when toggling archived.
	$effect(() => {
		if (showArchived) tracked.ensureArchived();
		else tracked.ensure();
	});

	const items = $derived<TrackedAnimeItem[]>(showArchived ? tracked.archived : tracked.items);
	const globalPreferred = $derived(settings.current.profile.preferred_release_groups);
	const rows = $derived<AnimeRow[]>(items.map((it) => rowFromTrackedItem(it, globalPreferred)));
	const loaded = $derived(showArchived ? tracked.archivedLoaded : tracked.loaded);
	const loading = $derived(
		showArchived
			? tracked.archivedLoading && !tracked.archivedLoaded
			: tracked.loading && !tracked.loaded
	);
	const refreshing = $derived(showArchived ? tracked.archivedLoading : tracked.loading);

	// Banners (active view only).
	const anilistConfigured = $derived(status.service('anilist')?.error_level !== 'Not Configured');
	const notOnListIds = $derived(
		tracked.items.filter((t) => t.user_entry == null).map((t) => t.anilist_id)
	);
	const finishedCount = $derived(tracked.items.filter((t) => t.anime.status === 'FINISHED').length);

	// Empty-list CTA → current season (ignoring the usual 2-week shift).
	const seasonParam = $derived.by(() => {
		const { season, year } = currentSeason(new Date(), 0);
		return `${season.charAt(0)}${season.slice(1).toLowerCase()}${year}`;
	});

	function onOpen(row: AnimeRow) {
		if (row.trackedAnimeId != null) goto(`/tracked/${row.trackedAnimeId}`);
	}
	function onRefresh() {
		if (showArchived) tracked.refreshArchived();
		else tracked.refresh();
	}
	function toggleArchived() {
		showArchived = !showArchived;
		pageFilter = emptyFilter();
	}

	function scrollToList() {
		listEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
	function showNotOnList() {
		pageFilter = { ...emptyFilter(), notOnList: true };
		scrollToList();
	}
	function showFinished() {
		pageFilter = { ...emptyFilter(), status: { FINISHED: 'include' } };
		scrollToList();
	}
	async function addAllToWatching() {
		if (notOnListIds.length === 0) return;
		adding = true;
		try {
			await batchSetStatus(notOnListIds, 'CURRENT');
		} catch {
			/* HTTP client toasted */
		} finally {
			adding = false;
		}
	}
</script>

<PageHeader title="Tracked Anime" icon="tracked">
	{#snippet actions()}
		<button
			type="button"
			onclick={toggleArchived}
			class={cn(
				'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm transition-colors',
				showArchived
					? 'border-brand/40 bg-brand-light/10 text-foreground'
					: 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
			)}
		>
			<Icon name="archive" size={15} />
			{showArchived ? 'Viewing archived' : 'Show archived'}
		</button>
	{/snippet}
</PageHeader>

<div class="mt-4">
	{#if !showArchived}
		<TrackedBanners
			notOnListCount={notOnListIds.length}
			{anilistConfigured}
			releasingWatchingCount={tracked.releasingWatchingNotTracked}
			releasingPlanningCount={tracked.releasingPlanningNotTracked}
			{finishedCount}
			onShowNotOnList={showNotOnList}
			onAddAllToWatching={addAllToWatching}
			onShowFinished={showFinished}
			{adding}
		/>
	{/if}

	<div bind:this={listEl}>
		{#if items.length === 0 && !loading && loaded}
			{#if showArchived}
				<div
					class="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center text-muted-foreground"
				>
					<Icon name="archive" size={32} class="opacity-40" />
					<p>No archived tracked anime.</p>
				</div>
			{:else}
				<div
					class="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/30 px-6 py-16 text-center"
				>
					<div
						class="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-light to-brand text-white shadow-sm"
					>
						<Icon name="tracked" size={26} />
					</div>
					<div class="space-y-1">
						<h2 class="text-lg font-semibold">You aren't tracking any anime yet</h2>
						<p class="max-w-md text-sm text-muted-foreground">
							Browse the current season and start tracking shows you want Saberr to download
							automatically.
						</p>
					</div>
					<Button href={`/browse?tab=season&season=${seasonParam}`}>
						<Icon name="browse" size={16} />
						Explore this season
					</Button>
				</div>
			{/if}
		{:else}
			<AnimeCollection
				{rows}
				context="tracked"
				defaultView="list"
				defaultGroup="airing_status"
				defaultSort={{ key: 'next', dir: 'asc' }}
				{loading}
				{onOpen}
				{onRefresh}
				{refreshing}
				enableSelection
				refreshLabel="Force refresh"
				selectionId={showArchived ? 'tracked:archived' : 'tracked'}
				enableTracking
				archivedView={showArchived}
				showIndex
				resolveTrackedItem={(row) => tracked.find(row.anilistId)}
				bind:activeFilter={pageFilter}
				onTrackSaved={(item) => tracked.upsert(item)}
				onArchived={(row) => tracked.removeActiveByAnilist([row.anilistId])}
				onUnarchived={(row) => tracked.removeArchivedByAnilist([row.anilistId])}
				onDeleted={(row) =>
					showArchived
						? tracked.removeArchivedByAnilist([row.anilistId])
						: tracked.removeActiveByAnilist([row.anilistId])}
				onBatchArchived={(ids) => tracked.removeActiveByAnilist(ids)}
				onBatchDeleted={(ids) =>
					showArchived ? tracked.removeArchivedByAnilist(ids) : tracked.removeActiveByAnilist(ids)}
				emptyLabel="No tracked anime match your filters."
			/>
		{/if}
	</div>
</div>
