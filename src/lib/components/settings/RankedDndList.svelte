<script lang="ts">
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	interface Item {
		id: string;
		value: string;
	}

	interface Props {
		/** The ordered, selected values. */
		value: string[];
		/** Called with the new ordered selection on any change. */
		onChange: (next: string[]) => void;
		/** Full set of options (enum mode). When given, a draggable pool is shown. */
		options?: string[];
		/** Allow typing new values and adding them with Enter (languages). */
		allowFreeText?: boolean;
		/** Reorder only — no add, no remove, no pool (priorities). */
		reorderOnly?: boolean;
		/** Map a stored value to a display label (e.g. priority codes). */
		labelOf?: (value: string) => string;
		placeholder?: string;
		/** Accessible name for the active list. */
		ariaLabel?: string;
		/** Shown inside the list when nothing is selected (e.g. "Accept any resolution"). */
		emptyLabel?: string;
		/** Header above the pool, e.g. "Available resolutions:". */
		availableLabel?: string;
	}

	let {
		value,
		onChange,
		options,
		allowFreeText = false,
		reorderOnly = false,
		labelOf = (v) => v,
		placeholder = 'Type and press Enter…',
		ariaLabel = 'Selected items',
		emptyLabel = 'Nothing selected.',
		availableLabel = 'Available:'
	}: Props = $props();

	// Unique dnd "type" per instance so items never drag across unrelated lists on the same page.
	const dndType = $props.id();
	const flipDurationMs = 150;
	const hasPool = $derived(!reorderOnly && !!options);

	let activeItems = $state<Item[]>([]);
	let poolItems = $state<Item[]>([]);
	let draft = $state('');
	let dragging = false;
	// The pool <ul>, focused before a pool button leaves the DOM so focus never falls to <body>
	// (which would make the dialog's focus scope jump it to the top).
	let poolEl = $state<HTMLUListElement>();

	function keepFocusInPool(): void {
		poolEl?.focus({ preventScroll: true });
	}

	function toItems(values: string[]): Item[] {
		return values.map((v) => ({ id: v, value: v }));
	}

	function sameValues(items: Item[], values: string[]): boolean {
		return items.length === values.length && items.every((it, i) => it.value === values[i]);
	}

	// Keep the active list + (enum) pool in sync with `value`/`options`; the pool reconciles
	// independently so an empty selection still shows its full pool. Skipped mid-drag.
	$effect(() => {
		const incoming = value;
		if (dragging) return;
		if (!sameValues(activeItems, incoming)) activeItems = toItems(incoming);
		if (options) {
			const desiredPool = options.filter((o) => !incoming.includes(o));
			if (!sameValues(poolItems, desiredPool)) poolItems = toItems(desiredPool);
		}
	});

	function commit(): void {
		onChange(activeItems.map((i) => i.value));
	}

	function handleActiveConsider(e: CustomEvent<DndEvent<Item>>): void {
		dragging = true;
		activeItems = e.detail.items;
	}
	function handleActiveFinalize(e: CustomEvent<DndEvent<Item>>): void {
		activeItems = e.detail.items;
		dragging = false;
		commit();
	}
	function handlePoolConsider(e: CustomEvent<DndEvent<Item>>): void {
		dragging = true;
		poolItems = e.detail.items;
	}
	function handlePoolFinalize(e: CustomEvent<DndEvent<Item>>): void {
		poolItems = e.detail.items;
		dragging = false;
		commit();
	}

	function removeAt(index: number): void {
		const removed = activeItems[index];
		activeItems = activeItems.filter((_, i) => i !== index);
		if (options && removed) poolItems = [...poolItems, removed];
		commit();
	}

	function addFromPool(item: Item): void {
		keepFocusInPool();
		poolItems = poolItems.filter((i) => i.id !== item.id);
		activeItems = [...activeItems, item];
		commit();
	}

	function handleDraftKeydown(e: KeyboardEvent): void {
		if (e.key !== 'Enter') return;
		e.preventDefault();
		const trimmed = draft.trim();
		if (!trimmed) return;
		if (activeItems.some((i) => i.value.toLowerCase() === trimmed.toLowerCase())) {
			draft = '';
			return;
		}
		activeItems = [...activeItems, { id: trimmed, value: trimmed }];
		draft = '';
		commit();
	}
</script>

<div class="flex flex-col gap-2">
	<!-- Active (selected, ranked) list. Only item <li>s live in the dndzone. -->
	<div class="relative">
		<ul
			use:dndzone={{ items: activeItems, flipDurationMs, type: dndType }}
			onconsider={handleActiveConsider}
			onfinalize={handleActiveFinalize}
			aria-label={ariaLabel}
			class="flex min-h-12 flex-col gap-1.5 rounded-md border border-input bg-background p-2"
		>
			{#each activeItems as item, i (item.id)}
				<li
					class="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm shadow-sm"
				>
					<Icon name="grip" size={14} class="cursor-grab text-muted-foreground" />
					<span class="flex h-4 min-w-4 items-center justify-center text-xs text-muted-foreground">
						{i + 1}
					</span>
					<span class="flex-1 truncate">{labelOf(item.value)}</span>
					{#if !reorderOnly}
						<button
							type="button"
							onclick={() => removeAt(i)}
							class="text-muted-foreground transition-colors hover:text-destructive"
							aria-label={`Remove ${labelOf(item.value)}`}
						>
							<Icon name="close" size={14} />
						</button>
					{/if}
				</li>
			{/each}
		</ul>
		{#if activeItems.length === 0}
			<p
				class="pointer-events-none absolute inset-0 flex items-center justify-center px-3 text-center text-sm text-muted-foreground"
			>
				{emptyLabel}
			</p>
		{/if}
	</div>

	{#if allowFreeText}
		<input
			type="text"
			bind:value={draft}
			onkeydown={handleDraftKeydown}
			{placeholder}
			class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:border-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:outline-none"
		/>
	{/if}

	{#if hasPool}
		<p class="text-xs text-muted-foreground">{availableLabel}</p>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<ul
			bind:this={poolEl}
			tabindex={-1}
			use:dndzone={{ items: poolItems, flipDurationMs, type: dndType }}
			onconsider={handlePoolConsider}
			onfinalize={handlePoolFinalize}
			aria-label="Available options"
			class="flex min-h-10 flex-wrap gap-1.5 rounded-md border border-dashed border-input p-2 outline-none"
		>
			{#each poolItems as item (item.id)}
				<li>
					<button
						type="button"
						onpointerdown={keepFocusInPool}
						onclick={() => addFromPool(item)}
						class={cn(
							'flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1 text-sm',
							'transition-colors hover:bg-sidebar-accent'
						)}
					>
						<Icon name="grip" size={12} class="cursor-grab text-muted-foreground" />
						{labelOf(item.value)}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
