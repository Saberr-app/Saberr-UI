<script lang="ts">
	import type { Coverage } from '$lib/calendar/coverage';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	let {
		coverage,
		size = 16,
		showLabel = false,
		class: className
	}: {
		coverage: Coverage;
		size?: number;
		showLabel?: boolean;
		class?: string;
	} = $props();
</script>

<span
	class={cn('inline-flex items-center gap-1', coverage.textClass, className)}
	title={coverage.label}
>
	<Icon name={coverage.icon} {size} />
	{#if showLabel}<span class="text-[0.7rem] font-semibold whitespace-nowrap">{coverage.label}</span
		>{/if}
</span>
