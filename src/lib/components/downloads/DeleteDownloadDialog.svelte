<script lang="ts">
	/* Delete-download confirm with per-target options (POST /downloads/{id}/delete). Three
	   separator-divided groups: client+disk · imported file · future auto-download. "Delete from
	   disk" is locked off until "Delete from qBittorrent" is on. State lives here; on confirm it
	   hands the options to the actions controller. */
	import * as Dialog from '$lib/components/ui/dialog';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import Icon from '$lib/components/Icon.svelte';
	import { downloadsActions } from '$lib/stores/downloads-actions.svelte';
	import { cn } from '$lib/utils';

	let deleteFromQbit = $state(true);
	let deleteFromDisk = $state(false);
	let deleteImportedFile = $state(false);
	let discardTorrent = $state(true);

	// "Delete imported file" only applies to a current import — an imported download that hasn't been
	// superseded. Hidden otherwise (and sent implicitly false).
	const showImportedFile = $derived(
		downloadsActions.deleteTarget?.status === 'PROCESSED' &&
			!downloadsActions.deleteTarget?.superseded
	);

	// Reset to defaults whenever the dialog (re)opens.
	$effect(() => {
		if (downloadsActions.deleteConfirmOpen) {
			deleteFromQbit = true;
			deleteFromDisk = false;
			deleteImportedFile = false;
			discardTorrent = true;
		}
	});

	// Disk removal only makes sense once the client copy is being removed.
	$effect(() => {
		if (!deleteFromQbit) deleteFromDisk = false;
	});

	function onOpenChange(open: boolean) {
		if (!open) downloadsActions.deleteConfirmOpen = false;
	}

	function confirm() {
		downloadsActions.deleteConfirmOpen = false;
		void downloadsActions.confirmDelete({
			delete_from_qbit: deleteFromQbit,
			delete_from_disk: deleteFromDisk,
			delete_imported_file: deleteImportedFile,
			discard_torrent: discardTorrent
		});
	}

	const optClass = 'flex items-start gap-2.5 rounded-lg border bg-muted/30 p-3 text-sm';
</script>

<Dialog.Root open={downloadsActions.deleteConfirmOpen} {onOpenChange}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Delete this download?</Dialog.Title>
			<Dialog.Description>
				Choose what to remove. Any downloads sharing the same torrent are removed too.
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col gap-2.5">
			<label class={optClass}>
				<Checkbox bind:checked={deleteFromQbit} class="mt-0.5" />
				<span>
					Delete from qBittorrent
					<span class="mt-0.5 block text-xs text-muted-foreground">
						Remove the torrent from the client.
					</span>
				</span>
			</label>
			<label class={cn(optClass, !deleteFromQbit && 'opacity-50')}>
				<Checkbox bind:checked={deleteFromDisk} disabled={!deleteFromQbit} class="mt-0.5" />
				<span>
					Delete from disk
					<span class="mt-0.5 block text-xs text-muted-foreground">
						Also remove the downloaded files. Requires removing from qBittorrent.
					</span>
				</span>
			</label>

			{#if showImportedFile}
				<Separator />
				<label class={optClass}>
					<Checkbox bind:checked={deleteImportedFile} class="mt-0.5" />
					<span>
						Delete imported file
						<span class="mt-0.5 block text-xs text-muted-foreground">
							Remove the file already copied to its destination.
						</span>
					</span>
				</label>
			{/if}

			<Separator />
			<label class={optClass}>
				<Checkbox bind:checked={discardTorrent} class="mt-0.5" />
				<span>
					Don't automatically download this torrent in the future
					<span class="mt-0.5 block text-xs text-muted-foreground">
						Stop the feed from re-selecting this release.
					</span>
				</span>
			</label>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (downloadsActions.deleteConfirmOpen = false)}>
				Cancel
			</Button>
			<Button variant="destructive" onclick={confirm}>
				<Icon name="trash" size={15} />
				Delete
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
