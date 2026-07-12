<script lang="ts">
	/* Search-or-ID picker for one entity (AniList anime or TVDB series). Search mode = a portal
	   Popover (long titles can't stretch the dialog, like TrackedAnimePicker); ID mode = a plain
	   numeric input. The small "Search · ID" text at the top-right toggles between them. */
	import type { EntityPick } from '$lib/mappings/overrides';
	import { animePick, tvdbPick, idPick } from '$lib/mappings/overrides';
	import { searchAnime, searchTvdb } from '$lib/api/search';
	import * as Popover from '$lib/components/ui/popover';
	import { Input } from '$lib/components/ui/input';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	interface Props {
		kind: 'anime' | 'tvdb';
		label: string;
		value: EntityPick | null;
		onSelect: (pick: EntityPick | null) => void;
	}

	let { kind, label, value, onSelect }: Props = $props();

	let mode = $state<'search' | 'id'>('search');
	let open = $state(false);
	let query = $state('');
	let results = $state<EntityPick[]>([]);
	let searching = $state(false);
	let searched = $state(false);
	let idText = $state<string | number>('');

	let controller: AbortController | null = null;
	let debounce: ReturnType<typeof setTimeout> | undefined;

	const placeholder = $derived(kind === 'anime' ? 'Search AniList anime…' : 'Search TVDB series…');

	async function run(q: string) {
		controller?.abort();
		controller = new AbortController();
		searching = true;
		try {
			const hits =
				kind === 'anime'
					? (await searchAnime(q, controller.signal)).map(animePick)
					: (await searchTvdb(q, controller.signal)).map(tvdbPick);
			results = hits;
			searched = true;
		} catch {
			/* aborted or failed — leave prior results */
		} finally {
			searching = false;
		}
	}

	function onQuery(v: string) {
		query = v;
		clearTimeout(debounce);
		if (v.trim().length < 3) {
			results = [];
			searched = false;
			searching = false;
			controller?.abort();
			return;
		}
		debounce = setTimeout(() => run(v.trim()), 500);
	}

	function choose(pick: EntityPick) {
		onSelect(pick);
		open = false;
	}

	function commitId() {
		const n = Number(idText);
		if (Number.isInteger(n) && n > 0) onSelect(idPick(kind, n));
		else onSelect(null);
	}

	function switchMode(m: 'search' | 'id') {
		mode = m;
		if (m === 'id') idText = value ? String(value.id) : '';
	}

	// Reset the transient search state whenever the popover closes.
	$effect(() => {
		if (!open) {
			query = '';
			results = [];
			searched = false;
		}
	});

	function autofocus(node: HTMLInputElement) {
		node.focus();
	}
</script>

<div>
	<div class="mb-2 flex items-center justify-between">
		<span class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
		<span class="text-xs text-muted-foreground">
			<button
				type="button"
				onclick={() => switchMode('search')}
				class={cn('transition-colors hover:text-foreground', mode === 'search' && 'text-info')}
			>
				Search
			</button>
			<span class="mx-1.5 opacity-40">·</span>
			<button
				type="button"
				onclick={() => switchMode('id')}
				class={cn('transition-colors hover:text-foreground', mode === 'id' && 'text-info')}
			>
				ID
			</button>
		</span>
	</div>

	{#if mode === 'id'}
		<div class="flex items-center gap-2 rounded-lg border border-input bg-background px-2.5 py-1.5">
			<span class="text-sm text-muted-foreground">#</span>
			<Input
				type="number"
				min="1"
				bind:value={idText}
				oninput={commitId}
				placeholder={kind === 'anime' ? 'AniList ID' : 'TVDB ID'}
				class="h-7 border-0 bg-transparent px-0 focus-visible:ring-0"
			/>
		</div>
	{:else}
		<Popover.Root bind:open>
			<Popover.Trigger
				class={cn(
					'flex min-h-11 w-full min-w-0 items-center gap-2.5 rounded-lg border border-input bg-background px-2 py-1.5 text-sm',
					'transition-colors focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:outline-none'
				)}
			>
				{#if value}
					{#if value.imageUrl}
						<img
							src={value.imageUrl}
							alt=""
							class="h-9 w-[26px] shrink-0 rounded-sm object-cover"
						/>
					{:else}
						<div class="h-9 w-[26px] shrink-0 rounded-sm bg-muted"></div>
					{/if}
					<span class="flex min-w-0 flex-col text-left">
						<span class="line-clamp-2 break-words">{value.title}</span>
						{#if value.secondary}
							<span class="truncate text-xs text-muted-foreground">{value.secondary}</span>
						{/if}
						{#if value.subline}
							<span class="truncate text-xs text-muted-foreground">{value.subline}</span>
						{/if}
					</span>
				{:else}
					<span class="truncate pl-1 text-muted-foreground">{placeholder}</span>
				{/if}
				<Icon name="chevron-down" size={16} class="ml-auto shrink-0 text-muted-foreground" />
			</Popover.Trigger>
			<Popover.Content class="w-(--bits-popover-anchor-width) min-w-72 gap-0 p-0" align="start">
				<div class="border-b border-border p-1.5">
					<input
						use:autofocus
						value={query}
						oninput={(e) => onQuery(e.currentTarget.value)}
						{placeholder}
						class="h-8 w-full rounded-md bg-transparent px-2 text-sm focus:outline-none"
					/>
				</div>
				<ul class="max-h-72 overflow-y-auto p-1">
					{#each results as r (r.id)}
						<li>
							<button
								type="button"
								onclick={() => choose(r)}
								class={cn(
									'flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors hover:bg-sidebar-accent',
									r.id === value?.id && 'bg-sidebar-accent'
								)}
							>
								{#if r.imageUrl}
									<img src={r.imageUrl} alt="" class="h-11 w-8 shrink-0 rounded-sm object-cover" />
								{:else}
									<div class="h-11 w-8 shrink-0 rounded-sm bg-muted"></div>
								{/if}
								<span class="flex min-w-0 flex-col">
									<span class="line-clamp-2 text-sm break-words">{r.title}</span>
									{#if r.secondary}
										<span class="truncate text-xs text-muted-foreground">{r.secondary}</span>
									{/if}
									{#if r.subline}
										<span class="truncate text-xs text-muted-foreground">{r.subline}</span>
									{/if}
								</span>
								{#if r.id === value?.id}
									<Icon name="check" size={14} class="ml-auto shrink-0 text-foreground" />
								{/if}
							</button>
						</li>
					{/each}
					{#if results.length === 0}
						<li class="px-2 py-3 text-sm text-muted-foreground">
							{#if searching}
								Searching…
							{:else if query.trim().length < 3}
								Type at least 3 characters.
							{:else if searched}
								No matches.
							{:else}
								Searching…
							{/if}
						</li>
					{/if}
				</ul>
			</Popover.Content>
		</Popover.Root>
	{/if}
</div>
