<script lang="ts">
	/* Batch "Set score" popup — a format-aware score input + Save, applied to all selected entries
	   (only enabled when the selection is fully on-list). */
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import ScoreInput from './ScoreInput.svelte';

	let {
		open = $bindable(false),
		count,
		onSave
	}: {
		open?: boolean;
		count: number;
		/** Apply the chosen score to the selected entries. */
		onSave: (score: number) => void | Promise<void>;
	} = $props();

	let score = $state(0);
	let busy = $state(false);

	// Reset to "unset" each time the dialog opens.
	$effect(() => {
		if (open) score = 0;
	});

	async function save() {
		busy = true;
		try {
			await onSave(score);
		} finally {
			busy = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-xs">
		<Dialog.Header>
			<Dialog.Title>Set score</Dialog.Title>
			<Dialog.Description>
				Apply a score to {count} selected {count === 1 ? 'entry' : 'entries'}.
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex justify-center py-3">
			<ScoreInput bind:score />
		</div>

		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={() => (open = false)} disabled={busy}>
				Cancel
			</Button>
			<Button type="button" variant="affirmative" onclick={save} disabled={busy}>Save</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
