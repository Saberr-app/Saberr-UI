<script lang="ts">
	import { onMount } from 'svelte';
	import type { AnilistAiringSchedule } from '$lib/api/types';
	import { formatCountdown } from '$lib/utils/time';
	import { clock } from '$lib/stores/clock.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	let {
		next,
		size = 'sm',
		class: className
	}: { next: AnilistAiringSchedule | null; size?: 'xs' | 'sm'; class?: string } = $props();

	onMount(() => clock.start());

	// Live: recomputes every minute (and on re-render). `formatCountdown` returns ''
	// for a timestamp in the past, so a since-passed episode disappears on its own.
	// `clock.tick > 0` (always true) is what keeps this reactive to the minute tick.
	const countdown = $derived(
		clock.tick > 0 && next?.airing_at != null ? formatCountdown(next.airing_at) : ''
	);
</script>

{#if next?.episode != null && countdown}
	<span
		class={cn(
			'inline-flex items-center gap-1 font-medium text-sky-600 dark:text-sky-400',
			size === 'xs' ? 'text-[0.65rem]' : 'text-xs',
			className
		)}
		title={`Episode ${next.episode} airs in ${countdown}`}
	>
		<Icon name="calendar-clock" size={size === 'xs' ? 11 : 13} />
		Ep {next.episode} · {countdown}
	</span>
{/if}
