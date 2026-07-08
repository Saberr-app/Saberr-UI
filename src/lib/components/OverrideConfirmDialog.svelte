<script lang="ts">
	/* Shared confirm for any torrent override ("Revert to this release" / "Override with this
	   release") across episode views, RSS, and Downloads. Warns that the episode's existing
	   download/import will be replaced, and offers the discard-future-torrents option (default off). */
	import * as Dialog from '$lib/components/ui/dialog';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Button } from '$lib/components/ui/button';
	import Icon from '$lib/components/Icon.svelte';

	let {
		open = $bindable(false),
		title = 'Override existing download?',
		confirmLabel = 'Override',
		onConfirm,
		onCancel
	}: {
		open?: boolean;
		title?: string;
		confirmLabel?: string;
		onConfirm: (discardFuture: boolean) => void;
		onCancel?: () => void;
	} = $props();

	let discardFuture = $state(false);

	// Reset the checkbox each time the dialog (re)opens.
	$effect(() => {
		if (open) discardFuture = false;
	});

	function close() {
		open = false;
		onCancel?.();
	}

	function confirm() {
		const df = discardFuture;
		open = false;
		onConfirm(df);
	}
</script>

<Dialog.Root {open} onOpenChange={(o) => !o && close()}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>
				This will replace any existing download or import for this episode.
			</Dialog.Description>
		</Dialog.Header>

		<label class="flex items-start gap-2.5 rounded-lg border bg-muted/30 p-3 text-sm">
			<Checkbox bind:checked={discardFuture} class="mt-0.5" />
			<span>
				Discard future torrents for this episode
				<span class="mt-0.5 block text-xs text-muted-foreground">
					Stop auto-selecting newer releases once this is imported.
				</span>
			</span>
		</label>

		<Dialog.Footer>
			<Button variant="outline" onclick={close}>Cancel</Button>
			<Button variant="affirmative" onclick={confirm}>
				<Icon name="downloads" size={15} />
				{confirmLabel}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
