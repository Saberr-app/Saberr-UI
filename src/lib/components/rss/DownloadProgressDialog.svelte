<script lang="ts">
	/* Multi-download progress. Sequential downloads fill a green/red proportional bar. While running,
	   only Cancel (finishes the in-flight one, starts no more); when done it stays open with OK. */
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import Icon from '$lib/components/Icon.svelte';
	import { rssActions } from '$lib/stores/rss-actions.svelte';

	const total = $derived(rssActions.total);
	const success = $derived(rssActions.success);
	const fail = $derived(rssActions.fail);
	const done = $derived(success + fail);
	const successPct = $derived(total ? (success / total) * 100 : 0);
	const failPct = $derived(total ? (fail / total) * 100 : 0);

	function onOpenChange(open: boolean) {
		// Can't dismiss while downloads are still running; use Cancel.
		if (!open && !rssActions.running) rssActions.closeProgress();
	}
</script>

<Dialog.Root open={rssActions.progressOpen} {onOpenChange}>
	<Dialog.Content
		class="sm:max-w-md"
		showCloseButton={!rssActions.running}
		interactOutsideBehavior={rssActions.running ? 'ignore' : 'close'}
		escapeKeydownBehavior={rssActions.running ? 'ignore' : 'close'}
	>
		<Dialog.Header>
			<Dialog.Title>
				{#if rssActions.running}
					Downloading…
				{:else}
					Downloads complete
				{/if}
			</Dialog.Title>
			<Dialog.Description>
				{done} of {total} sent{#if !rssActions.running && rssActions.finished}
					— {success} started, {fail} failed{/if}
			</Dialog.Description>
		</Dialog.Header>

		<!-- Proportional bar: green success + red failure over a grey track. -->
		<div class="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
			<div class="h-full bg-success transition-[width]" style="width:{successPct}%"></div>
			<div class="h-full bg-destructive transition-[width]" style="width:{failPct}%"></div>
		</div>
		<div class="flex items-center gap-4 text-xs">
			<span class="flex items-center gap-1.5 text-success">
				<span class="size-2 rounded-full bg-success"></span>{success} started
			</span>
			<span class="flex items-center gap-1.5 text-destructive">
				<span class="size-2 rounded-full bg-destructive"></span>{fail} failed
			</span>
			<span class="ml-auto text-muted-foreground tabular-nums">{done}/{total}</span>
		</div>

		<Dialog.Footer>
			{#if rssActions.running}
				<Button variant="outline" onclick={() => rssActions.cancel()}>
					<Icon name="close" size={15} /> Cancel
				</Button>
			{:else}
				<Button onclick={() => rssActions.closeProgress()}>OK</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
