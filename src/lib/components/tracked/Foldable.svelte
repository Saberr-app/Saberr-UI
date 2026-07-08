<script lang="ts">
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	// A lightweight collapsible section used by the track dialog. The header is a
	// full-width button (chevron + title + optional trailing snippet); the body is
	// shown/hidden. Open state is bindable so callers can fold/unfold programmatically.
	let {
		open = $bindable(true),
		forceOpen = false,
		title,
		description,
		aside,
		children,
		class: className
	}: {
		open?: boolean;
		/** While true, the section is held open (e.g. it contains a validation error). */
		forceOpen?: boolean;
		title: string;
		description?: string;
		/** Trailing content shown on the right of the header (e.g. a badge). */
		aside?: Snippet;
		children: Snippet;
		class?: string;
	} = $props();

	// Expand (and keep expanded) whenever an owner flags an error inside this section.
	$effect(() => {
		if (forceOpen) open = true;
	});
</script>

<section class={cn('rounded-lg border border-border bg-card/40', className)}>
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-expanded={open}
		class="flex w-full items-center gap-3 px-4 py-3 text-left"
	>
		<Icon
			name="chevron-right"
			size={16}
			class={cn('shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')}
		/>
		<div class="min-w-0 flex-1">
			<div class="text-sm font-medium">{title}</div>
			{#if description}
				<div class="truncate text-xs text-muted-foreground">{description}</div>
			{/if}
		</div>
		{#if aside}
			<div class="shrink-0">{@render aside()}</div>
		{/if}
	</button>
	{#if open}
		<div
			transition:slide={{ duration: 200 }}
			class="overflow-hidden border-t border-border px-4 py-4"
		>
			{@render children()}
		</div>
	{/if}
</section>
