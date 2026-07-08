<script lang="ts">
	/* In selection mode, the per-item ⋯ menu is replaced by these two controls:
	   a View button (opens detail, preserving selection) and a Select checkbox
	   (toggles this item; passes the event so shift-range works). */
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	let {
		selected,
		onView,
		onToggle,
		buttonClass
	}: {
		selected: boolean;
		onView: () => void;
		onToggle: (e: MouseEvent) => void;
		/** Match the host item's action-cluster styling (background/border). */
		buttonClass?: string;
	} = $props();

	const base = 'inline-flex size-7 items-center justify-center rounded-md transition-colors';
</script>

<button
	type="button"
	aria-label="View"
	title="View"
	onclick={(e) => {
		e.stopPropagation();
		onView();
	}}
	class={cn(base, 'text-muted-foreground hover:bg-muted hover:text-foreground', buttonClass)}
>
	<Icon name="eye" size={16} />
</button>
<button
	type="button"
	role="checkbox"
	aria-checked={selected}
	aria-label="Select"
	title="Select"
	onclick={(e) => {
		e.stopPropagation();
		onToggle(e);
	}}
	class={cn(base, buttonClass)}
>
	<span
		class={cn(
			'grid size-4 place-items-center rounded border',
			selected ? 'border-transparent bg-brand-light text-white' : 'border-foreground/40'
		)}
	>
		{#if selected}<Icon name="check" size={12} />{/if}
	</span>
</button>
