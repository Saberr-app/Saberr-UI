<script lang="ts">
	import * as Popover from '$lib/components/ui/popover';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	export interface Option {
		value: string;
		label: string;
	}

	interface Props {
		options: Option[];
		/** Selected values (bindable). */
		selected: string[];
		placeholder: string;
		/** Fired after any toggle so the consumer can re-query. */
		onchange?: () => void;
	}

	let { options, selected = $bindable(), placeholder, onchange }: Props = $props();

	const count = $derived(selected.length);

	function toggle(value: string) {
		selected = selected.includes(value)
			? selected.filter((v) => v !== value)
			: [...selected, value];
		onchange?.();
	}

	function clear() {
		if (count === 0) return;
		selected = [];
		onchange?.();
	}
</script>

<Popover.Root>
	<Popover.Trigger
		class={cn(
			'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors',
			'hover:bg-muted aria-expanded:bg-muted',
			count > 0 ? 'border-info/40 text-foreground' : 'text-muted-foreground'
		)}
	>
		<span class="truncate">{placeholder}</span>
		{#if count > 0}
			<span
				class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-info/15 px-1 text-xs font-semibold text-info"
			>
				{count}
			</span>
		{/if}
		<Icon name="chevron-down" size={15} class="text-muted-foreground" />
	</Popover.Trigger>

	<Popover.Content align="start" class="w-64 p-0">
		<div class="flex items-center justify-between border-b px-3 py-2">
			<span class="text-xs font-semibold tracking-wide uppercase">{placeholder}</span>
			<button
				type="button"
				class="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
				disabled={count === 0}
				onclick={clear}
			>
				Clear
			</button>
		</div>
		<div class="max-h-72 overflow-y-auto p-1">
			{#each options as opt (opt.value)}
				{@const checked = selected.includes(opt.value)}
				<button
					type="button"
					class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
					onclick={() => toggle(opt.value)}
				>
					<Checkbox {checked} tabindex={-1} aria-hidden="true" class="pointer-events-none" />
					<span class="truncate">{opt.label}</span>
				</button>
			{/each}
		</div>
	</Popover.Content>
</Popover.Root>
