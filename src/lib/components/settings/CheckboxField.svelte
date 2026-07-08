<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import HelpHint from './HelpHint.svelte';
	import InlineMarkup from './InlineMarkup.svelte';

	interface Props {
		checked: boolean;
		label: string;
		help?: string;
		description?: string;
		disabled?: boolean;
	}

	let { checked = $bindable(), label, help, description, disabled = false }: Props = $props();

	const id = $props.id();
</script>

<div class="flex flex-col gap-1">
	<div class="flex items-center gap-2">
		<Checkbox {id} bind:checked {disabled} />
		<Label for={id} class="cursor-pointer text-sm font-medium">{label}</Label>
		{#if help}
			<HelpHint text={help} />
		{/if}
	</div>
	{#if description}
		<p class="pl-6 text-xs text-muted-foreground"><InlineMarkup text={description} /></p>
	{/if}
</div>
