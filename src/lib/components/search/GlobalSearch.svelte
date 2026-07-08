<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/Icon.svelte';
	import SearchAnimeItem from './SearchAnimeItem.svelte';
	import SearchPageItem from './SearchPageItem.svelte';
	import { search } from '$lib/stores/search.svelte';
	import { cn } from '$lib/utils';

	let container: HTMLDivElement;
	let inputEl: HTMLInputElement;
	let open = $state(false);
	let highlight = $state(-1);

	// Mac shows ⌘; everyone else (Windows/Linux) shows Ctrl.
	const isMac = browser && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);

	// Flat keyboard-navigable list: anime first, then page matches (display order).
	type NavItem = { kind: 'anime'; href: string } | { kind: 'page'; href: string };
	const navItems = $derived<NavItem[]>([
		...search.animeResults.map(
			(r): NavItem => ({ kind: 'anime', href: `/browse?anilist_id=${r.anilist_id}` })
		),
		...search.pageMatches.map((m): NavItem => ({ kind: 'page', href: m.entry.href }))
	]);

	// Reset the highlight whenever the result set changes shape.
	$effect(() => {
		void navItems.length;
		highlight = -1;
	});

	const hasQuery = $derived(search.query.trim().length > 0);
	// "No results" only once nothing is pending and there's genuinely nothing to show.
	const emptyState = $derived(
		hasQuery &&
			!search.animeLoading &&
			!search.showLoadButton &&
			search.animeResults.length === 0 &&
			search.pageMatches.length === 0
	);

	function onInput(e: Event) {
		search.setQuery((e.currentTarget as HTMLInputElement).value);
		open = (e.currentTarget as HTMLInputElement).value.trim().length > 0;
	}

	function navigate(href: string) {
		goto(href);
		open = false;
		inputEl?.blur();
		search.clear();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			open = false;
			inputEl?.blur();
			return;
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			open = true;
			if (navItems.length) highlight = (highlight + 1) % navItems.length;
			return;
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (navItems.length) highlight = highlight <= 0 ? navItems.length - 1 : highlight - 1;
			return;
		}
		if (e.key === 'Enter') {
			if (highlight >= 0 && highlight < navItems.length) {
				e.preventDefault();
				navigate(navItems[highlight].href);
			} else {
				// No selection → force the anime search (skips the debounce).
				search.submit();
			}
		}
	}

	onMount(() => {
		const onPointerDown = (e: PointerEvent) => {
			if (open && container && !container.contains(e.target as Node)) open = false;
		};
		const onShortcut = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				inputEl?.focus();
				inputEl?.select();
				if (hasQuery) open = true;
			}
		};
		window.addEventListener('pointerdown', onPointerDown);
		window.addEventListener('keydown', onShortcut);
		return () => {
			window.removeEventListener('pointerdown', onPointerDown);
			window.removeEventListener('keydown', onShortcut);
		};
	});
</script>

<div bind:this={container} class="relative mx-1 max-w-xl flex-1 sm:mx-3">
	<Icon
		name="search"
		size={18}
		class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
	/>
	<input
		bind:this={inputEl}
		type="search"
		placeholder="Search"
		aria-label="Global search"
		autocomplete="off"
		value={search.query}
		oninput={onInput}
		onfocus={() => (open = hasQuery)}
		onkeydown={onKeydown}
		class="h-9 w-full rounded-md border border-input bg-background pr-12 pl-9 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
	/>
	<!-- Shortcut hint (hidden while a query is present). -->
	{#if !hasQuery}
		<kbd
			class="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:flex"
		>
			{#if isMac}<span class="text-xs">⌘</span>K{:else}Ctrl K{/if}
		</kbd>
	{/if}

	{#if open && hasQuery}
		<div
			class="absolute top-full left-0 z-40 mt-2 max-h-[70vh] w-full min-w-[20rem] overflow-y-auto rounded-lg border border-border bg-popover p-1.5 shadow-lg"
		>
			<!-- Section 1: Anime (API) -->
			<div
				class="px-1.5 pt-1 pb-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
			>
				Anime
			</div>
			{#if search.showLoadButton}
				<button
					type="button"
					onclick={() => search.loadAnime()}
					class="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
				>
					<Icon name="search" size={14} />
					Load anime search results
				</button>
			{:else if search.animeLoading}
				<div class="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
					<Icon name="spinner" size={15} class="animate-spin" />
					Searching…
				</div>
			{:else if search.animeError}
				<div class="px-2 py-2 text-sm text-destructive">Couldn't load anime results.</div>
			{:else if search.animeResults.length}
				{#each search.animeResults as result, i (result.anilist_id)}
					<SearchAnimeItem
						{result}
						highlighted={highlight === i}
						onSelect={() => navigate(`/browse?anilist_id=${result.anilist_id}`)}
					/>
				{/each}
			{:else if search.query.trim().length >= 3}
				<div class="px-2 py-2 text-sm text-muted-foreground">No anime found.</div>
			{:else}
				<div class="px-2 py-2 text-xs text-muted-foreground">-</div>
			{/if}

			<!-- Section 2: Pages (front-end) -->
			{#if search.pageMatches.length}
				<div
					class="mt-1.5 border-t border-border px-1.5 pt-2 pb-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
				>
					Pages
				</div>
				{#each search.pageMatches as match, i (match.entry.id)}
					<SearchPageItem
						{match}
						highlighted={highlight === search.animeResults.length + i}
						onSelect={() => navigate(match.entry.href)}
					/>
				{/each}
			{/if}

			{#if emptyState}
				<div class="px-2 py-3 text-center text-sm text-muted-foreground">No results.</div>
			{/if}
		</div>
	{/if}
</div>
