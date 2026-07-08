<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { showsDetail, type PageMatch } from '$lib/search/match';
	import { cn } from '$lib/utils';

	let {
		match,
		highlighted = false,
		onSelect
	}: { match: PageMatch; highlighted?: boolean; onSelect: () => void } = $props();

	const entry = $derived(match.entry);
	const isSub = $derived(!!entry.subLabel);
	const detail = $derived(showsDetail(match) ? match.matchedText : null);
</script>

<button
	type="button"
	onclick={onSelect}
	class={cn(
		'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
		highlighted ? 'bg-muted' : 'hover:bg-muted/60'
	)}
>
	<Icon
		name={isSub ? (entry.subIcon ?? entry.pageIcon) : entry.pageIcon}
		size={16}
		class="shrink-0 text-muted-foreground"
	/>
	<div class="min-w-0 flex-1">
		<p class="flex min-w-0 items-center gap-1 truncate text-sm">
			<span class={cn('truncate', isSub ? 'text-muted-foreground' : 'font-medium')}>
				{entry.pageLabel}
			</span>
			{#if isSub}
				<Icon name="arrow-right" size={13} class="shrink-0 text-muted-foreground/70" />
				<span class="truncate font-medium">{entry.subLabel}</span>
			{/if}
		</p>
		{#if detail}
			<p class="truncate text-xs text-muted-foreground">{detail}</p>
		{/if}
	</div>
</button>
