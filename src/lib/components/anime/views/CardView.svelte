<script lang="ts">
	import type { AnimeRow } from '$lib/anilist/row';
	import type { SelectionCtl } from '$lib/stores/selection.svelte';
	import type { TrackingMenuCtl } from '$lib/tracked/menu';
	import AnimeCard from '../AnimeCard.svelte';

	let {
		rows,
		onOpen,
		onEdit,
		onIncrement,
		tracking,
		trackedContext = false,
		selection
	}: {
		rows: AnimeRow[];
		onOpen: (row: AnimeRow) => void;
		onEdit: (row: AnimeRow) => void;
		onIncrement: (row: AnimeRow) => void;
		tracking?: (row: AnimeRow) => TrackingMenuCtl | undefined;
		trackedContext?: boolean;
		selection?: SelectionCtl;
	} = $props();
</script>

<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
	{#each rows as row (row.anilistId)}
		<AnimeCard {row} {onOpen} {onEdit} {onIncrement} {tracking} {trackedContext} {selection} />
	{/each}
</div>
