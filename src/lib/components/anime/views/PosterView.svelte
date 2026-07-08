<script lang="ts">
	import type { AnimeRow } from '$lib/anilist/row';
	import type { SelectionCtl } from '$lib/stores/selection.svelte';
	import type { TrackingMenuCtl } from '$lib/tracked/menu';
	import PosterTile from '../PosterTile.svelte';

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

<div
	class="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8"
>
	{#each rows as row (row.anilistId)}
		<PosterTile {row} {onOpen} {onEdit} {onIncrement} {tracking} {trackedContext} {selection} />
	{/each}
</div>
