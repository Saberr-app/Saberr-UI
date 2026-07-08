<script lang="ts">
	import * as Popover from '$lib/components/ui/popover';
	import Icon from '$lib/components/Icon.svelte';
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
	}

	let {
		value = $bindable(),
		options,
		onValueChange,
		placeholder = 'Select…',
		id,
		disabled = false
	}: Props = $props();

	let open = $state(false);
	let query = $state('');

	const selectedLabel = $derived(options.find((o) => o.value === value)?.label ?? '');
	const filtered = $derived(
		query ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options
	);

	function choose(v: string) {
		value = v;
		onValueChange?.(v);
		open = false;
	}

	// Reset the query and focus the search box each time the popover opens.
	$effect(() => {
		if (!open) query = '';
	});

	function autofocus(node: HTMLInputElement) {
		node.focus();
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		{id}
		{disabled}
		class={cn(
			'flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 text-sm',
			'transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
			'disabled:cursor-not-allowed disabled:opacity-50'
		)}
	>
		<span class={cn('truncate', !selectedLabel && 'text-muted-foreground')}>
			{selectedLabel || placeholder}
		</span>
		<Icon name="chevron-down" size={16} class="shrink-0 text-muted-foreground" />
	</Popover.Trigger>
	<Popover.Content class="w-(--bits-popover-anchor-width) min-w-56 gap-0 p-0" align="start">
		<div class="border-b border-border p-1.5">
			<input
				use:autofocus
				bind:value={query}
				placeholder="Search…"
				class="h-8 w-full rounded-md bg-transparent px-2 text-sm focus:outline-none"
			/>
		</div>
		<ul class="max-h-64 overflow-y-auto p-1">
			{#each filtered as option (option.value)}
				<li>
					<button
						type="button"
						onclick={() => choose(option.value)}
						class={cn(
							'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm',
							'transition-colors hover:bg-sidebar-accent',
							option.value === value && 'font-medium'
						)}
					>
						<span class="truncate">{option.label}</span>
						{#if option.value === value}
							<Icon name="check" size={14} class="shrink-0 text-brand" />
						{/if}
					</button>
				</li>
			{/each}
			{#if filtered.length === 0}
				<li class="px-2 py-2 text-sm text-muted-foreground">No matches.</li>
			{/if}
		</ul>
	</Popover.Content>
</Popover.Root>
