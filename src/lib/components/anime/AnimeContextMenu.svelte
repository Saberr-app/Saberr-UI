<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { AnilistAnimeUserStatus } from '$lib/api/types';
	import { ANILIST_USER_STATUSES } from '$lib/api/types';
	import type { BatchMenuCtl } from '$lib/stores/selection.svelte';
	import { contextMenu } from '$lib/stores/context-menu.svelte';
	import { ANILIST_STATUS_LABELS, ANILIST_STATUS_ICON } from '$lib/anilist/entry';
	import {
		addEntry,
		removeEntry,
		setStatus,
		type MutationContext
	} from '$lib/anilist/entry-actions';
	import { goto } from '$app/navigation';
	import type { TrackingMenuCtl } from '$lib/tracked/menu';
	import { anilistAnimeUrl, malAnimeUrl, tvdbSeriesUrl } from '$lib/config/external';
	import { copyText } from '$lib/utils/clipboard';
	import { notifyError, notifySuccess } from '$lib/api/notify';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import Icon from '$lib/components/Icon.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { cn } from '$lib/utils';

	let {
		ctx,
		idMal,
		tvdbId = null,
		title,
		titles,
		onEdit,
		onSelect,
		tracking,
		selecting = false,
		batch,
		children,
		child,
		triggerClass
	}: {
		ctx: MutationContext;
		idMal: number | null;
		/** TVDB series id when known — enables the TVDB copy-link + Open-in items. */
		tvdbId?: number | null;
		title: string;
		/** Raw titles for the Copy submenu. */
		titles: { english: string | null; romaji: string | null; native: string | null };
		/** Open the full edit dialog (on-list "Edit list entry"). */
		onEdit: () => void;
		/** Enter selection mode + select this item. Omit to hide the Select item. */
		onSelect?: () => void;
		/** Tracking actions (Track / Edit tracking / Archive / Delete). Omit to hide. */
		tracking?: TrackingMenuCtl;
		/** In selection mode the menu swaps to the batch-action menu (acts on selection). */
		selecting?: boolean;
		batch?: BatchMenuCtl;
		/** Classes for the default trigger wrapper (children mode), e.g. `min-w-0`. */
		triggerClass?: string;
		/** Default: wraps the trigger in a div. */
		children?: Snippet;
		/** Bring-your-own trigger (e.g. a `<tr>`): receives `props` to spread, no wrapper element. */
		child?: Snippet<[{ props: Record<string, unknown> }]>;
	} = $props();

	const onList = $derived(ctx.entry != null);
	// "Remove from list" clusters with the tracked-management actions (archive/delete) at the bottom
	// when that group exists (tracked page); elsewhere it sits inside the list-actions group.
	const trackedMgmt = $derived(
		!!(tracking && (tracking.onArchive || tracking.onUnarchive || tracking.onDelete))
	);

	let confirmRemove = $state(false);
	let menuOpen = $state(false);

	// Lazy-mount: don't instantiate a bits-ui menu per row. Render the bare trigger until the pointer
	// reaches the item (hover / first touch), then mount the real menu before the right-click/long-press.
	let mounted = $state(false);
	const arm = () => {
		mounted = true;
	};
	const armHandlers = { onpointerenter: arm, onpointerdown: arm };

	// Coordinate with sibling menus (only one open at a time); also lets items swallow the dismissing tap.
	const menuId = Symbol('anime-context-menu');
	$effect(() => {
		if (menuOpen) contextMenu.open(menuId);
		else contextMenu.close(menuId);
	});
	$effect(() => {
		if (contextMenu.openId !== menuId && menuOpen) menuOpen = false;
	});

	const open = (url: string) => window.open(url, '_blank', 'noopener');
	async function copy(text: string, label: string) {
		const ok = await copyText(text);
		if (ok) notifySuccess(`Copied ${label}`);
		else notifyError("Couldn't copy to clipboard");
	}
</script>

{#if !mounted}
	{#if child}
		{@render child({ props: armHandlers })}
	{:else}
		<div class={cn('select-none', triggerClass)} {...armHandlers}>
			{@render children?.()}
		</div>
	{/if}
{:else}
	<ContextMenu.Root bind:open={menuOpen}>
		{#if child}
			<ContextMenu.Trigger {child} />
		{:else}
			<ContextMenu.Trigger class={triggerClass}>
				{@render children?.()}
			</ContextMenu.Trigger>
		{/if}
		<ContextMenu.Content class="w-56">
			{#if selecting && batch}
				<div class="px-2 py-1">
					<span class="text-xs font-medium text-muted-foreground">{batch.count} selected</span>
				</div>
				<ContextMenu.Separator />

				<ContextMenu.Item disabled>
					<Icon name="tracked" size={15} />
					Start tracking
				</ContextMenu.Item>

				<ContextMenu.Sub>
					<ContextMenu.SubTrigger>
						<Icon name="watching" size={15} />
						Set status
					</ContextMenu.SubTrigger>
					<ContextMenu.SubContent class="w-44">
						{#each ANILIST_USER_STATUSES as s (s)}
							<ContextMenu.Item onSelect={() => batch.setStatus(s)}>
								{ANILIST_STATUS_LABELS[s]}
							</ContextMenu.Item>
						{/each}
					</ContextMenu.SubContent>
				</ContextMenu.Sub>

				<ContextMenu.Item disabled={batch.hasOffListSelected} onSelect={() => batch.openScore()}>
					<Icon name="star" size={15} />
					Set score
				</ContextMenu.Item>
				{#if batch.hasOffListSelected}
					<p class="px-2 py-1 text-xs text-muted-foreground">
						Some selected items aren't on your list.
					</p>
				{/if}

				<ContextMenu.Separator />
				<ContextMenu.Item
					class="text-destructive"
					disabled={batch.deletableCount === 0}
					onSelect={() => batch.openDelete()}
				>
					<Icon name="trash" size={15} />
					Delete from list
				</ContextMenu.Item>

				{#if batch.archive || batch.unarchive || batch.deleteTracked}
					<ContextMenu.Separator />
					{#if batch.archived && batch.unarchive}
						<ContextMenu.Item onSelect={() => batch.unarchive?.()}>
							<Icon name="archive-restore" size={15} />
							Unarchive
						</ContextMenu.Item>
					{:else if batch.archive}
						<ContextMenu.Item onSelect={() => batch.archive?.()}>
							<Icon name="archive" size={15} />
							Archive
						</ContextMenu.Item>
					{/if}
					{#if batch.deleteTracked}
						<ContextMenu.Item class="text-destructive" onSelect={() => batch.deleteTracked?.()}>
							<Icon name="trash" size={15} />
							Delete tracked anime
						</ContextMenu.Item>
					{/if}
				{/if}
			{:else}
				<div class="flex items-center justify-between gap-2 px-2 py-1">
					<span class="truncate text-xs font-medium text-muted-foreground">{title}</span>
					<button
						type="button"
						onclick={() => (menuOpen = false)}
						class="-mr-1 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
						aria-label="Close"
					>
						<Icon name="close" size={14} />
					</button>
				</div>
				<ContextMenu.Separator />

				{#if onSelect}
					<ContextMenu.Item onSelect={() => onSelect()}>
						<Icon name="select" size={15} />
						Select
					</ContextMenu.Item>
					<ContextMenu.Separator />
				{/if}

				{#if onList}
					<ContextMenu.Item onSelect={onEdit}>
						<Icon name="edit" size={15} />
						Edit list entry
					</ContextMenu.Item>
					<ContextMenu.Sub>
						<ContextMenu.SubTrigger>
							<Icon name="watching" size={15} />
							Set status
						</ContextMenu.SubTrigger>
						<ContextMenu.SubContent class="w-44">
							{#each ANILIST_USER_STATUSES as s (s)}
								<ContextMenu.Item onSelect={() => setStatus(ctx, s)}>
									<Icon name={ANILIST_STATUS_ICON[s]} size={15} />
									<span class="flex-1">{ANILIST_STATUS_LABELS[s]}</span>
									{#if ctx.entry?.status === s}<Icon name="check" size={14} />{/if}
								</ContextMenu.Item>
							{/each}
						</ContextMenu.SubContent>
					</ContextMenu.Sub>
				{:else}
					<ContextMenu.Sub>
						<ContextMenu.SubTrigger>
							<Icon name="plus" size={15} />
							Add to list
						</ContextMenu.SubTrigger>
						<ContextMenu.SubContent class="w-44">
							{#each ANILIST_USER_STATUSES as s (s)}
								<ContextMenu.Item onSelect={() => addEntry(ctx, s as AnilistAnimeUserStatus)}>
									<Icon name={ANILIST_STATUS_ICON[s]} size={15} />
									{ANILIST_STATUS_LABELS[s]}
								</ContextMenu.Item>
							{/each}
							<ContextMenu.Separator />
							<ContextMenu.Item onSelect={onEdit}>
								<Icon name="edit" size={15} />
								Add details…
							</ContextMenu.Item>
						</ContextMenu.SubContent>
					</ContextMenu.Sub>
				{/if}
				{#if onList && !trackedMgmt}
					<ContextMenu.Item class="text-destructive" onSelect={() => (confirmRemove = true)}>
						<Icon name="trash" size={15} />
						Remove from list
					</ContextMenu.Item>
				{/if}

				<ContextMenu.Separator />
				<ContextMenu.Sub>
					<ContextMenu.SubTrigger>
						<Icon name="copy" size={15} />
						Copy
					</ContextMenu.SubTrigger>
					<ContextMenu.SubContent class="w-48">
						{#if titles.english}
							<ContextMenu.Item onSelect={() => copy(titles.english!, 'English title')}>
								<Icon name="type" size={15} />
								English title
							</ContextMenu.Item>
						{/if}
						{#if titles.romaji}
							<ContextMenu.Item onSelect={() => copy(titles.romaji!, 'Romaji title')}>
								<Icon name="type" size={15} />
								Romaji title
							</ContextMenu.Item>
						{/if}
						{#if titles.native}
							<ContextMenu.Item onSelect={() => copy(titles.native!, 'Native title')}>
								<Icon name="type" size={15} />
								Native title
							</ContextMenu.Item>
						{/if}
						<ContextMenu.Separator />
						<ContextMenu.Item onSelect={() => copy(anilistAnimeUrl(ctx.anilistId), 'AniList link')}>
							<Icon name="link" size={15} />
							AniList link
						</ContextMenu.Item>
						{#if idMal != null}
							<ContextMenu.Item onSelect={() => copy(malAnimeUrl(idMal), 'MAL link')}>
								<Icon name="link" size={15} />
								MAL link
							</ContextMenu.Item>
						{/if}
						{#if tvdbId != null}
							<ContextMenu.Item onSelect={() => copy(tvdbSeriesUrl(tvdbId), 'TVDB link')}>
								<Icon name="link" size={15} />
								TVDB link
							</ContextMenu.Item>
						{/if}
					</ContextMenu.SubContent>
				</ContextMenu.Sub>
				<ContextMenu.Sub>
					<ContextMenu.SubTrigger>
						<Icon name="external-link" size={15} />
						Open in
					</ContextMenu.SubTrigger>
					<ContextMenu.SubContent class="w-44">
						<ContextMenu.Item onSelect={() => open(anilistAnimeUrl(ctx.anilistId))}>
							<Icon name="anilist" size={15} />
							AniList
						</ContextMenu.Item>
						{#if idMal != null}
							<ContextMenu.Item onSelect={() => open(malAnimeUrl(idMal))}>
								<Icon name="mal" size={15} />
								MAL
							</ContextMenu.Item>
						{/if}
						{#if tvdbId != null}
							<ContextMenu.Item onSelect={() => open(tvdbSeriesUrl(tvdbId))}>
								<Icon name="tvdb" size={15} />
								TVDB
							</ContextMenu.Item>
						{/if}
					</ContextMenu.SubContent>
				</ContextMenu.Sub>

				{#if tracking && (tracking.searchTorrentsHref || tracking.animeHref)}
					<ContextMenu.Separator />
					{#if tracking.searchTorrentsHref}
						<ContextMenu.Item onSelect={() => goto(tracking.searchTorrentsHref!)}>
							<Icon name="rss" size={15} />
							Search for torrents
						</ContextMenu.Item>
					{/if}
					{#if tracking.animeHref}
						<ContextMenu.Item onSelect={() => goto(tracking.animeHref!)}>
							<Icon name="browse" size={15} />
							Go to anime
						</ContextMenu.Item>
					{/if}
				{/if}

				{#if tracking}
					<ContextMenu.Separator />
					{#if tracking.trackedAnimeId == null}
						<ContextMenu.Item onSelect={tracking.onTrack}>
							<Icon name="tracked" size={15} />
							Track anime
						</ContextMenu.Item>
					{:else}
						<ContextMenu.Item onSelect={tracking.onEditTracking}>
							<Icon name="tracked" size={15} />
							Edit tracking
						</ContextMenu.Item>
						{#if tracking.gotoHref}
							<ContextMenu.Item onSelect={() => goto(tracking.gotoHref!)}>
								<Icon name="arrow-right" size={15} />
								Go to tracked page
							</ContextMenu.Item>
						{/if}
					{/if}
					{#if trackedMgmt}
						<ContextMenu.Separator />
						{#if tracking.archived && tracking.onUnarchive}
							<ContextMenu.Item onSelect={tracking.onUnarchive}>
								<Icon name="archive-restore" size={15} />
								Unarchive
							</ContextMenu.Item>
						{:else if tracking.onArchive}
							<ContextMenu.Item onSelect={tracking.onArchive}>
								<Icon name="archive" size={15} />
								Archive
							</ContextMenu.Item>
						{/if}
						{#if tracking.onDelete}
							<ContextMenu.Item class="text-destructive" onSelect={tracking.onDelete}>
								<Icon name="trash" size={15} />
								Delete
							</ContextMenu.Item>
						{/if}
					{/if}
				{/if}

				{#if onList && trackedMgmt}
					<ContextMenu.Separator />
					<ContextMenu.Item class="text-destructive" onSelect={() => (confirmRemove = true)}>
						<Icon name="trash" size={15} />
						Remove from list
					</ContextMenu.Item>
				{/if}
			{/if}
		</ContextMenu.Content>
	</ContextMenu.Root>

	<ConfirmDialog
		bind:open={confirmRemove}
		title="Remove from list?"
		description={`"${title}" will be removed from your AniList list.`}
		confirmLabel="Remove"
		destructive
		onConfirm={async () => {
			await removeEntry(ctx.anilistId);
		}}
	/>
{/if}
