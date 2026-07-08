<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { resolveBackendUrl } from '$lib/config/api';
	import { displayTitle } from '$lib/anilist/titles';
	import { airingStatusLabel, seasonYearLabel } from '$lib/anilist/enums';
	import { AIRING_STATUS_ACCENT, WATCH_STATUS_ACCENT } from '$lib/anilist/colors';
	import { ANILIST_STATUS_LABELS, ANILIST_STATUS_ICON } from '$lib/anilist/entry';
	import type { AnimeResult } from '$lib/api/types';
	import { cn } from '$lib/utils';

	let {
		result,
		highlighted = false,
		onSelect
	}: { result: AnimeResult; highlighted?: boolean; onSelect: () => void } = $props();

	const cover = $derived(resolveBackendUrl(result.small_cover_image));
	const title = $derived(displayTitle(result));
	const meta = $derived(
		[airingStatusLabel(result.status), seasonYearLabel(result.season, result.season_year)]
			.filter((s) => s && s !== '—')
			.join(' · ')
	);
</script>

<button
	type="button"
	onclick={onSelect}
	class={cn(
		'flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors',
		highlighted ? 'bg-muted' : 'hover:bg-muted/60'
	)}
>
	<!-- Cover -->
	<div class="h-12 w-9 shrink-0 overflow-hidden rounded bg-muted">
		{#if cover}
			<img src={cover} alt="" class="h-full w-full object-cover" loading="lazy" />
		{:else}
			<div class="flex h-full w-full items-center justify-center text-muted-foreground">
				<Icon name="browse" size={14} />
			</div>
		{/if}
	</div>

	<!-- Title + meta -->
	<div class="min-w-0 flex-1">
		<p class="truncate text-sm font-medium">{title}</p>
		{#if meta}
			<p class="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
				{#if result.status}
					<span
						class={cn('h-1.5 w-1.5 shrink-0 rounded-full', AIRING_STATUS_ACCENT[result.status].dot)}
					></span>
				{/if}
				{meta}
			</p>
		{/if}
	</div>

	<!-- Status icons -->
	<div class="flex shrink-0 items-center gap-1.5">
		{#if result.user_list_status}
			<span title={ANILIST_STATUS_LABELS[result.user_list_status] ?? result.user_list_status}>
				<Icon
					name={ANILIST_STATUS_ICON[result.user_list_status]}
					size={15}
					class={WATCH_STATUS_ACCENT[result.user_list_status].text}
				/>
			</span>
		{/if}
		{#if result.tracked_anime_id != null}
			<span title="Tracked"><Icon name="tracked" size={15} class="text-info" /></span>
		{/if}
	</div>
</button>
