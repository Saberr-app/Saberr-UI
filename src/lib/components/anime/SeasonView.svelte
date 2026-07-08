<script lang="ts">
	import { onMount } from 'svelte';
	import type { AnimeRow } from '$lib/anilist/row';
	import { browse } from '$lib/stores/browse.svelte';
	import { anilistMetadata } from '$lib/stores/anilist-metadata.svelte';
	import { selection } from '$lib/stores/selection.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import AnimeCollection from './AnimeCollection.svelte';
	import SeasonSelector from './SeasonSelector.svelte';

	let { onOpen }: { onOpen: (row: AnimeRow) => void } = $props();

	onMount(() => {
		void anilistMetadata.ensureFresh();
	});

	// Load the selected season (cached after the first time) whenever it changes.
	$effect(() => {
		void browse.load(browse.selSeason, browse.selYear);
	});

	const rows = $derived(browse.rowsFor(browse.selSeason, browse.selYear));
	const firstLoad = $derived(browse.loading && !rows);
	const loadingMore = $derived(browse.loading && !!rows);
</script>

<div class="space-y-4">
	<SeasonSelector
		season={browse.selSeason}
		year={browse.selYear}
		onSelect={(s, y) => {
			// A different season/year is a different dataset → drop any active selection.
			selection.reset('season');
			browse.selSeason = s;
			browse.selYear = y;
		}}
	/>

	{#if firstLoad || loadingMore}
		<p class="flex items-center justify-center gap-2 text-sm text-muted-foreground">
			<Icon name="spinner" size={14} class="animate-spin" />
			Loading {browse.loadedCount || ''} titles…
		</p>
	{/if}

	<AnimeCollection
		rows={rows ?? []}
		context="browse"
		loading={firstLoad}
		refreshing={browse.loading}
		defaultView="list"
		defaultSort={{ key: 'popularity', dir: 'desc' }}
		defaultGroup="format"
		excludeColumns={['season']}
		enableSelection
		enableTracking
		selectionId="season"
		bind:searchText={browse.seasonSearch}
		bind:activeFilter={browse.seasonFilter}
		{onOpen}
		onRefresh={() => browse.load(browse.selSeason, browse.selYear, true)}
		emptyLabel="No anime found for this season."
	/>
</div>
