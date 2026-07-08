<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { rss } from '$lib/stores/rss.svelte';
	import { notifyError } from '$lib/api/notify';
	import { isSelectable, isDiscardable } from '$lib/rss/recognition';
	import { rssActions } from '$lib/stores/rss-actions.svelte';
	import { rssMenu } from '$lib/stores/rss-menu.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import RssToolbar from '$lib/components/rss/RssToolbar.svelte';
	import TorrentTable from '$lib/components/rss/TorrentTable.svelte';
	import ConfirmDownloadDialog from '$lib/components/rss/ConfirmDownloadDialog.svelte';
	import DownloadProgressDialog from '$lib/components/rss/DownloadProgressDialog.svelte';
	import IdentifyDialog from '$lib/components/rss/IdentifyDialog.svelte';
	import RssEpisodeDetailsDialog from '$lib/components/rss/RssEpisodeDetailsDialog.svelte';
	import TrackDialog from '$lib/components/tracked/TrackDialog.svelte';
	import OverrideConfirmDialog from '$lib/components/OverrideConfirmDialog.svelte';
	import Icon from '$lib/components/Icon.svelte';

	const focusHash = $derived(page.url.searchParams.get('magnet_hash'));

	onMount(() => {
		rss.start();
		return () => rss.stop();
	});

	// The URL is the source of truth for the search: `?q=` opens the search row + runs the search
	// (`?groups=` CSV when a non-full subset; absent = all groups); no `?q=` shows the live feed.
	let appliedSearchKey: string | null = null;
	$effect(() => {
		const q = page.url.searchParams.get('q');
		const groupsParam = page.url.searchParams.get('groups');
		const key = JSON.stringify([q, groupsParam]);
		if (key === appliedSearchKey) return;
		appliedSearchKey = key;
		if (q == null) {
			rss.showFeed();
			return;
		}
		const groups =
			groupsParam == null ? [...rss.availableGroups] : groupsParam ? groupsParam.split(',') : [];
		rss.searchOpen = true;
		rss.searchQuery = q;
		rss.searchGroups = groups;
		rss
			.search(q, groups)
			.catch((e) => notifyError(e instanceof Error ? e.message : 'Search failed'));
	});

	const selectable = $derived(rss.torrents.filter(isSelectable));
	const selectedItems = $derived(rss.selectedItems());
	const selectionCount = $derived(rss.selection.size);
	const downloadableCount = $derived(selectedItems.filter((t) => t.download == null).length);
	const discardableCount = $derived(selectedItems.filter(isDiscardable).length);
	const allSelectableSelected = $derived(
		selectable.length > 0 && selectable.every((t) => rss.isSelected(t.rss_torrent.magnet_hash))
	);

	function selectAll() {
		rss.selectHashes(selectable.map((t) => t.rss_torrent.magnet_hash));
	}
</script>

<div class="flex flex-col gap-4">
	<PageHeader title="RSS" icon="rss" subtitle="Browse and manage torrents from your RSS feed" />

	<RssToolbar
		{selectionCount}
		{downloadableCount}
		{discardableCount}
		{allSelectableSelected}
		hasSelectable={selectable.length > 0}
		onDownload={() => rssActions.requestDownload(selectedItems)}
		onDiscard={() => rssActions.discard(selectedItems)}
		onSelectAll={selectAll}
		onUnselectAll={() => rss.unselectAll()}
	/>

	{#if !rss.loaded && rss.loading}
		<div
			class="flex items-center gap-2 rounded-xl border bg-card p-6 text-sm text-muted-foreground"
		>
			<Icon name="spinner" size={15} class="animate-spin" /> Loading torrents…
		</div>
	{:else if rss.loadFailed && !rss.loaded}
		<div class="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
			Couldn't load torrents. Retrying…
		</div>
	{:else if rss.torrents.length === 0}
		<div
			class="flex flex-col items-center gap-2 rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground"
		>
			<Icon name={rss.searchMode ? 'search' : 'rss'} size={28} class="text-muted-foreground/50" />
			{#if rss.searchMode}
				<p>No torrents matched your search.</p>
				<p class="text-xs">Try a different query or release-group selection.</p>
			{:else}
				<p>No torrents in the feed yet.</p>
				<p class="text-xs">Use “Check for torrents” to fetch the RSS feed.</p>
			{/if}
		</div>
	{:else}
		<TorrentTable {focusHash} />
	{/if}
</div>

<ConfirmDownloadDialog />
<OverrideConfirmDialog
	bind:open={rssActions.revertOpen}
	title="Revert to this release?"
	confirmLabel="Revert"
	onConfirm={(df) => rssActions.confirmRevert(df)}
/>
<DownloadProgressDialog />
<IdentifyDialog />
<RssEpisodeDetailsDialog />
<TrackDialog
	bind:open={rssMenu.trackOpen}
	summary={rssMenu.trackSummary}
	item={rssMenu.trackItem}
	onSaved={() => rssMenu.closeTrack()}
/>
