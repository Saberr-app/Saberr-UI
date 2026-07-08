<script lang="ts">
	/* Mapping-overrides section: header + Add, the list (or empty state), and the add/edit dialog
	   + delete confirm. Reads/mutates the shared mappings store. */
	import { mappings } from '$lib/stores/mappings.svelte';
	import type { MappingOverrideItem } from '$lib/api/types';
	import { deleteMappingOverride } from '$lib/api/mappings';
	import { notifySuccess } from '$lib/api/notify';
	import { Button } from '$lib/components/ui/button';
	import Icon from '$lib/components/Icon.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import MappingOverrideRow from './MappingOverrideRow.svelte';
	import MappingOverrideDialog from './MappingOverrideDialog.svelte';

	let dialogOpen = $state(false);
	let editing = $state<MappingOverrideItem | null>(null);
	let deleteOpen = $state(false);
	let deleting = $state<MappingOverrideItem | null>(null);

	const overrides = $derived(mappings.overrides);

	function add() {
		editing = null;
		dialogOpen = true;
	}
	function edit(item: MappingOverrideItem) {
		editing = item;
		dialogOpen = true;
	}
	function askDelete(item: MappingOverrideItem) {
		deleting = item;
		deleteOpen = true;
	}
	async function confirmDelete() {
		if (!deleting) return;
		await deleteMappingOverride(deleting.id);
		mappings.remove(deleting.id);
		notifySuccess('Mapping override deleted.');
	}
</script>

<div class="flex flex-col gap-3">
	<div class="flex items-center justify-between">
		<h2 class="text-sm font-semibold">
			Mapping overrides
			<span class="ml-1 font-normal text-muted-foreground">· {overrides.length}</span>
		</h2>
		<Button type="button" size="sm" onclick={add}>
			<Icon name="plus" size={16} />
			Add
		</Button>
	</div>

	{#if overrides.length === 0}
		<div
			class="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground"
		>
			No mapping overrides yet.
			<button type="button" onclick={add} class="text-info hover:underline">Add one</button>
			to correct a wrong or missing mapping.
		</div>
	{:else}
		<div class="flex flex-col gap-2.5">
			{#each overrides as item (item.id)}
				<MappingOverrideRow {item} onEdit={edit} onDelete={askDelete} />
			{/each}
		</div>
	{/if}
</div>

<MappingOverrideDialog bind:open={dialogOpen} {editing} />

<ConfirmDialog
	bind:open={deleteOpen}
	title="Delete mapping override?"
	description="This override will be removed. Saberr will fall back to the default AniBridge mapping."
	confirmLabel="Delete"
	destructive
	onConfirm={confirmDelete}
/>
