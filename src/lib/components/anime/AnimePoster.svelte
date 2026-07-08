<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	let {
		src,
		alt,
		isAdult = false,
		class: className
	}: {
		src: string | null;
		alt: string;
		isAdult?: boolean;
		class?: string;
	} = $props();

	// Reveal state is per-instance (per view), so unhiding in one view never
	// carries to another — re-blurs on remount.
	let revealed = $state(false);

	function reveal(e: MouseEvent) {
		e.stopPropagation();
		e.preventDefault();
		revealed = true;
	}

	const hidden = $derived(isAdult && !revealed);
</script>

<div class={cn('relative overflow-hidden bg-muted', className)}>
	{#if src}
		<img
			{src}
			{alt}
			loading="lazy"
			decoding="async"
			class={cn(
				'h-full w-full object-cover transition-[filter,transform] duration-300',
				hidden && 'scale-110 blur-xl'
			)}
		/>
	{:else}
		<div class="flex h-full w-full items-center justify-center text-muted-foreground/40">
			<Icon name="browse" size={28} />
		</div>
	{/if}

	{#if hidden}
		<button
			type="button"
			onclick={reveal}
			class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/40 text-xs font-semibold text-foreground/80 backdrop-blur-[2px] transition-colors hover:bg-background/25"
			aria-label="Show adult content"
		>
			<Icon name="eye" size={22} />
			<span class="rounded bg-rose-500/80 px-1.5 py-0.5 text-[0.65rem] text-white">18+</span>
		</button>
	{/if}
</div>
