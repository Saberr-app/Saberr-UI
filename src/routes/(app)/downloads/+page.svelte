<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import DownloadsToolbar from '$lib/components/downloads/DownloadsToolbar.svelte';
	import DownloadRow from '$lib/components/downloads/DownloadRow.svelte';
	import DownloadEpisodeDetailsDialog from '$lib/components/downloads/DownloadEpisodeDetailsDialog.svelte';
	import DeleteDownloadDialog from '$lib/components/downloads/DeleteDownloadDialog.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import OverrideConfirmDialog from '$lib/components/OverrideConfirmDialog.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { intersect } from '$lib/utils/infinite-scroll';
	import { downloads } from '$lib/stores/downloads.svelte';
	import { downloadsActions } from '$lib/stores/downloads-actions.svelte';
	import { downloadUpdates } from '$lib/stores/download-updates.svelte';
	import { status } from '$lib/stores/status.svelte';
	import type { TorrentDownloadStatus } from '$lib/api/types';

	// Single (`?id=`) download deleted backend-side while being viewed.
	const singleDeleted = $derived(
		downloads.single != null && downloadUpdates.isDeleted(downloads.single.id)
	);

	// Filter selection (bound into the toolbar; applied server-side via the store).
	let statuses = $state<string[]>([...downloads.statuses]);

	function applyFilter() {
		downloads.setStatuses(statuses as TorrentDownloadStatus[]);
	}

	// `?id=` drives single vs list mode. Only the param is a dependency; the switch is untracked (it r/w store state).
	const idParam = $derived(page.url.searchParams.get('id'));
	$effect(() => {
		const id = idParam != null ? Number(idParam) : null;
		untrack(() => {
			if (id != null && !Number.isNaN(id)) downloads.showSingle(id);
			else downloads.showList();
		});
	});

	// A new download (`download_added` advanced) → silent reconcile (reading it registers the dependency).
	$effect(() => {
		downloads.refreshIfStale(status.downloadAddedAt);
	});

	onMount(() => {
		downloads.enter();
		return () => downloads.leave();
	});
</script>

<PageHeader title="Downloads" icon="downloads" />

<div class="mt-6 flex flex-col gap-4">
	{#if idParam}
		<!-- Single-download view. -->
		<div
			class="flex items-center gap-2 rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-sm text-info"
		>
			<Icon name="eye" size={15} />
			<span class="flex-1">
				Viewing a single download.{#if singleDeleted}
					<span class="font-semibold text-destructive">It was deleted on the backend.</span>
				{/if}
			</span>
			<button
				type="button"
				onclick={() => goto('/downloads')}
				class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium transition-colors hover:bg-info/15"
			>
				<Icon name="close" size={14} /> Clear
			</button>
		</div>

		{#if downloads.singleLoading}
			<p class="text-sm text-muted-foreground">Loading download…</p>
		{:else if downloads.singleFailed}
			<p class="text-sm text-muted-foreground">
				That download couldn't be found. It may have been deleted.
			</p>
		{:else if downloads.single}
			<DownloadRow item={downloads.single} startOpen />
		{/if}
	{:else if !downloads.firstLoadDone && downloads.loadFailed}
		<DownloadsToolbar
			bind:statuses
			onchange={applyFilter}
			onrefresh={() => downloads.refresh()}
			refreshing={downloads.loading}
		/>
		<p class="text-sm text-muted-foreground">
			Couldn't load downloads. Make sure the backend is reachable, then refresh.
		</p>
	{:else}
		<DownloadsToolbar
			bind:statuses
			onchange={applyFilter}
			onrefresh={() => downloads.refresh()}
			refreshing={downloads.loading}
		/>

		{#if !downloads.firstLoadDone}
			<p class="text-sm text-muted-foreground">Loading downloads…</p>
		{:else if downloads.visibleItems.length === 0}
			<p class="text-sm text-muted-foreground">
				{statuses.length ? 'No downloads match this filter.' : 'No downloads yet.'}
			</p>
		{:else}
			<div class="flex flex-col gap-1.5">
				{#each downloads.visibleItems as item (item.id)}
					<DownloadRow {item} />
				{/each}
			</div>

			{#if !downloads.done}
				<div
					use:intersect={{ onIntersect: () => downloads.loadMore(), disabled: downloads.loading }}
					class="h-1"
				></div>
				{#if downloads.loading}
					<p class="py-2 text-center text-sm text-muted-foreground">Loading more…</p>
				{/if}
			{/if}
		{/if}
	{/if}
</div>

<!-- Episode-details popup (opened from a row's ⋯ menu / expanded view). -->
<DownloadEpisodeDetailsDialog />

<!-- Action confirmations (state lives in the actions controller). -->
<ConfirmDialog
	bind:open={downloadsActions.retryConfirmOpen}
	title="Retry this download?"
	description="This torrent has been superseded by a newer version. Retrying will replace the newer download."
	confirmLabel="That's fine"
	cancelLabel="Never mind"
	onConfirm={() => downloadsActions.confirmRetry()}
/>
<DeleteDownloadDialog />
<OverrideConfirmDialog
	bind:open={downloadsActions.revertConfirmOpen}
	title="Revert to this release?"
	confirmLabel="Revert"
	onConfirm={(df) => downloadsActions.confirmRevert(df)}
/>
