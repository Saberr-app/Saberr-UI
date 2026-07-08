<script lang="ts">
	import type { AnilistAnimeUserStatus } from '$lib/api/types';
	import { ANILIST_USER_STATUSES } from '$lib/api/types';
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
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
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
		triggerClass,
		bare = false
	}: {
		ctx: MutationContext;
		idMal: number | null;
		/** TVDB series id when known — enables the TVDB copy-link + Open-in items. */
		tvdbId?: number | null;
		title: string;
		/** Raw titles for the Copy submenu. */
		titles: { english: string | null; romaji: string | null; native: string | null };
		onEdit: () => void;
		/** Enter selection mode + select this item. Omit to hide the Select item. */
		onSelect?: () => void;
		/** Tracking actions (Track / Edit tracking / Archive / Delete). Omit to hide. */
		tracking?: TrackingMenuCtl;
		triggerClass?: string;
		/** Render the trigger but no actions (the detail view has its own controls). */
		bare?: boolean;
	} = $props();

	const onList = $derived(ctx.entry != null);
	// "Remove from list" clusters with the tracked-management actions (archive/delete) at the bottom
	// when that group exists (tracked page); elsewhere it sits inside the list-actions group.
	const trackedMgmt = $derived(
		!!(tracking && (tracking.onArchive || tracking.onUnarchive || tracking.onDelete))
	);

	let confirmRemove = $state(false);
	let menuOpen = $state(false);
	// Lazy-mount: keep just a plain trigger button until the user actually opens the
	// menu, so a long list doesn't instantiate a bits-ui dropdown (+ dialog) per row.
	let mounted = $state(false);
	const triggerClasses = $derived(
		cn(
			'inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
			triggerClass
		)
	);
	const open = (url: string) => window.open(url, '_blank', 'noopener');
	async function copy(text: string, label: string) {
		const ok = await copyText(text);
		if (ok) notifySuccess(`Copied ${label}`);
		else notifyError("Couldn't copy to clipboard");
	}
</script>

{#if !mounted}
	<button
		type="button"
		class={triggerClasses}
		aria-label="Actions"
		onclick={(e: MouseEvent) => {
			e.stopPropagation();
			mounted = true;
			menuOpen = true;
		}}
	>
		<Icon name="more-horizontal" size={16} />
	</button>
{:else}
	<DropdownMenu.Root bind:open={menuOpen}>
		<DropdownMenu.Trigger
			class={triggerClasses}
			aria-label="Actions"
			onclick={(e: MouseEvent) => e.stopPropagation()}
		>
			<Icon name="more-horizontal" size={16} />
		</DropdownMenu.Trigger>
		<DropdownMenu.Content class="w-52" align="end">
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

			{#if bare}
				<div class="px-2 py-2 text-xs text-muted-foreground">No quick actions.</div>
			{:else}
				<DropdownMenu.Separator />

				{#if onSelect}
					<DropdownMenu.Item onSelect={() => onSelect()}>
						<Icon name="select" size={15} />
						Select
					</DropdownMenu.Item>
					<DropdownMenu.Separator />
				{/if}

				{#if onList}
					<DropdownMenu.Item onSelect={onEdit}>
						<Icon name="edit" size={15} />
						Edit list entry
					</DropdownMenu.Item>
					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger>
							<Icon name="watching" size={15} />
							Set status
						</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent class="w-44">
							{#each ANILIST_USER_STATUSES as s (s)}
								<DropdownMenu.Item onSelect={() => setStatus(ctx, s)}>
									<Icon name={ANILIST_STATUS_ICON[s]} size={15} />
									<span class="flex-1">{ANILIST_STATUS_LABELS[s]}</span>
									{#if ctx.entry?.status === s}<Icon name="check" size={14} />{/if}
								</DropdownMenu.Item>
							{/each}
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
				{:else}
					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger>
							<Icon name="plus" size={15} />
							Add to list
						</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent class="w-44">
							{#each ANILIST_USER_STATUSES as s (s)}
								<DropdownMenu.Item onSelect={() => addEntry(ctx, s as AnilistAnimeUserStatus)}>
									<Icon name={ANILIST_STATUS_ICON[s]} size={15} />
									{ANILIST_STATUS_LABELS[s]}
								</DropdownMenu.Item>
							{/each}
							<DropdownMenu.Separator />
							<DropdownMenu.Item onSelect={onEdit}>
								<Icon name="edit" size={15} />
								Add details…
							</DropdownMenu.Item>
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
				{/if}
				{#if onList && !trackedMgmt}
					<DropdownMenu.Item class="text-destructive" onSelect={() => (confirmRemove = true)}>
						<Icon name="trash" size={15} />
						Remove from list
					</DropdownMenu.Item>
				{/if}

				<DropdownMenu.Separator />
				<DropdownMenu.Sub>
					<DropdownMenu.SubTrigger>
						<Icon name="copy" size={15} />
						Copy
					</DropdownMenu.SubTrigger>
					<DropdownMenu.SubContent class="w-48">
						{#if titles.english}
							<DropdownMenu.Item onSelect={() => copy(titles.english!, 'English title')}>
								<Icon name="type" size={15} />
								English title
							</DropdownMenu.Item>
						{/if}
						{#if titles.romaji}
							<DropdownMenu.Item onSelect={() => copy(titles.romaji!, 'Romaji title')}>
								<Icon name="type" size={15} />
								Romaji title
							</DropdownMenu.Item>
						{/if}
						{#if titles.native}
							<DropdownMenu.Item onSelect={() => copy(titles.native!, 'Native title')}>
								<Icon name="type" size={15} />
								Native title
							</DropdownMenu.Item>
						{/if}
						<DropdownMenu.Separator />
						<DropdownMenu.Item
							onSelect={() => copy(anilistAnimeUrl(ctx.anilistId), 'AniList link')}
						>
							<Icon name="link" size={15} />
							AniList link
						</DropdownMenu.Item>
						{#if idMal != null}
							<DropdownMenu.Item onSelect={() => copy(malAnimeUrl(idMal), 'MAL link')}>
								<Icon name="link" size={15} />
								MAL link
							</DropdownMenu.Item>
						{/if}
						{#if tvdbId != null}
							<DropdownMenu.Item onSelect={() => copy(tvdbSeriesUrl(tvdbId), 'TVDB link')}>
								<Icon name="link" size={15} />
								TVDB link
							</DropdownMenu.Item>
						{/if}
					</DropdownMenu.SubContent>
				</DropdownMenu.Sub>
				<DropdownMenu.Sub>
					<DropdownMenu.SubTrigger>
						<Icon name="external-link" size={15} />
						Open in
					</DropdownMenu.SubTrigger>
					<DropdownMenu.SubContent class="w-44">
						<DropdownMenu.Item onSelect={() => open(anilistAnimeUrl(ctx.anilistId))}>
							<Icon name="anilist" size={15} />
							AniList
						</DropdownMenu.Item>
						{#if idMal != null}
							<DropdownMenu.Item onSelect={() => open(malAnimeUrl(idMal))}>
								<Icon name="mal" size={15} />
								MAL
							</DropdownMenu.Item>
						{/if}
						{#if tvdbId != null}
							<DropdownMenu.Item onSelect={() => open(tvdbSeriesUrl(tvdbId))}>
								<Icon name="tvdb" size={15} />
								TVDB
							</DropdownMenu.Item>
						{/if}
					</DropdownMenu.SubContent>
				</DropdownMenu.Sub>

				{#if tracking && (tracking.searchTorrentsHref || tracking.animeHref)}
					<DropdownMenu.Separator />
					{#if tracking.searchTorrentsHref}
						<DropdownMenu.Item onSelect={() => goto(tracking.searchTorrentsHref!)}>
							<Icon name="rss" size={15} />
							Search for torrents
						</DropdownMenu.Item>
					{/if}
					{#if tracking.animeHref}
						<DropdownMenu.Item onSelect={() => goto(tracking.animeHref!)}>
							<Icon name="browse" size={15} />
							Go to anime
						</DropdownMenu.Item>
					{/if}
				{/if}

				{#if tracking}
					<DropdownMenu.Separator />
					{#if tracking.trackedAnimeId == null}
						<DropdownMenu.Item onSelect={tracking.onTrack}>
							<Icon name="tracked" size={15} />
							Track anime
						</DropdownMenu.Item>
					{:else}
						<DropdownMenu.Item onSelect={tracking.onEditTracking}>
							<Icon name="tracked" size={15} />
							Edit tracking
						</DropdownMenu.Item>
						{#if tracking.gotoHref}
							<DropdownMenu.Item onSelect={() => goto(tracking.gotoHref!)}>
								<Icon name="arrow-right" size={15} />
								Go to tracked page
							</DropdownMenu.Item>
						{/if}
					{/if}
					{#if trackedMgmt}
						<DropdownMenu.Separator />
						{#if tracking.archived && tracking.onUnarchive}
							<DropdownMenu.Item onSelect={tracking.onUnarchive}>
								<Icon name="archive-restore" size={15} />
								Unarchive
							</DropdownMenu.Item>
						{:else if tracking.onArchive}
							<DropdownMenu.Item onSelect={tracking.onArchive}>
								<Icon name="archive" size={15} />
								Archive
							</DropdownMenu.Item>
						{/if}
						{#if tracking.onDelete}
							<DropdownMenu.Item class="text-destructive" onSelect={tracking.onDelete}>
								<Icon name="trash" size={15} />
								Delete
							</DropdownMenu.Item>
						{/if}
					{/if}
				{/if}

				{#if onList && trackedMgmt}
					<DropdownMenu.Separator />
					<DropdownMenu.Item class="text-destructive" onSelect={() => (confirmRemove = true)}>
						<Icon name="trash" size={15} />
						Remove from list
					</DropdownMenu.Item>
				{/if}
			{/if}
		</DropdownMenu.Content>
	</DropdownMenu.Root>

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
