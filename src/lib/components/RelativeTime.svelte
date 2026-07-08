<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { clock } from '$lib/stores/clock.svelte';
	import { timeFormat } from '$lib/stores/time-format.svelte';
	import { formatRelative, formatDateTime, formatAbsolute } from '$lib/utils/time';
	import { cn } from '$lib/utils';

	// Relative time ("5 minutes ago") with the full local date-time on hover/focus.
	// `coarseSubMinute` shows "less than 1 minute ago" under a minute; `refreshMs` swaps the
	// shared per-minute tick for a local interval (e.g. 10s) when a fresher cadence is wanted.
	// `scope` makes the time a button: clicking it toggles relative↔absolute for ALL `scope`-tagged
	// times on the page (persisted per scope — see time-format store). `defaultAbsolute` sets the
	// scope's initial state when the user hasn't toggled it yet.
	let {
		iso,
		class: className,
		coarseSubMinute = false,
		refreshMs,
		scope,
		defaultAbsolute = false
	}: {
		iso: string;
		class?: string;
		coarseSubMinute?: boolean;
		refreshMs?: number;
		scope?: string;
		defaultAbsolute?: boolean;
	} = $props();

	let localTick = $state(0);
	let timer: ReturnType<typeof setInterval> | undefined;

	onMount(() => {
		if (refreshMs) timer = setInterval(() => (localTick += 1), refreshMs);
		else clock.start();
	});
	onDestroy(() => {
		if (timer) clearInterval(timer);
	});

	const absolute = $derived(scope ? timeFormat.isAbsolute(scope, defaultAbsolute) : false);

	const label = $derived.by(() => {
		void (refreshMs ? localTick : clock.tick); // re-run on each tick
		return absolute ? formatAbsolute(iso) : formatRelative(iso, { coarseSubMinute });
	});
	// Hover/focus shows the opposite representation.
	const hint = $derived(absolute ? formatRelative(iso, { coarseSubMinute }) : formatDateTime(iso));

	function onclick(e: MouseEvent) {
		e.stopPropagation();
		if (scope) timeFormat.toggle(scope, defaultAbsolute);
	}
</script>

{#if scope}
	<button
		type="button"
		title={hint}
		{onclick}
		class={cn(
			'cursor-pointer text-left transition-colors hover:text-foreground focus-visible:underline focus-visible:outline-none',
			className
		)}>{label}</button
	>
{:else}
	<span class={className} title={hint}>{label}</span>
{/if}
