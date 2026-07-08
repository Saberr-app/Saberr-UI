<script lang="ts">
	import type { AiringScheduleScope } from '$lib/api/types';
	import * as Popover from '$lib/components/ui/popover';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	let {
		selected = $bindable(),
		onchange
	}: {
		selected: AiringScheduleScope[];
		onchange?: () => void;
	} = $props();

	let open = $state(false);
	// Pending selection — committed to `selected` only on Apply or when the menu closes.
	let draft = $state<AiringScheduleScope[]>([...selected]);

	const GROUPS: { label: string; items: { value: AiringScheduleScope; label: string }[] }[] = [
		{
			label: 'Your lists',
			items: [
				{ value: 'user_watching', label: 'Watching' },
				{ value: 'user_planning', label: 'Planning' },
				{ value: 'user_tracking', label: 'Tracking' }
			]
		},
		{
			label: 'Discover',
			items: [
				{ value: 'current_season', label: 'Current season' },
				{ value: 'next_season', label: 'Next season' },
				{ value: 'all_airing', label: 'All airing' }
			]
		}
	];

	const count = $derived(selected.length);

	function toggle(value: AiringScheduleScope) {
		if (draft.includes(value)) {
			if (draft.length === 1) return; // keep at least one scope
			draft = draft.filter((v) => v !== value);
		} else {
			draft = [...draft, value];
		}
	}

	/** Push the draft onto `selected` (only when it actually differs). */
	function commit() {
		const a = [...selected].sort().join(',');
		const b = [...draft].sort().join(',');
		if (a !== b) {
			selected = [...draft];
			onchange?.();
		}
	}

	function onOpenChange(o: boolean) {
		if (o)
			draft = [...selected]; // re-seed each time it opens
		else commit(); // closing applies
	}

	function apply() {
		commit();
		open = false;
	}
</script>

<Popover.Root bind:open {onOpenChange}>
	<Popover.Trigger
		class={cn(
			'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors',
			'hover:bg-muted aria-expanded:bg-muted',
			count > 0 ? 'border-info/40 text-foreground' : 'text-muted-foreground'
		)}
	>
		<Icon name="filter" size={15} class="text-muted-foreground" />
		<span class="truncate">Scope</span>
		<span
			class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-info/15 px-1 text-xs font-semibold text-info"
		>
			{count}
		</span>
		<Icon name="chevron-down" size={15} class="text-muted-foreground" />
	</Popover.Trigger>

	<Popover.Content align="end" class="w-60 p-1">
		{#each GROUPS as group (group.label)}
			<div
				class="px-2 pt-2 pb-1 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase"
			>
				{group.label}
			</div>
			{#each group.items as item (item.value)}
				{@const checked = draft.includes(item.value)}
				{@const locked = checked && draft.length === 1}
				<button
					type="button"
					class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted disabled:opacity-60"
					disabled={locked}
					title={locked ? 'At least one scope must stay selected' : undefined}
					onclick={() => toggle(item.value)}
				>
					<Checkbox {checked} tabindex={-1} aria-hidden="true" class="pointer-events-none" />
					<span class="truncate">{item.label}</span>
				</button>
			{/each}
		{/each}

		<div class="mt-1 border-t border-border p-1">
			<button
				type="button"
				onclick={apply}
				class="w-full rounded-md bg-gradient-to-br from-brand-light to-brand px-3 py-1.5 text-sm font-medium text-white transition-[filter] hover:brightness-110"
			>
				Apply
			</button>
		</div>
	</Popover.Content>
</Popover.Root>
