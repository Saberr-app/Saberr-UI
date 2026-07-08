<script lang="ts">
	import * as Select from '$lib/components/ui/select';
	import { cn } from '$lib/utils';

	interface Option {
		value: string;
		label: string;
	}

	interface Props {
		value: string;
		options: Option[];
		onValueChange?: (value: string) => void;
		placeholder?: string;
		id?: string;
		disabled?: boolean;
		/** Extra classes for the dropdown panel (e.g. cap its height for long lists). */
		contentClass?: string;
		/** Extra classes for the trigger applied only when a real value is selected
		 *  (not the placeholder) — e.g. tint the chosen value. */
		valueClass?: string;
	}

	let {
		value = $bindable(),
		options,
		onValueChange,
		placeholder = 'Select…',
		id,
		disabled = false,
		contentClass,
		valueClass
	}: Props = $props();

	const selectedLabel = $derived(options.find((o) => o.value === value)?.label ?? placeholder);
	// "Selected" = a non-empty value matching an option (an empty-string option is a placeholder).
	const isSelected = $derived(
		value != null && value !== '' && options.some((o) => o.value === value)
	);
</script>

<Select.Root type="single" bind:value {onValueChange} {disabled}>
	<Select.Trigger {id} class={cn('w-full', isSelected && valueClass)}
		>{selectedLabel}</Select.Trigger
	>
	<Select.Content class={contentClass}>
		{#each options as option (option.value)}
			<Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
