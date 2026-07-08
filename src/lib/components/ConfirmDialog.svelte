<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import Icon from '$lib/components/Icon.svelte';

	let {
		open = $bindable(false),
		title,
		description,
		descriptionSnippet,
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		destructive = false,
		onConfirm
	}: {
		open?: boolean;
		title: string;
		/** Plain-text body. For rich content (bold, line breaks) pass `descriptionSnippet` instead. */
		description?: string;
		descriptionSnippet?: Snippet;
		confirmLabel?: string;
		cancelLabel?: string;
		destructive?: boolean;
		onConfirm: () => void | Promise<void>;
	} = $props();

	let busy = $state(false);

	async function confirm() {
		busy = true;
		try {
			await onConfirm();
			open = false;
		} finally {
			busy = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			{#if descriptionSnippet}
				<Dialog.Description>{@render descriptionSnippet()}</Dialog.Description>
			{:else if description}
				<Dialog.Description>{description}</Dialog.Description>
			{/if}
		</Dialog.Header>
		<Dialog.Footer>
			<Button type="button" variant="outline" disabled={busy} onclick={() => (open = false)}>
				{cancelLabel}
			</Button>
			<Button
				type="button"
				variant={destructive ? 'destructive' : 'default'}
				disabled={busy}
				onclick={confirm}
			>
				{#if busy}<Icon name="spinner" size={16} class="animate-spin" />{/if}
				{confirmLabel}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
