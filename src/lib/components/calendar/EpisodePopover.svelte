<script lang="ts">
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import type { CalendarEpisode } from '$lib/calendar/enrich';
	import { FORMAT_LABELS } from '$lib/anilist/enums';
	import { timeLabel } from '$lib/calendar/datetime';
	import { airingRing } from '$lib/calendar/style';
	import { calendarShowAiringStatus } from '$lib/stores/calendar-prefs.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import CoverTile from './CoverTile.svelte';

	let {
		episode,
		onDownloadStatus,
		onEditEntry,
		onTrack,
		overlap = true,
		trigger
	}: {
		episode: CalendarEpisode;
		onDownloadStatus: (ep: CalendarEpisode) => void;
		onEditEntry: (ep: CalendarEpisode) => void;
		onTrack: (ep: CalendarEpisode) => void;
		/** Pin the menu over the item (top-left↔top-left). Off → drop it just below. */
		overlap?: boolean;
		/** The clickable element; receives the trigger props to spread. */
		trigger: Snippet<[Record<string, unknown>]>;
	} = $props();

	let open = $state(false);
	let anchorEl = $state<HTMLElement>();
	let menuEl = $state<HTMLElement>();
	let pos = $state({ top: 0, left: 0 });

	const isTracked = $derived(episode.anime.tracked_anime_id != null);
	const onList = $derived(episode.anime.user_list_status != null);
	const ring = $derived(airingRing(episode.anime.status, calendarShowAiringStatus.current));
	const formatLabel = $derived(episode.formatTag ? FORMAT_LABELS[episode.formatTag] : null);

	// Position the menu: overlapping the item (top-left↔top-left) or just below it.
	// Either way it's clamped to stay on screen.
	function place() {
		if (!anchorEl) return;
		const r = anchorEl.getBoundingClientRect();
		const MENU_W = 224;
		const MENU_H = 250;
		const PAD = 8;
		const desiredTop = overlap ? r.top : r.bottom + 4;
		pos = {
			left: Math.max(PAD, Math.min(r.left, window.innerWidth - MENU_W - PAD)),
			top: Math.max(PAD, Math.min(desiredTop, window.innerHeight - MENU_H - PAD))
		};
	}

	function toggle() {
		if (open) {
			open = false;
		} else {
			place();
			open = true;
		}
	}
	function openFromContext(e: MouseEvent) {
		e.preventDefault();
		place();
		open = true;
	}
	function close() {
		open = false;
	}

	function onWindowPointerDown(e: PointerEvent) {
		if (!open) return;
		const t = e.target as Node;
		// Clicking the item itself is handled by its own toggle; ignore inside-menu clicks.
		if (menuEl?.contains(t) || anchorEl?.contains(t)) return;
		open = false;
	}
	function onWindowKeydown(e: KeyboardEvent) {
		if (open && e.key === 'Escape') open = false;
	}

	function goToAnime() {
		close();
		void goto(`/browse?anilist_id=${episode.anilistId}`);
	}
	function downloadStatus() {
		close();
		onDownloadStatus(episode);
	}
	function editEntry() {
		close();
		onEditEntry(episode);
	}
	function track() {
		close();
		onTrack(episode);
	}
	function searchTorrents() {
		close();
		const title = episode.anime.romaji_title || episode.anime.english_title || episode.animeTitle;
		void goto(`/rss?q=${encodeURIComponent(`${title} ${episode.episode}`)}`);
	}
</script>

<svelte:window
	onpointerdown={onWindowPointerDown}
	onkeydown={onWindowKeydown}
	onresize={close}
	onscroll={close}
/>

<div class="relative min-w-0" bind:this={anchorEl}>
	{@render trigger({ onclick: toggle, oncontextmenu: openFromContext })}
</div>

{#snippet header()}
	<CoverTile image={episode.coverUrl} {ring} class="h-12 w-9" />
	<div class="min-w-0">
		<div class="line-clamp-2 text-xs font-semibold text-foreground">{episode.animeTitle}</div>
		<div class="mt-0.5 text-[0.7rem] text-muted-foreground">
			{#if formatLabel}{formatLabel}{:else}Episode {episode.episode}{/if} · {timeLabel(
				episode.airingAt
			)}
		</div>
	</div>
{/snippet}

{#if open}
	<div
		bind:this={menuEl}
		class="fixed z-50 w-56 rounded-lg bg-popover p-1.5 text-popover-foreground shadow-md ring-1 ring-foreground/10"
		style="top:{pos.top}px;left:{pos.left}px"
	>
		<!--
			When the menu overlaps the item (default), the header doubles as a close target since it
			covers the thing you'd click to dismiss. In month view (overlap=false) it drops below the
			item instead, so the header stays a plain, non-clickable label.
		-->
		{#if overlap}
			<button
				type="button"
				onclick={close}
				class="flex w-full gap-2.5 rounded-md px-1 py-1 text-left transition-colors hover:bg-muted"
			>
				{@render header()}
			</button>
		{:else}
			<div class="flex w-full gap-2.5 px-1 py-1">
				{@render header()}
			</div>
		{/if}
		<div class="my-1 h-px bg-border"></div>
		<button
			type="button"
			onclick={goToAnime}
			class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
		>
			<Icon name="browse" size={15} class="text-muted-foreground" />
			Go to anime
		</button>
		<button
			type="button"
			onclick={editEntry}
			class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
		>
			<Icon name={onList ? 'edit' : 'plus'} size={15} class="text-success" />
			{onList ? 'Edit list entry' : 'Add to list'}
		</button>
		<button
			type="button"
			onclick={track}
			class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
		>
			<Icon name="tracked" size={15} class="text-muted-foreground" />
			{isTracked ? 'Edit tracking' : 'Track anime'}
		</button>
		{#if isTracked}
			<button
				type="button"
				onclick={downloadStatus}
				class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
			>
				<Icon name="circle-download" size={15} class="text-info" />
				Download status
			</button>
			<button
				type="button"
				onclick={searchTorrents}
				class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
			>
				<Icon name="rss" size={15} class="text-muted-foreground" />
				Search for torrents
			</button>
		{/if}
	</div>
{/if}
