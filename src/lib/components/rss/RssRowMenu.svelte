<script lang="ts">
	/* Right-click / long-press context menu for a torrent row. The `<tr>` itself is
	   the trigger (bits-ui `child` snippet — a <tr> can't be wrapped in a <div>).
	   Lazy-mounts the real menu on first pointer interaction so a long list doesn't
	   spin up one bits-ui menu per row. Actions are gated by `torrentActions`. */
	import type { Snippet } from 'svelte';
	import type { TorrentListItem } from '$lib/api/types';
	import { goto } from '$app/navigation';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import Icon from '$lib/components/Icon.svelte';
	import { torrentActions } from '$lib/rss/menu';
	import { isRecognized } from '$lib/rss/recognition';
	import { headerLine } from '$lib/rss/resolve';
	import { rssActions } from '$lib/stores/rss-actions.svelte';
	import { rssMenu } from '$lib/stores/rss-menu.svelte';
	import { contextMenu } from '$lib/stores/context-menu.svelte';

	let {
		item,
		child
	}: {
		item: TorrentListItem;
		/** The row element — receives `props` to spread so right-click/long-press attach. */
		child: Snippet<[{ props: Record<string, unknown> }]>;
	} = $props();

	const a = $derived(torrentActions(item));

	// Recognized rows can deep-link to RSS search by anime (title) or by episode (title + first ep).
	const searchTitle = $derived(item.anilist_romaji_title ?? item.anilist_english_title ?? '');
	const searchAnime = () => goto(`/rss?q=${encodeURIComponent(searchTitle)}`);
	const searchEpisode = () =>
		goto(`/rss?q=${encodeURIComponent(`${searchTitle} ${item.anilist_episode_numbers[0]}`)}`);

	let mounted = $state(false);
	const arm = () => (mounted = true);
	const armHandlers = { onpointerenter: arm, onpointerdown: arm };

	let menuOpen = $state(false);
	const menuId = Symbol('rss-row-menu');
	$effect(() => {
		if (menuOpen) contextMenu.open(menuId);
		else contextMenu.close(menuId);
	});
	$effect(() => {
		if (contextMenu.openId !== menuId && menuOpen) menuOpen = false;
	});

	const openExternal = () => window.open(item.rss_torrent.web_link, '_blank', 'noopener');
</script>

{#if !mounted}
	{@render child({ props: armHandlers })}
{:else}
	<ContextMenu.Root bind:open={menuOpen}>
		<ContextMenu.Trigger {child} />
		<ContextMenu.Content class="w-60">
			<div class="px-2 py-1.5">
				<p class="truncate text-xs font-medium text-foreground">{headerLine(item)}</p>
			</div>
			<ContextMenu.Separator />

			{#if a.goToDownload && item.download}
				<ContextMenu.Item onSelect={() => goto(`/downloads?id=${item.download?.id}`)}>
					<Icon name="downloads" size={15} /> Go to download
				</ContextMenu.Item>
			{/if}
			{#if a.download}
				<ContextMenu.Item onSelect={() => rssActions.requestDownload([item])}>
					<Icon name="downloads" size={15} /> Download &amp; import
				</ContextMenu.Item>
			{/if}
			{#if a.revert}
				<ContextMenu.Item onSelect={() => rssActions.requestRevert(item)}>
					<Icon name="refresh" size={15} /> Revert to this release
				</ContextMenu.Item>
			{/if}
			{#if a.discard}
				<ContextMenu.Item onSelect={() => rssActions.discard([item])}>
					<Icon name="trash" size={15} /> Discard
				</ContextMenu.Item>
			{/if}
			{#if a.identify}
				<ContextMenu.Item onSelect={() => rssMenu.openIdentify(item)}>
					<Icon name="select" size={15} /> Identify…
				</ContextMenu.Item>
			{/if}

			{#if isRecognized(item)}
				<ContextMenu.Separator />
				<ContextMenu.Item onSelect={searchAnime}>
					<Icon name="rss" size={15} /> Search for this anime
				</ContextMenu.Item>
				<ContextMenu.Item onSelect={searchEpisode}>
					<Icon name="rss" size={15} /> Search for this episode
				</ContextMenu.Item>
			{/if}

			<ContextMenu.Separator />

			{#if a.track}
				<ContextMenu.Item onSelect={() => rssMenu.openTrack(item)}>
					<Icon name="tracked" size={15} /> Track anime…
				</ContextMenu.Item>
			{/if}
			{#if a.editTracking}
				<ContextMenu.Item onSelect={() => rssMenu.openEdit(item)}>
					<Icon name="edit" size={15} /> Edit tracking…
				</ContextMenu.Item>
			{/if}
			{#if a.episodeDetails}
				<ContextMenu.Item onSelect={() => rssMenu.openEpisode(item)}>
					<Icon name="notes" size={15} /> Episode details…
				</ContextMenu.Item>
				<ContextMenu.Separator />
			{/if}
			<ContextMenu.Item onSelect={openExternal}>
				<Icon name="external-link" size={15} /> View external torrent
			</ContextMenu.Item>
			{#if a.goToTracked}
				<ContextMenu.Item onSelect={() => goto(`/tracked/${item.tracked_anime_id}`)}>
					<Icon name="tracked" size={15} /> Go to tracked anime
				</ContextMenu.Item>
			{/if}
			{#if a.goToAnime}
				<ContextMenu.Item onSelect={() => goto(`/browse?anilist_id=${item.anilist_id}`)}>
					<Icon name="browse" size={15} /> Go to anime
				</ContextMenu.Item>
			{/if}
		</ContextMenu.Content>
	</ContextMenu.Root>
{/if}
