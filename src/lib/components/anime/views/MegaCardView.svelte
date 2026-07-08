<script lang="ts">
	import type { AnimeRow } from '$lib/anilist/row';
	import type { SelectionCtl } from '$lib/stores/selection.svelte';
	import type { TrackingMenuCtl } from '$lib/tracked/menu';
	import MegaCard from '../MegaCard.svelte';

	let {
		rows,
		onOpen,
		onEdit,
		onIncrement,
		tracking,
		selection
	}: {
		rows: AnimeRow[];
		onOpen: (row: AnimeRow) => void;
		onEdit: (row: AnimeRow) => void;
		onIncrement: (row: AnimeRow) => void;
		tracking?: (row: AnimeRow) => TrackingMenuCtl | undefined;
		selection?: SelectionCtl;
	} = $props();
</script>

<div class="grid items-stretch gap-3 lg:grid-cols-2">
	{#each rows as row (row.anilistId)}
		<MegaCard {row} {onOpen} {onEdit} {onIncrement} {tracking} {selection} />
	{/each}
</div>
