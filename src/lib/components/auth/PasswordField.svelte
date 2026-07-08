<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import Icon from '$lib/components/Icon.svelte';
	import { isWeakPassword } from '$lib/utils/validation';

	let {
		id,
		label,
		value = $bindable(''),
		autocomplete = 'off',
		showWeakHint = false,
		error = null,
		disabled = false
	}: {
		id: string;
		label: string;
		value?: string;
		autocomplete?: 'new-password' | 'current-password' | 'off';
		showWeakHint?: boolean;
		error?: string | null;
		disabled?: boolean;
	} = $props();

	let reveal = $state(false);
	const weak = $derived(showWeakHint && isWeakPassword(value));
</script>

<div class="space-y-1.5">
	<label class="block text-sm font-medium" for={id}>{label}</label>
	<div class="relative">
		<Input
			{id}
			type={reveal ? 'text' : 'password'}
			{autocomplete}
			{disabled}
			bind:value
			aria-invalid={error ? 'true' : undefined}
			class="h-10 pr-10"
		/>
		<button
			type="button"
			tabindex={-1}
			onclick={() => (reveal = !reveal)}
			class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
			aria-label={reveal ? 'Hide password' : 'Show password'}
		>
			<Icon name={reveal ? 'eye-off' : 'eye'} size={16} />
		</button>
	</div>
	{#if error}
		<p class="text-xs text-destructive">{error}</p>
	{:else if weak}
		<p class="text-xs text-warning">Weak password (below 6 characters).</p>
	{/if}
</div>
