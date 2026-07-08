<script lang="ts">
	/* The per-row ⋯ actions menu: navigation (Episode details / tracked anime / browse)
	   plus Retry (failed/removed) and Delete (non-imported). Wrapped so the trigger
	   click doesn't bubble up and toggle the row's expand. */
	import { goto } from '$app/navigation';
	import type { DownloadItem } from '$lib/api/types';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import Icon from '$lib/components/Icon.svelte';
	import { downloadsActions, canRetry, canRevert } from '$lib/stores/downloads-actions.svelte';

	let { item }: { item: DownloadItem } = $props();

	const retryable = $derived(canRetry(item));
	const revertable = $derived(canRevert(item));
	const hasEpisodes = $derived(item.anilist_episode_numbers.length > 0);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
	<DropdownMenu.Root>
		<DropdownMenu.Trigger
			title="Actions"
			class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
		>
			<Icon name="more-horizontal" size={16} />
			<span class="sr-only">Actions</span>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" class="w-52">
			{#if hasEpisodes}
				<DropdownMenu.Item onSelect={() => downloadsActions.openEpisode(item)}>
					<Icon name="notes" size={15} /> Episode details…
				</DropdownMenu.Item>
			{/if}
			<DropdownMenu.Item onSelect={() => goto(`/tracked/${item.anime.tracked_anime_id}`)}>
				<Icon name="tracked" size={15} /> Go to tracked anime
			</DropdownMenu.Item>
			<DropdownMenu.Item onSelect={() => goto(`/browse?anilist_id=${item.anime.anilist_id}`)}>
				<Icon name="browse" size={15} /> View in browse
			</DropdownMenu.Item>

			<DropdownMenu.Separator />
			{#if revertable}
				<DropdownMenu.Item onSelect={() => downloadsActions.requestRevert(item)}>
					<Icon name="refresh" size={15} /> Revert to this release
				</DropdownMenu.Item>
			{/if}
			{#if retryable}
				<DropdownMenu.Item onSelect={() => downloadsActions.retry(item)}>
					<Icon name="refresh" size={15} /> Retry
				</DropdownMenu.Item>
			{/if}
			<DropdownMenu.Item
				class="text-destructive data-highlighted:text-destructive"
				onSelect={() => downloadsActions.requestDelete(item)}
			>
				<Icon name="trash" size={15} /> Delete
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
