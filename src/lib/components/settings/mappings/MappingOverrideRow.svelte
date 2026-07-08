<script lang="ts">
	/* One override listing row: AniList entity → range summary → TVDB entity, with edit/delete.
	   Stacks vertically on narrow widths (the arrow rotates to point down). */
	import type { MappingOverrideItem } from '$lib/api/types';
	import { displayTitle, secondaryTitle } from '$lib/anilist/titles';
	import { itemTitled, anilistRange, tvdbRange, granularityToken } from '$lib/mappings/overrides';
	import { resolveBackendUrl } from '$lib/config/api';
	import Icon from '$lib/components/Icon.svelte';

	let {
		item,
		onEdit,
		onDelete
	}: {
		item: MappingOverrideItem;
		onEdit: (item: MappingOverrideItem) => void;
		onDelete: (item: MappingOverrideItem) => void;
	} = $props();

	const aniTitle = $derived(displayTitle(itemTitled(item)));
	const aniSecondary = $derived(secondaryTitle(itemTitled(item)));
	// Backend hands us relative asset URLs — always resolve against the API base.
	const aniCover = $derived(resolveBackendUrl(item.anilist_small_cover_image));
	const tvdbCover = $derived(resolveBackendUrl(item.tvdb_image_url));
</script>

<div
	class="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:gap-4"
>
	<!-- AniList -->
	<div class="flex min-w-0 flex-1 items-center gap-2.5">
		{#if aniCover}
			<img src={aniCover} alt="" class="h-11 w-8 shrink-0 rounded-sm object-cover" />
		{:else}
			<div class="h-11 w-8 shrink-0 rounded-sm bg-muted"></div>
		{/if}
		<span class="flex min-w-0 flex-col">
			<span class="truncate text-sm font-medium">{aniTitle}</span>
			{#if aniSecondary}
				<span class="truncate text-xs text-muted-foreground">{aniSecondary}</span>
			{/if}
		</span>
	</div>

	<!-- Mapping summary -->
	<div class="flex shrink-0 flex-col items-center gap-1 sm:w-52">
		<div class="flex items-center gap-2 text-xs tabular-nums">
			<span class="rounded-md border border-border bg-muted/40 px-2 py-0.5 whitespace-nowrap">
				{anilistRange(item)}
			</span>
			<Icon name="arrow-right" size={16} class="hidden text-muted-foreground sm:block" />
			<Icon name="chevron-down" size={16} class="text-muted-foreground sm:hidden" />
			<span class="rounded-md border border-border bg-muted/40 px-2 py-0.5 whitespace-nowrap">
				{tvdbRange(item)}
			</span>
		</div>
		<div class="flex items-center gap-2 text-[11px] text-muted-foreground">
			<span class="tabular-nums">{granularityToken(item.granularity)} map</span>
			<span>·</span>
			{#if item.mode === 'ALWAYS'}
				<span class="flex items-center gap-1 font-semibold text-warning">
					<Icon name="alert-triangle" size={11} />
					Always
				</span>
			{:else}
				<span>If missing</span>
			{/if}
		</div>
	</div>

	<!-- TVDB -->
	<div class="flex min-w-0 flex-1 items-center gap-2.5 sm:justify-end sm:text-right">
		<span class="order-2 min-w-0 truncate text-sm font-medium sm:order-1">{item.tvdb_title}</span>
		{#if tvdbCover}
			<img
				src={tvdbCover}
				alt=""
				class="order-1 h-11 w-8 shrink-0 rounded-sm object-cover sm:order-2"
			/>
		{:else}
			<div class="order-1 h-11 w-8 shrink-0 rounded-sm bg-muted sm:order-2"></div>
		{/if}
	</div>

	<!-- Actions -->
	<div class="flex shrink-0 items-center gap-1 self-end sm:self-center">
		<button
			type="button"
			onclick={() => onEdit(item)}
			class="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
			aria-label="Edit override"
		>
			<Icon name="edit" size={16} />
		</button>
		<button
			type="button"
			onclick={() => onDelete(item)}
			class="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
			aria-label="Delete override"
		>
			<Icon name="trash" size={16} />
		</button>
	</div>
</div>
