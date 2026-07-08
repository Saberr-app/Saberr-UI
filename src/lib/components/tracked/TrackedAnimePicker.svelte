<script lang="ts">
	/* Searchable tracked-anime picker: poster thumbnail + title + format·season subtitle. Popover-based
	   so the option list renders in a portal — a long title can't stretch the surrounding dialog (unlike
	   a native <select>, which sizes to its widest option). */
	import type { TrackedAnimeItem } from '$lib/api/types';
	import { resolveBackendUrl } from '$lib/config/api';
	import { displayTitle, matchesTitle } from '$lib/anilist/titles';
	import { formatLabel, seasonLabel } from '$lib/anilist/enums';
	import * as Popover from '$lib/components/ui/popover';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	interface Props {
		items: TrackedAnimeItem[];
		value: number | null;
		onValueChange?: (value: number | null) => void;
		loading?: boolean;
		disabled?: boolean;
		placeholder?: string;
		id?: string;
	}

	let {
		items,
		value = $bindable(),
		onValueChange,
		loading = false,
		disabled = false,
		placeholder = 'Select a tracked anime…',
		id
	}: Props = $props();

	let open = $state(false);
	let query = $state('');

	const selected = $derived(items.find((t) => t.id === value) ?? null);

	function meta(t: TrackedAnimeItem): string {
		const a = t.anime;
		const season = a.season
			? `${seasonLabel(a.season)}${a.season_year ? ` ${a.season_year}` : ''}`
			: a.season_year
				? String(a.season_year)
				: null;
		return [a.format ? formatLabel(a.format) : null, season].filter(Boolean).join(' · ');
	}

	function poster(t: TrackedAnimeItem): string | null {
		const url = t.anime.medium_cover_image ?? t.anime.small_cover_image;
		return url ? resolveBackendUrl(url) : null;
	}

	const filtered = $derived(query ? items.filter((t) => matchesTitle(t.anime, query)) : items);

	function choose(v: number) {
		value = v;
		onValueChange?.(v);
		open = false;
	}

	// Clear the search each time the popover closes.
	$effect(() => {
		if (!open) query = '';
	});

	function autofocus(node: HTMLInputElement) {
		node.focus();
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		{id}
		disabled={disabled || loading}
		class={cn(
			'flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-background px-2 text-sm',
			'transition-colors focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:outline-none',
			'disabled:cursor-not-allowed disabled:opacity-50'
		)}
	>
		{#if selected}
			{@const src = poster(selected)}
			{#if src}
				<img {src} alt="" class="h-6 w-[18px] shrink-0 rounded-sm object-cover" />
			{/if}
			<span class="truncate">{displayTitle(selected.anime)}</span>
		{:else}
			<span class="truncate pl-1 text-muted-foreground">
				{loading ? 'Loading…' : placeholder}
			</span>
		{/if}
		<Icon name="chevron-down" size={16} class="ml-auto shrink-0 text-muted-foreground" />
	</Popover.Trigger>
	<Popover.Content class="w-(--bits-popover-anchor-width) min-w-64 gap-0 p-0" align="start">
		<div class="border-b border-border p-1.5">
			<input
				use:autofocus
				bind:value={query}
				placeholder="Search tracked anime…"
				class="h-8 w-full rounded-md bg-transparent px-2 text-sm focus:outline-none"
			/>
		</div>
		<ul class="max-h-72 overflow-y-auto p-1">
			{#each filtered as t (t.id)}
				{@const src = poster(t)}
				{@const sub = meta(t)}
				<li>
					<button
						type="button"
						onclick={() => choose(t.id)}
						class={cn(
							'flex w-full items-center gap-2.5 rounded-md p-1.5 text-left',
							'transition-colors hover:bg-sidebar-accent',
							t.id === value && 'bg-sidebar-accent'
						)}
					>
						{#if src}
							<img {src} alt="" class="h-11 w-8 shrink-0 rounded-sm object-cover" />
						{:else}
							<div class="h-11 w-8 shrink-0 rounded-sm bg-muted"></div>
						{/if}
						<span class="flex min-w-0 flex-col">
							<span class={cn('truncate text-sm', t.id === value && 'font-medium')}>
								{displayTitle(t.anime)}
							</span>
							{#if sub}
								<span class="truncate text-xs text-muted-foreground">{sub}</span>
							{/if}
						</span>
						{#if t.id === value}
							<Icon name="check" size={14} class="ml-auto shrink-0 text-foreground" />
						{/if}
					</button>
				</li>
			{/each}
			{#if filtered.length === 0}
				<li class="px-2 py-3 text-sm text-muted-foreground">
					{loading ? 'Loading…' : 'No matches.'}
				</li>
			{/if}
		</ul>
	</Popover.Content>
</Popover.Root>
