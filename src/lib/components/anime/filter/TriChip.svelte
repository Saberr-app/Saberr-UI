<script lang="ts">
	import type { TriState } from '$lib/anilist/collection';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	let {
		label,
		state,
		onclick
	}: { label: string; state: TriState | undefined; onclick: () => void } = $props();
</script>

<button
	type="button"
	{onclick}
	class={cn(
		'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
		state === 'include'
			? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
			: state === 'exclude'
				? 'border-rose-500/40 bg-rose-500/15 text-rose-700 line-through dark:text-rose-300'
				: 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
	)}
	aria-pressed={state !== undefined}
>
	{#if state === 'include'}
		<Icon name="check" size={12} />
	{:else if state === 'exclude'}
		<Icon name="close" size={12} />
	{/if}
	{label}
</button>
