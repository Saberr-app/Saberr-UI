<script lang="ts">
	import { Button } from '$lib/components/ui/button';

	interface Props {
		/** Local `datetime-local` values (bindable, owned by the parent so it can clear them). */
		start: string;
		end: string;
		/** Apply the currently entered range. */
		onapply: () => void;
	}

	let { start = $bindable(), end = $bindable(), onapply }: Props = $props();

	const dirty = $derived(start !== '' || end !== '');

	function clear() {
		start = '';
		end = '';
		onapply();
	}

	const inputClass =
		'h-9 w-full rounded-lg border bg-background px-3 text-sm text-foreground ' +
		'focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:outline-none';
</script>

<div class="flex flex-col gap-3">
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
		<label class="flex flex-col gap-1">
			<span class="text-xs font-medium text-muted-foreground">From</span>
			<input type="datetime-local" bind:value={start} max={end || undefined} class={inputClass} />
		</label>
		<label class="flex flex-col gap-1">
			<span class="text-xs font-medium text-muted-foreground">To</span>
			<input type="datetime-local" bind:value={end} min={start || undefined} class={inputClass} />
		</label>
	</div>
	<div class="flex items-center gap-2">
		<Button variant="affirmative" size="sm" onclick={onapply}>Apply range</Button>
		<Button variant="ghost" size="sm" disabled={!dirty} onclick={clear}>Clear</Button>
	</div>
</div>
