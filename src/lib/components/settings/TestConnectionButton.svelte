<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Icon from '$lib/components/Icon.svelte';
	import { notifyInfo } from '$lib/api/notify';

	// A button whose leading icon swaps to a spinner while testing, then a check
	// or an x based on the result. With no `action` wired yet, it shows the
	// spinner briefly and reports that the test isn't available.
	interface Props {
		label?: string;
		/** Async test that resolves true (ok) / false (failed). Omit while unwired. */
		action?: () => Promise<boolean>;
		variant?: 'default' | 'secondary' | 'outline';
		/** Enlarge to match end-of-section action buttons (default is inline-sized). */
		big?: boolean;
	}

	let { label = 'Test connection', action, variant = 'secondary', big = false }: Props = $props();

	let state = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let resetTimer: ReturnType<typeof setTimeout> | undefined;

	// Clear the success/error icon back to idle after a couple seconds.
	function settle(next: 'success' | 'error') {
		state = next;
		clearTimeout(resetTimer);
		resetTimer = setTimeout(() => (state = 'idle'), 2000);
	}

	async function run() {
		if (state === 'loading') return;
		clearTimeout(resetTimer);
		state = 'loading';
		if (!action) {
			setTimeout(() => {
				state = 'idle';
				notifyInfo("Test connection isn't available yet.");
			}, 800);
			return;
		}
		try {
			settle((await action()) ? 'success' : 'error');
		} catch {
			settle('error');
		}
	}
</script>

<Button
	type="button"
	{variant}
	size={big ? 'lg' : 'default'}
	class={big ? 'h-11 px-6 text-base' : ''}
	onclick={run}
	disabled={state === 'loading'}
>
	{#if state === 'loading'}
		<Icon name="spinner" size={16} class="animate-spin" />
	{:else if state === 'success'}
		<Icon name="check" size={16} class="text-success" />
	{:else if state === 'error'}
		<Icon name="close" size={16} class="text-destructive" />
	{/if}
	{label}
</Button>
