<script lang="ts">
	/* Confirmation shown before any download (single or multi). Warns the download
	   replaces existing ones for the affected episode(s) and offers the "discard
	   future torrents" option → discard_future_torrents. */
	import * as Dialog from '$lib/components/ui/dialog';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Button } from '$lib/components/ui/button';
	import Icon from '$lib/components/Icon.svelte';
	import { rssActions } from '$lib/stores/rss-actions.svelte';

	let discardFuture = $state(false);

	const count = $derived(rssActions.pendingCount);
	const plural = $derived(count !== 1);

	function onOpenChange(open: boolean) {
		if (!open) rssActions.confirmOpen = false;
	}

	function confirm() {
		rssActions.confirmDownload(discardFuture);
		discardFuture = false;
	}
</script>

<Dialog.Root open={rssActions.confirmOpen} {onOpenChange}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Download &amp; import {count} torrent{plural ? 's' : ''}?</Dialog.Title>
			<Dialog.Description>
				{plural ? 'These downloads' : 'This download'} will replace any existing download for
				{plural ? 'their respective episodes' : 'this episode'}.
			</Dialog.Description>
		</Dialog.Header>

		<label class="flex items-start gap-2.5 rounded-lg border bg-muted/30 p-3 text-sm">
			<Checkbox bind:checked={discardFuture} class="mt-0.5" />
			<span>
				Discard future torrents for {plural ? 'these episodes' : 'this episode'}
				<span class="mt-0.5 block text-xs text-muted-foreground">
					Stop auto-selecting newer releases once this is imported.
				</span>
			</span>
		</label>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (rssActions.confirmOpen = false)}>Cancel</Button>
			<Button variant="affirmative" onclick={confirm}>
				<Icon name="downloads" size={15} />
				Download &amp; import
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
