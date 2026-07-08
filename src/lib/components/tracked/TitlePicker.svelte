<script lang="ts">
	import { mode } from 'mode-watcher';
	import type { AnimeTitle, MetadataSource } from '$lib/api/types';
	import { getAnimeTitles } from '$lib/api/anime';
	import * as Popover from '$lib/components/ui/popover';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	// Chevron button (docked at the right edge of the folder-name input) that opens a list of
	// candidate titles to pick as the folder name. Titles are fetched lazily on first open and
	// cached for this mount; the component unmounts with the dialog, so a reopen refetches.
	// On fetch failure we fall back to the anime's own titles (passed in).
	let {
		anilistId,
		fallback,
		onPick
	}: {
		anilistId: number;
		fallback: AnimeTitle[];
		onPick: (title: string) => void;
	} = $props();

	let open = $state(false);
	let loaded = $state(false);
	let loading = $state(false);
	let titles = $state<AnimeTitle[]>([]);

	function logoSrc(source: MetadataSource): string {
		if (source === 'ANILIST') return '/img/anilist.png';
		return mode.current === 'dark' ? '/img/tvdb-dark.png' : '/img/tvdb-light.png';
	}

	async function load() {
		loading = true;
		try {
			const res = await getAnimeTitles(anilistId);
			titles = res.titles;
		} catch {
			titles = fallback; // any failure → the anime's own titles
		} finally {
			loaded = true;
			loading = false;
		}
	}

	function onOpenChange(next: boolean) {
		if (next && !loaded && !loading) void load();
	}

	function pick(title: string) {
		onPick(title);
		open = false;
	}
</script>

<Popover.Root bind:open {onOpenChange}>
	<Popover.Trigger
		class="absolute top-1/2 right-1 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:outline-none"
		aria-label="Choose a title"
	>
		<Icon name="chevron-down" size={16} />
	</Popover.Trigger>
	<Popover.Content class="w-80 max-w-[80vw] p-1" align="end" sideOffset={6}>
		{#if loading}
			<div class="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
				<Icon name="spinner" size={16} class="animate-spin" /> Loading titles…
			</div>
		{:else if titles.length === 0}
			<div class="py-6 text-center text-sm text-muted-foreground">No titles available</div>
		{:else}
			<div class="max-h-72 overflow-y-auto">
				{#each titles as t, i (i)}
					<button
						type="button"
						onclick={() => pick(t.title)}
						class={cn(
							'flex w-full flex-col gap-1 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-sidebar-accent'
						)}
					>
						<span class="flex items-center gap-1.5 text-xs text-muted-foreground">
							<img
								src={logoSrc(t.source)}
								alt={t.source}
								decoding="async"
								class="inline-block h-3.5 w-auto rounded-[3px]"
							/>
							{t.language}
						</span>
						<span class="line-clamp-2 text-sm font-medium">{t.title}</span>
					</button>
				{/each}
			</div>
		{/if}
	</Popover.Content>
</Popover.Root>
