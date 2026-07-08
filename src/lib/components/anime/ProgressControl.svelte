<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	let {
		progress,
		episodes,
		onIncrement,
		busy = false,
		size = 'sm',
		class: className
	}: {
		progress: number;
		episodes: number | null;
		/** When provided, shows a quick "+" that increments (hidden at max). */
		onIncrement?: () => void;
		busy?: boolean;
		size?: 'xs' | 'sm';
		class?: string;
	} = $props();

	const atMax = $derived(episodes != null && progress >= episodes);

	function plus(e: MouseEvent) {
		e.stopPropagation();
		e.preventDefault();
		if (!busy && !atMax) onIncrement?.();
	}
</script>

<span class={cn('inline-flex items-center gap-1', className)}>
	<span class={cn('tabular-nums', size === 'xs' ? 'text-[0.7rem]' : 'text-sm')}>
		<span class="font-semibold">{progress}</span><span class="text-muted-foreground"
			>/{episodes ?? '?'}</span
		>
	</span>
	{#if onIncrement && !atMax}
		<button
			type="button"
			onclick={plus}
			disabled={busy}
			aria-label="Increment progress"
			title="Watched next episode"
			class={cn(
				'inline-flex items-center justify-center rounded-md border border-border bg-background text-emerald-600 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/10 disabled:opacity-50 dark:text-emerald-400',
				size === 'xs' ? 'size-4' : 'size-5'
			)}
		>
			<Icon name="plus" size={size === 'xs' ? 11 : 13} />
		</button>
	{/if}
</span>
