<script lang="ts">
	/* RSS torrent table — one semantic <table>, two sections (recognized, then a "Needs
	   identification" divider + unrecognized). Dense one-line rows; first three columns
	   (checkbox · index/arrow · title) sticky-pinned, the rest scroll horizontally. Reads the rss store. */
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { TorrentListItem } from '$lib/api/types';
	import { rss } from '$lib/stores/rss.svelte';
	import { scrollFade, dragScroll } from '$lib/utils/scroll-fade';
	import { isRecognized, isSelectable, isInTrackedRange, hasErrorNote } from '$lib/rss/recognition';
	import {
		resolveTitle,
		resolveEpisode,
		resolveReleaseGroup,
		resolveSpecs,
		formatBytes
	} from '$lib/rss/resolve';
	import { arrangeFlat, arrangeGroups, type SortKey } from '$lib/rss/sort';
	import { statusTone, TONE_EDGE } from '$lib/tracked/status';
	import { downloadUpdates } from '$lib/stores/download-updates.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import RelativeTime from '$lib/components/RelativeTime.svelte';
	import RssRowMenu from './RssRowMenu.svelte';
	import TorrentDetail from './TorrentDetail.svelte';
	import { cn } from '$lib/utils';

	let { focusHash = null }: { focusHash?: string | null } = $props();

	let expanded = $state<string | null>(null);
	let highlightHash = $state<string | null>(null);
	let collapsedGroups = new SvelteSet<string>();

	const sort = $derived(rss.sortPref.current);
	const grouped = $derived(rss.groupPref.current === 'episode');
	// Top tier = rows the backend flagged `selected` (chosen-for-download).
	const isSelectedRow = (item: TorrentListItem) => item.selected;
	const recognized = $derived(rss.torrents.filter(isRecognized));
	const unrecognized = $derived(rss.torrents.filter((t) => !isRecognized(t)));
	const recognizedGroups = $derived(grouped ? arrangeGroups(recognized, sort, isSelectedRow) : []);
	const recognizedFlat = $derived(grouped ? [] : arrangeFlat(recognized, sort, isSelectedRow));
	const unrecognizedFlat = $derived(arrangeFlat(unrecognized, sort, isSelectedRow));

	// Display order (for the running index + shift-range universe).
	const orderedItems = $derived.by(() => {
		const out: TorrentListItem[] = [];
		if (grouped) for (const g of recognizedGroups) out.push(...g.items);
		else out.push(...recognizedFlat);
		out.push(...unrecognizedFlat);
		return out;
	});
	const indexByHash = $derived(
		new Map(orderedItems.map((t, i) => [t.rss_torrent.magnet_hash, i + 1]))
	);
	const orderedSelectable = $derived(
		orderedItems.filter(isSelectable).map((t) => t.rss_torrent.magnet_hash)
	);
	// The selection column exists only when something in view is selectable (else index is leftmost).
	const hasSelCol = $derived(orderedSelectable.length > 0);
	const COLS = $derived(hasSelCol ? 11 : 10);

	function setSort(key: SortKey) {
		const cur = rss.sortPref.current;
		rss.sortPref.current =
			cur.key === key
				? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' }
				: { key, dir: key === 'title' ? 'asc' : 'desc' };
	}

	function toggleExpand(hash: string) {
		expanded = expanded === hash ? null : hash;
	}

	function toggleGroup(key: string) {
		if (collapsedGroups.has(key)) collapsedGroups.delete(key);
		else collapsedGroups.add(key);
	}

	function onCheck(item: TorrentListItem, e: MouseEvent) {
		const hash = item.rss_torrent.magnet_hash;
		if (e.shiftKey) rss.toggleRange(hash, orderedSelectable);
		else rss.toggle(hash);
	}

	// Cropped-end fades on both edges + a sticky proxy scrollbar at the viewport bottom so
	// horizontal scroll is always reachable.
	let scroller = $state<HTMLElement | null>(null);
	let proxy = $state<HTMLElement | null>(null);
	let canScroll = $state(false);
	let atStart = $state(true);
	let atEnd = $state(true);
	let tableWidth = $state(0);
	let viewportWidth = $state(0);
	function updateScroll() {
		const el = scroller;
		if (!el) return;
		tableWidth = el.scrollWidth;
		viewportWidth = el.clientWidth;
		const max = el.scrollWidth - el.clientWidth;
		canScroll = max > 1;
		atStart = el.scrollLeft <= 1;
		atEnd = el.scrollLeft >= max - 1;
	}
	function onScrollerScroll() {
		updateScroll();
		if (proxy && scroller && proxy.scrollLeft !== scroller.scrollLeft) {
			proxy.scrollLeft = scroller.scrollLeft;
		}
	}
	function onProxyScroll() {
		if (scroller && proxy && scroller.scrollLeft !== proxy.scrollLeft) {
			scroller.scrollLeft = proxy.scrollLeft;
		}
		updateScroll();
	}
	onMount(() => {
		updateScroll();
		const onResize = () => updateScroll();
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});
	$effect(() => {
		void orderedItems.length;
		void rss.groupPref.current;
		updateScroll();
	});

	// Deep-link (?magnet_hash): expand, scroll to, and briefly highlight that row.
	let focusedFor = '';
	$effect(() => {
		const h = focusHash;
		if (!h || focusedFor === h || !indexByHash.has(h)) return;
		focusedFor = h;
		expanded = h;
		highlightHash = h;
		requestAnimationFrame(() =>
			document
				.querySelector(`[data-row-hash="${h}"]`)
				?.scrollIntoView({ block: 'center', behavior: 'smooth' })
		);
		setTimeout(() => {
			if (highlightHash === h) highlightHash = null;
		}, 2500);
	});
</script>

{#snippet sortHead(key: SortKey, label: string, klass = '')}
	<th
		class={cn('th sortable', klass)}
		aria-sort={sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
		onclick={() => setSort(key)}
	>
		<span class="inline-flex items-center gap-1">
			{label}
			{#if sort.key === key}
				<Icon name={sort.dir === 'asc' ? 'sort-asc' : 'sort-desc'} size={12} />
			{/if}
		</span>
	</th>
{/snippet}

{#snippet row(item: TorrentListItem)}
	{@const r = item.rss_torrent}
	{@const hash = r.magnet_hash}
	{@const selectable = isSelectable(item)}
	{@const selected = rss.isSelected(hash)}
	{@const isOpen = expanded === hash}
	{@const title = resolveTitle(item)}
	{@const episode = resolveEpisode(item)}
	{@const group = resolveReleaseGroup(item)}
	{@const specs = resolveSpecs(item)}
	<!-- Out-of-range (incl. untracked) rows dim; tracked-in-range read at full strength. -->
	{@const untracked = !isInTrackedRange(item)}
	{@const liveStatus =
		item.download && !downloadUpdates.isDeleted(item.download.id)
			? (downloadUpdates.get(item.download.id)?.status ?? item.download.status)
			: null}
	{@const edge = liveStatus
		? TONE_EDGE[statusTone(liveStatus)]
		: item.discarded
			? TONE_EDGE.neutral
			: null}
	<RssRowMenu {item}>
		{#snippet child({ props })}
			<tr
				{...props}
				data-row-hash={hash}
				class={cn(
					'trow',
					item.selected && 'row-selected',
					isOpen && 'is-open',
					highlightHash === hash && 'row-highlight'
				)}
			>
				{#if hasSelCol}
					<!-- selection -->
					<td class="td col-sel">
						{#if selectable}
							<button
								type="button"
								role="checkbox"
								aria-checked={selected}
								aria-label="Select torrent"
								class="inline-grid place-items-center"
								onclick={(e) => {
									e.stopPropagation();
									onCheck(item, e);
								}}
							>
								<span
									class={cn(
										'grid size-3.5 place-items-center rounded-[3px] border transition-colors',
										selected
											? 'border-transparent bg-brand-light text-white'
											: 'border-foreground/40'
									)}
								>
									{#if selected}<Icon name="check" size={10} />{/if}
								</span>
							</button>
						{/if}
					</td>
				{/if}

				<!-- index + status edge + expand arrow -->
				<td class="td idxtd">
					<span class={cn('edge', edge)}></span>
					<button
						type="button"
						class={cn(
							'flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground',
							hasErrorNote(item) && 'text-warning hover:text-warning'
						)}
						aria-expanded={isOpen}
						onclick={() => toggleExpand(hash)}
					>
						<Icon
							name="chevron-right"
							size={13}
							class={cn('transition-transform', isOpen && 'rotate-90')}
						/>
						<span class="tabular-nums">{indexByHash.get(hash)}</span>
					</button>
				</td>

				<!-- title -->
				<td class="td">
					<span
						class={cn(
							'block max-w-[15rem] truncate font-medium',
							title.fuzzy ? 'text-fuzzy' : untracked && 'text-muted-foreground'
						)}
						title={title.value}>{title.value}</span
					>
				</td>

				<!-- episode -->
				<td class="td">
					{#if episode}
						<span class={cn(episode.fuzzy ? 'text-fuzzy' : untracked && 'text-muted-foreground')}
							>{episode.value}</span
						>
					{:else}
						<span class="text-muted-foreground/50">—</span>
					{/if}
				</td>

				<!-- group -->
				<td class="td">
					{#if group}
						<span
							class={cn(
								'block max-w-[9rem] truncate',
								group.fuzzy ? 'text-fuzzy' : untracked && 'text-muted-foreground'
							)}>{group.value}</span
						>
					{:else}
						<span class="text-muted-foreground/50">—</span>
					{/if}
				</td>

				<!-- specs (sized to content, never clipped) -->
				<td class="td">
					<div class="flex items-center gap-1">
						{#each specs as chip (chip.label)}
							<span
								class={cn(
									'shrink-0 rounded px-1.5 py-0.5 text-[0.7rem]',
									chip.fuzzy
										? 'bg-fuzzy/15 text-fuzzy ring-1 ring-fuzzy/30'
										: 'bg-muted text-muted-foreground'
								)}>{chip.label}</span
							>
						{/each}
					</div>
				</td>

				<!-- size -->
				<td class="td whitespace-nowrap text-muted-foreground tabular-nums"
					>{formatBytes(r.size)}</td
				>

				<!-- torrent title (mono; no scrollbar, click-drag to scroll) -->
				<td class="td">
					<div class="cellscroll w-72" use:scrollFade use:dragScroll>
						<span class="font-mono text-[0.7rem] text-muted-foreground select-none" title={r.title}
							>{r.title}</span
						>
					</div>
				</td>

				<!-- seed/leech -->
				<td class="td whitespace-nowrap tabular-nums">
					<span class="text-success">{r.seeders}</span><span class="text-muted-foreground/50"
						>/{r.leechers}</span
					>
				</td>

				<!-- downloads -->
				<td class="td whitespace-nowrap text-muted-foreground tabular-nums">{r.downloads}</td>

				<!-- created -->
				<td class="td whitespace-nowrap text-muted-foreground">
					<RelativeTime iso={r.created_at} scope="rss" defaultAbsolute />
				</td>
			</tr>
		{/snippet}
	</RssRowMenu>

	{#if isOpen}
		<tr class="detailrow">
			<td class="detailtd" colspan={COLS}>
				<!-- Pin the detail to the viewport width so it reads in place; the row
				     columns above can still scroll horizontally (phone-friendly). -->
				<div class="detailinner" style:width={viewportWidth ? `${viewportWidth}px` : null}>
					<TorrentDetail {item} />
				</div>
			</td>
		</tr>
	{/if}
{/snippet}

<div class="relative">
	<div class="scroller no-scrollbar" bind:this={scroller} onscroll={onScrollerScroll}>
		<table class="rss-table">
			<thead>
				<tr>
					{#if hasSelCol}<th class="th col-sel"></th>{/if}
					<th class="th">#</th>
					{@render sortHead('title', 'Title')}
					{@render sortHead('episode', 'Episode')}
					<th class="th">Group</th>
					<th class="th">Specs</th>
					{@render sortHead('size', 'Size')}
					<th class="th">Torrent title</th>
					{@render sortHead('seed', 'Seed/Leech')}
					{@render sortHead('downloads', 'Downloads')}
					{@render sortHead('created', 'Date')}
				</tr>
			</thead>
			<tbody>
				{#if grouped}
					{#each recognizedGroups as g (g.key)}
						{@const collapsed = collapsedGroups.has(g.key)}
						<tr class="grouprow">
							<td class="grouptd" colspan={COLS}>
								<button
									type="button"
									aria-expanded={!collapsed}
									onclick={() => toggleGroup(g.key)}
									style:padding-left={hasSelCol ? '46px' : null}
									class="sticky left-0 flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:text-foreground"
								>
									<Icon
										name="chevron-right"
										size={14}
										class={cn(
											'text-muted-foreground transition-transform',
											!collapsed && 'rotate-90'
										)}
									/>
									<span class="font-semibold">{g.label}</span>
									<span
										class={cn(
											'size-2 rounded-full',
											g.hasImported ? 'bg-success' : 'bg-muted-foreground/40'
										)}
									></span>
									<span class="text-xs text-muted-foreground">
										{g.items.length} release{g.items.length === 1 ? '' : 's'}{g.tracked
											? ''
											: ' · not tracked'}
									</span>
								</button>
							</td>
						</tr>
						{#if !collapsed}
							{#each g.items as item (item.rss_torrent.magnet_hash)}
								{@render row(item)}
							{/each}
						{/if}
					{/each}
				{:else}
					{#each recognizedFlat as item (item.rss_torrent.magnet_hash)}
						{@render row(item)}
					{/each}
				{/if}

				{#if unrecognizedFlat.length}
					<tr class="sectionrow">
						<td class="sectiontd" colspan={COLS}>
							<div class="sticky left-0 flex items-center gap-2 px-3 py-1.5">
								<Icon name="circle-help" size={13} />
								Needs identification / Not supported
								<span class="font-normal text-warning/70">({unrecognizedFlat.length})</span>
							</div>
						</td>
					</tr>
					{#each unrecognizedFlat as item (item.rss_torrent.magnet_hash)}
						{@render row(item)}
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
	{#if canScroll && !atStart}
		<div
			class="pointer-events-none absolute inset-y-0 left-0 w-12 rounded-l-xl bg-gradient-to-r from-card to-transparent"
		></div>
	{/if}
	{#if canScroll && !atEnd}
		<div
			class="pointer-events-none absolute inset-y-0 right-0 w-12 rounded-r-xl bg-gradient-to-l from-card to-transparent"
		></div>
	{/if}

	<!-- Sticky proxy scrollbar floating at the viewport bottom (always reachable). -->
	{#if canScroll}
		<div bind:this={proxy} onscroll={onProxyScroll} class="sticky bottom-0 z-20 overflow-x-auto">
			<div style="width: {tableWidth}px; height: 1px;"></div>
		</div>
	{/if}
</div>

<style>
	.scroller {
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--card);
	}
	.rss-table {
		width: 100%;
		min-width: 1100px;
		table-layout: auto; /* columns size to content; long ones are capped via max-w */
		border-collapse: separate;
		border-spacing: 0;
		font-size: 12.5px;
		line-height: 1.3;
		/* Stop mobile browsers inflating text (would unbalance fixed checkbox/edge vs cell text). */
		-webkit-text-size-adjust: 100%;
		text-size-adjust: 100%;
	}

	/* Header */
	.th {
		text-align: left;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		padding: 9px 12px;
		border-bottom: 1px solid var(--border);
		background: var(--card);
		white-space: nowrap;
		user-select: none;
	}
	.th.sortable {
		cursor: pointer;
	}
	.th.sortable:hover {
		color: var(--foreground);
	}

	/* Body cells — one line each. */
	.td {
		padding: 7px 12px;
		border-bottom: 1px solid var(--border);
		vertical-align: middle;
		white-space: nowrap;
		overflow: hidden;
	}
	.trow:hover .td {
		background: color-mix(in srgb, var(--foreground) 4%, var(--card));
	}
	/* Selected (chosen-for-download) rows — subtle success tint, matching the "Selected" badge. */
	.trow.row-selected .td {
		background: color-mix(in srgb, var(--affirmative) 9%, var(--card));
	}
	.trow.row-selected:hover .td {
		background: color-mix(in srgb, var(--affirmative) 14%, var(--card));
	}
	.trow.is-open .td {
		background: color-mix(in srgb, var(--foreground) 5%, var(--card));
	}
	.trow.row-highlight .td {
		background: color-mix(in srgb, var(--info) 14%, var(--card));
		transition: background 0.4s;
	}

	/* Checkbox column — `width: 1%` shrink-to-fit; padding survives compression (auto layout shrinks width, not padding). */
	.col-sel {
		width: 1%;
		white-space: nowrap;
		text-align: center;
		padding-left: 0.4rem;
		padding-right: 0.4rem;
	}

	/* Index cell carries the 3px download-status edge. */
	.idxtd {
		position: relative;
		padding-left: 4px;
	}
	.edge {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
	}

	/* In-cell horizontal scroll (specs / torrent title) — keeps rows one line. */
	.cellscroll {
		overflow-x: auto;
		overflow-y: hidden;
		white-space: nowrap;
		scrollbar-width: none;
		/* Crop the edge(s) that have more content off-screen (driven by use:scrollFade). */
		--fade-start: 0;
		--fade-end: 0;
		-webkit-mask-image: linear-gradient(
			to right,
			transparent 0,
			#000 calc(var(--fade-start) * 16px),
			#000 calc(100% - var(--fade-end) * 16px),
			transparent 100%
		);
		mask-image: linear-gradient(
			to right,
			transparent 0,
			#000 calc(var(--fade-start) * 16px),
			#000 calc(100% - var(--fade-end) * 16px),
			transparent 100%
		);
	}
	.cellscroll::-webkit-scrollbar {
		display: none;
	}

	/* Group + section + detail rows span the full width; their content sticks left. */
	.grouptd {
		background: var(--secondary);
		border-bottom: 1px solid var(--border);
		border-top: 1px solid var(--border);
	}
	.sectiontd {
		border-top: 2px solid var(--warning);
		border-bottom: 1px solid var(--border);
		background: color-mix(in srgb, var(--warning) 9%, var(--card));
		color: var(--warning);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.detailtd {
		padding: 0;
		background: color-mix(in srgb, var(--foreground) 3%, var(--card));
		border-bottom: 1px solid var(--border);
	}
	/* Detail content sticks left + caps at viewport width so it stays readable without h-scroll. */
	.detailinner {
		position: sticky;
		left: 0;
		max-width: 100%;
	}
</style>
