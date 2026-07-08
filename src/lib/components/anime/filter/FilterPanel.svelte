<script lang="ts">
	import type { AnilistAnimeStatus } from '$lib/api/types';
	import { ANILIST_ANIME_FORMATS, ANILIST_ANIME_SOURCES } from '$lib/api/types';
	import {
		cycleTri,
		cycleTriInclude,
		filterCount,
		type FilterState,
		type PresentOptions
	} from '$lib/anilist/collection';
	import { airingStatusLabel, formatLabel, sourceLabel } from '$lib/anilist/enums';
	import { categoryLabel } from '$lib/anilist/tag-categories';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import Icon from '$lib/components/Icon.svelte';
	import TriChip from './TriChip.svelte';

	let {
		draft = $bindable(),
		present = null,
		genres = [],
		categoryToTags,
		showCheckboxes = true,
		searchMode = false,
		onApply,
		onClear
	}: {
		draft: FilterState;
		present?: PresentOptions | null;
		genres?: string[];
		categoryToTags: Map<string, string[]>;
		showCheckboxes?: boolean;
		/** Search tab: status/format/source are include-only (no `/anime` exclude param). */
		searchMode?: boolean;
		onApply: () => void;
		onClear: () => void;
	} = $props();

	const STATUS_OPTIONS: AnilistAnimeStatus[] = ['RELEASING', 'NOT_YET_RELEASED', 'FINISHED'];

	const statusOptions = $derived(
		present ? STATUS_OPTIONS.filter((s) => present.statuses.includes(s)) : STATUS_OPTIONS
	);
	const genreOptions = $derived(present ? present.genres : genres);
	const formatOptions = $derived(present ? present.formats : ANILIST_ANIME_FORMATS);
	const sourceOptions = $derived(present ? present.sources : ANILIST_ANIME_SOURCES);

	const tagGroups = $derived.by(() => {
		const allowed = present ? new Set(present.tags) : null;
		const groups: Array<{ category: string; tags: string[] }> = [];
		for (const [category, tags] of categoryToTags) {
			const list = allowed ? tags.filter((t) => allowed.has(t)) : tags;
			if (list.length > 0) groups.push({ category, tags: list });
		}
		return groups;
	});

	// Tags can number in the hundreds — let the user narrow them with a search box.
	let tagQuery = $state('');
	const visibleTagGroups = $derived.by(() => {
		const q = tagQuery.trim().toLowerCase();
		if (!q) return tagGroups;
		const groups: Array<{ category: string; tags: string[] }> = [];
		for (const g of tagGroups) {
			const tags = g.tags.filter((t) => t.toLowerCase().includes(q));
			if (tags.length > 0) groups.push({ category: g.category, tags });
		}
		return groups;
	});

	const hasAdvanced = $derived(
		Object.keys(draft.formats).length > 0 ||
			Object.keys(draft.sources).length > 0 ||
			Object.keys(draft.tags).length > 0
	);
	let showMore = $state(false);
	$effect(() => {
		if (hasAdvanced) showMore = true;
	});

	const count = $derived(filterCount(draft));
</script>

{#snippet actions()}
	<div class="flex items-center justify-between gap-2">
		<button
			type="button"
			class="font-medium text-muted-foreground hover:text-foreground"
			onclick={onClear}
		>
			Clear all{count > 0 ? ` (${count})` : ''}
		</button>
		<Button
			type="button"
			variant="affirmative"
			class="h-9 px-5 text-sm sm:h-7 sm:px-3 sm:text-xs"
			onclick={onApply}>Apply</Button
		>
	</div>
{/snippet}

{#snippet triGroup(
	title: string,
	options: string[],
	group: keyof FilterState,
	labeler: (v: string) => string,
	includeOnly: boolean = false
)}
	{#if options.length > 0}
		<div class="space-y-1.5">
			<h4 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h4>
			<div class="flex flex-wrap gap-1.5">
				{#each options as opt (opt)}
					<TriChip
						label={labeler(opt)}
						state={(draft[group] as Record<string, 'include' | 'exclude'>)[opt]}
						onclick={() =>
							(draft[group] = (includeOnly ? cycleTriInclude : cycleTri)(
								draft[group] as Record<string, 'include' | 'exclude'>,
								opt
							) as never)}
					/>
				{/each}
			</div>
		</div>
	{/if}
{/snippet}

<div class="flex max-h-[70vh] flex-col">
	<div class="flex-1 space-y-4 overflow-y-auto px-4 py-3">
		{#if showCheckboxes}
			<div class="space-y-2">
				<div class="flex flex-col gap-2">
					<label class="flex w-fit cursor-pointer items-center gap-2 text-sm">
						<Checkbox bind:checked={draft.onList} />
						On my list
					</label>
					<label class="flex w-fit cursor-pointer items-center gap-2 text-sm">
						<Checkbox bind:checked={draft.notOnList} />
						Not on my list
					</label>
				</div>
				<!-- Tracked filter isn't a `/anime` search param — Browse (client) only. -->
				{#if !searchMode}
					<hr class="border-border" />
					<div class="flex flex-col gap-2">
						<label class="flex w-fit cursor-pointer items-center gap-2 text-sm">
							<Checkbox bind:checked={draft.tracked} />
							Tracked
						</label>
						<label class="flex w-fit cursor-pointer items-center gap-2 text-sm">
							<Checkbox bind:checked={draft.notTracked} />
							Not tracked
						</label>
					</div>
				{/if}
			</div>
		{/if}

		{@render triGroup(
			'Status',
			statusOptions,
			'status',
			(v) => airingStatusLabel(v as AnilistAnimeStatus),
			searchMode
		)}
		{@render triGroup('Genres', genreOptions, 'genres', (v) => v)}

		<div>
			<button
				type="button"
				class="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
				onclick={() => (showMore = !showMore)}
			>
				<Icon name={showMore ? 'chevron-down' : 'chevron-right'} size={14} />
				{showMore ? 'Fewer filters' : 'Show more filters'}
			</button>
		</div>

		{#if showMore}
			<div class="space-y-4">
				{@render triGroup(
					'Format',
					formatOptions,
					'formats',
					(v) => formatLabel(v as never),
					searchMode
				)}
				{@render triGroup(
					'Source',
					sourceOptions,
					'sources',
					(v) => sourceLabel(v as never),
					searchMode
				)}

				{#if tagGroups.length > 0}
					<div class="space-y-3">
						<div class="space-y-2">
							<h4 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
								Tags
							</h4>
							<div class="relative">
								<Icon
									name="search"
									size={14}
									class="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
								/>
								<Input bind:value={tagQuery} placeholder="Search tags…" class="h-8 pl-8 text-sm" />
							</div>
						</div>
						{#if visibleTagGroups.length === 0}
							<p class="text-xs text-muted-foreground">No tags match “{tagQuery.trim()}”.</p>
						{/if}
						{#each visibleTagGroups as { category, tags } (category)}
							<div class="space-y-1.5">
								<h5 class="text-[0.7rem] font-medium text-muted-foreground">
									{categoryLabel(category)}
								</h5>
								<div class="flex flex-wrap gap-1.5">
									{#each tags as tag (tag)}
										<TriChip
											label={tag}
											state={draft.tags[tag]}
											onclick={() => (draft.tags = cycleTri(draft.tags, tag))}
										/>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<div class="border-t border-border px-4 py-3">
		{@render actions()}
	</div>
</div>
