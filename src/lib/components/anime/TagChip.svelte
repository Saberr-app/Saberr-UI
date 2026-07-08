<script lang="ts">
	import { mode } from 'mode-watcher';
	import { cn } from '$lib/utils';

	let {
		name,
		rank,
		spoiler = false,
		revealed = false,
		onReveal
	}: {
		name: string;
		rank: number;
		spoiler?: boolean;
		/** Reveal state is owned by the parent so "Hide spoilers" can reset everything. */
		revealed?: boolean;
		onReveal?: () => void;
	} = $props();

	// Muted-green fill scaled by rank: full at 100, fading to fully transparent at
	// ≤50. Darker base in dark mode so the rank text stays legible over the coin.
	const base = $derived(mode.current === 'dark' ? '#065f46' : '#10b981');
	const intensity = $derived(Math.max(0, Math.min(1, (rank - 50) / 50)));
	const fill = $derived(
		`radial-gradient(circle at 50% 35%,` +
			` color-mix(in srgb, ${base} ${Math.round(intensity * 100)}%, transparent),` +
			` color-mix(in srgb, ${base} ${Math.round(intensity * 45)}%, transparent))`
	);
</script>

<div
	class="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card pr-3 text-xs shadow-sm"
	title={spoiler && !revealed ? 'Spoiler tag — click to reveal' : `${name} · ${rank}%`}
>
	<span
		class="grid size-7 shrink-0 place-items-center rounded-full text-[0.7rem] font-semibold tabular-nums ring-1 ring-border ring-inset"
		style="background: {fill}"
	>
		{rank}
	</span>
	{#if spoiler && !revealed}
		<button
			type="button"
			onclick={() => onReveal?.()}
			class="cursor-pointer font-medium text-muted-foreground blur-[5px] transition select-none hover:text-foreground"
		>
			{name}
		</button>
	{:else}
		<span class={cn('font-medium', spoiler && 'text-rose-600 dark:text-rose-400')}>{name}</span>
	{/if}
</div>
