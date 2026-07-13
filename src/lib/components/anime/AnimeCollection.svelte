<script lang="ts">
	import { onMount, untrack, type Snippet } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { AnimeRow } from '$lib/anilist/row';
	import { rowMutationContext } from '$lib/anilist/row';
	import { displayTitle } from '$lib/anilist/titles';
	import { incrementProgress } from '$lib/anilist/entry-actions';
	import {
		emptyFilter,
		filterCount,
		filterRows,
		groupRows,
		presentOptions,
		searchRows,
		sortRows,
		GROUP_LABELS,
		SORT_LABELS,
		type FilterState,
		type GroupKey,
		type SortKey,
		type SortState
	} from '$lib/anilist/collection';
	import { VIEW_MODES, isTableView, type ViewMode } from '$lib/anilist/view';
	import {
		columnsFor,
		columnLabel,
		defaultColumnIds,
		isColumnLocked,
		type ColumnId,
		type ColumnSort,
		type CollectionContext
	} from '$lib/anilist/columns';
	import { persisted } from '$lib/utils/persisted.svelte';
	import { anilistMetadata } from '$lib/stores/anilist-metadata.svelte';
	import { clock } from '$lib/stores/clock.svelte';
	import {
		selection,
		MAX_SELECTION,
		type SelectionCtl,
		type BatchMenuCtl
	} from '$lib/stores/selection.svelte';
	import { notifyInfo } from '$lib/api/notify';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Popover from '$lib/components/ui/popover';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';
	import CardView from './views/CardView.svelte';
	import MegaCardView from './views/MegaCardView.svelte';
	import PosterView from './views/PosterView.svelte';
	import AnimeTable from './views/AnimeTable.svelte';
	import CollectionSkeleton from './CollectionSkeleton.svelte';
	import EditListEntryDialog from './EditListEntryDialog.svelte';
	import BatchScoreDialog from './BatchScoreDialog.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import FilterPanel from './filter/FilterPanel.svelte';
	import {
		ANILIST_USER_STATUSES,
		type AnilistAnimeUserStatus,
		type TrackedAnimeItem
	} from '$lib/api/types';
	import { ANILIST_STATUS_LABELS } from '$lib/anilist/entry';
	import { batchSetStatus, batchSetScore, batchDelete } from '$lib/anilist/batch-actions';
	import TrackDialog from '$lib/components/tracked/TrackDialog.svelte';
	import type { TrackingMenuCtl } from '$lib/tracked/menu';
	import { getTrackedAnime } from '$lib/api/tracked';
	import { summaryFromRow, type TrackAnimeSummary } from '$lib/tracked/draft';
	import {
		archiveTracked,
		batchArchiveTracked,
		batchDeleteTracked,
		deleteTracked,
		unarchiveTracked
	} from '$lib/tracked/tracking-actions';

	let {
		rows,
		context,
		loading = false,
		onOpen,
		onRefresh,
		refreshing = false,
		refreshLabel = 'Refresh',
		enableSearch = true,
		enableSort = true,
		enableFilter = true,
		enableGroup = true,
		enableSelection = false,
		selectionId,
		enableTracking = false,
		archivedView = false,
		showIndex = false,
		resolveTrackedItem,
		onTrackSaved,
		onArchived,
		onUnarchived,
		onDeleted,
		onBatchArchived,
		onBatchDeleted,
		defaultView = 'card',
		defaultSort = { key: 'title', dir: 'asc' },
		defaultGroup = 'none',
		excludeColumns = [],
		emptyLabel = 'No anime to show.',
		activeFilter = $bindable(emptyFilter()),
		searchText = $bindable(''),
		footer,
		searchSlot,
		controlsSlot,
		columnSort
	}: {
		rows: AnimeRow[];
		context: CollectionContext;
		loading?: boolean;
		onOpen: (row: AnimeRow) => void;
		onRefresh?: () => void;
		refreshing?: boolean;
		refreshLabel?: string;
		/** Server-driven contexts (Search) hide the client search/sort controls. */
		enableSearch?: boolean;
		enableSort?: boolean;
		enableFilter?: boolean;
		enableGroup?: boolean;
		/** Turn on multi-select + batch actions. Requires `selectionId`. */
		enableSelection?: boolean;
		/** Stable per-instance key for the selection store ('season' | 'search' | 'list:<tab>'). */
		selectionId?: string;
		/** Add tracking actions to menus (Track / Edit tracking / + archive-delete on tracked). */
		enableTracking?: boolean;
		/** Tracked page viewing the archived list (offer Unarchive; batch = delete only). */
		archivedView?: boolean;
		/** Show the leading agnostic "#" index column (tracked list, table views). */
		showIndex?: boolean;
		/** Resolve a row's already-loaded tracked item (tracked page) to skip the edit GET. */
		resolveTrackedItem?: (row: AnimeRow) => TrackedAnimeItem | undefined;
		/** Tracked page callbacks — AnimeCollection runs the API + confirm; page updates its data. */
		onTrackSaved?: (item: TrackedAnimeItem) => void;
		onArchived?: (row: AnimeRow) => void;
		onUnarchived?: (row: AnimeRow) => void;
		onDeleted?: (row: AnimeRow) => void;
		onBatchArchived?: (anilistIds: number[]) => void;
		onBatchDeleted?: (anilistIds: number[]) => void;
		defaultView?: ViewMode;
		defaultSort?: SortState;
		defaultGroup?: GroupKey;
		excludeColumns?: ColumnId[];
		emptyLabel?: string;
		/** Applied filter state — bindable so a page (tracked banners) can drive it. */
		activeFilter?: FilterState;
		/** Client search box text — bindable so a page can preserve it across nav (Browse season). */
		searchText?: string;
		/** Rendered below the body — pagination controls for server-driven lists. */
		footer?: Snippet;
		/** Server-driven search box, rendered in toolbar row 1 (beside select/refresh) when
		 *  `enableSearch` is false — lets a server-driven list keep the browse-style layout. */
		searchSlot?: Snippet;
		/** Extra server-driven controls (sort/filter), rendered as a centered row in the controls
		 *  area — same grouping the built-in sort/filter row uses. */
		controlsSlot?: Snippet;
		/** Header click-to-sort for server-driven contexts (user list). Client contexts (Browse
		 *  season / Tracked) build their own from the internal sort store when `enableSort`. */
		columnSort?: ColumnSort;
	} = $props();

	// `context` + initial defaults are fixed for the collection's lifetime; capture once.
	const ctx = untrack(() => context);
	const init = untrack(() => {
		const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
		return { view: mobile ? 'card' : defaultView, sort: defaultSort, group: defaultGroup };
	});
	// Mega-card view is Browse-only (needs the full anime metadata + synopsis).
	const availableViews = VIEW_MODES.filter((v) => v.mode !== 'mega' || ctx === 'browse');

	/* --- persisted prefs (per context) --- */
	const view = persisted<ViewMode>(`saberr_${ctx}_view`, init.view);
	const columns = persisted<ColumnId[]>(`saberr_${ctx}_columns`, defaultColumnIds(ctx));
	const group = persisted<GroupKey>(`saberr_${ctx}_group`, init.group);
	const sort = persisted<SortState>(`saberr_${ctx}_sort`, init.sort);

	/* --- search + filter state --- */
	let draftFilter = $state<FilterState>(emptyFilter());
	let filterOpen = $state(false);
	let isMobile = $state(false);

	onMount(() => {
		clock.start(); // drive the countdown-expiry auto-refresh below
		const mq = window.matchMedia('(max-width: 767px)');
		const update = () => (isMobile = mq.matches);
		update();
		mq.addEventListener('change', update);
		return () => mq.removeEventListener('change', update);
	});

	/* --- Live countdown → auto force-refresh ---------------------------------------
	 * When a visible "next episode" countdown reaches 0 — or a cached page renders with one
	 * already past — refetch fresh (via `onRefresh`, wired by every consumer to a force_freshness
	 * reload) so `next` rolls over to the following episode. Each expired air time fires at most
	 * once: the backend can lag AniList and keep returning the same past time, so a naive re-check
	 * would refetch every tick forever. */
	const refreshedAirTimes = new SvelteSet<number>();
	$effect(() => {
		// `clock.tick` re-runs this each minute; `Date.now()` guards a stale first tick (a cached
		// page revisited long after the tick last advanced) so an already-past episode is still caught.
		const nowSec = Math.floor(Math.max(clock.tick, Date.now()) / 1000);
		const airTimes = rows
			.map((r) => r.nextEpisode?.airing_at)
			.filter((t): t is number => t != null);
		const busy = refreshing;
		untrack(() => {
			// Bound the handled set to air times still present (an aired time never reappears).
			for (const t of refreshedAirTimes) if (!airTimes.includes(t)) refreshedAirTimes.delete(t);
			const expired = airTimes.filter((t) => t <= nowSec);
			// Skip while a refresh is already in flight (don't mark → we still fire once it settles).
			if (busy || !onRefresh || !expired.some((t) => !refreshedAirTimes.has(t))) return;
			for (const t of expired) refreshedAirTimes.add(t);
			onRefresh();
		});
	});

	const clone = (f: FilterState): FilterState => structuredClone($state.snapshot(f));

	function openFilter() {
		draftFilter = clone(activeFilter);
		filterOpen = true;
	}
	function applyFilter() {
		activeFilter = clone(draftFilter);
		filterOpen = false;
	}
	// Clear all (in-panel or the toolbar button): reset, apply immediately, close.
	function clearFilters() {
		activeFilter = emptyFilter();
		draftFilter = emptyFilter();
		filterOpen = false;
	}
	function onFilterOpenChange(open: boolean) {
		if (open) openFilter();
		else applyFilter(); // closing (click-outside) commits the draft
	}

	const activeFilterCount = $derived(filterCount(activeFilter));

	/* --- pipeline (client side; server-driven caps skip their stage) --- */
	const present = $derived(enableFilter && ctx === 'browse' ? presentOptions(rows) : null);
	const searched = $derived(enableSearch ? searchRows(rows, searchText) : rows);
	const filtered = $derived(enableFilter ? filterRows(searched, activeFilter) : searched);
	const processed = $derived(enableSort ? sortRows(filtered, sort.current) : filtered);
	const groups = $derived(
		enableGroup ? groupRows(processed, group.current) : groupRows(processed, 'none')
	);

	/* --- columns --- */
	const availableColumns = $derived(columnsFor(ctx));
	// Hide the column that's redundant with the active grouping.
	const groupHidden = $derived<ColumnId[]>(
		group.current === 'format'
			? ['format']
			: group.current === 'list_status'
				? ['myStatus']
				: group.current === 'airing_status'
					? ['airing']
					: []
	);
	const visibleColumns = $derived(
		availableColumns
			.filter((c) => !excludeColumns.includes(c.id) && !groupHidden.includes(c.id))
			.filter((c) => isColumnLocked(c, ctx) || columns.current.includes(c.id))
			.map((c) => c.id)
	);
	function toggleColumn(id: ColumnId) {
		const def = availableColumns.find((c) => c.id === id);
		if (def && isColumnLocked(def, ctx)) return;
		columns.current = columns.current.includes(id)
			? columns.current.filter((c) => c !== id)
			: [...columns.current, id];
	}
	function resetColumns() {
		columns.current = defaultColumnIds(ctx);
	}

	/* --- group collapse --- */
	const collapsed = new SvelteSet<string>();
	const toggleCollapse = (id: string) =>
		collapsed.has(id) ? collapsed.delete(id) : collapsed.add(id);

	/* --- edit dialog --- */
	let editTarget = $state<AnimeRow | null>(null);
	let editOpen = $state(false);
	function edit(row: AnimeRow) {
		editTarget = row;
		editOpen = true;
	}
	const increment = (row: AnimeRow) => incrementProgress(rowMutationContext(row));

	/* --- tracking (dialog + archive/delete) --- */
	const trackedCtx = $derived(ctx === 'tracked');
	let trackOpen = $state(false);
	let trackSummary = $state<TrackAnimeSummary | null>(null);
	let trackItem = $state<TrackedAnimeItem | null>(null);

	function doTrackCreate(row: AnimeRow) {
		trackItem = null;
		trackSummary = summaryFromRow(row);
		trackOpen = true;
	}
	async function doTrackEdit(row: AnimeRow) {
		if (row.trackedAnimeId == null) return;
		// Use the page's already-loaded item when available (tracked list); else fetch.
		const local = resolveTrackedItem?.(row);
		if (local) {
			trackItem = local;
			trackSummary = null;
			trackOpen = true;
			return;
		}
		try {
			trackItem = await getTrackedAnime(row.trackedAnimeId, false, false);
			trackSummary = null;
			trackOpen = true;
		} catch {
			/* HTTP client toasted */
		}
	}

	// Archive / delete need a confirm; unarchive is immediate.
	let archiveTarget = $state<AnimeRow | null>(null);
	let confirmArchiveOpen = $state(false);
	let deleteTarget = $state<AnimeRow | null>(null);
	let confirmDeleteTrackedOpen = $state(false);

	function doArchive(row: AnimeRow) {
		archiveTarget = row;
		confirmArchiveOpen = true;
	}
	function doDeleteTracked(row: AnimeRow) {
		deleteTarget = row;
		confirmDeleteTrackedOpen = true;
	}
	async function doUnarchive(row: AnimeRow) {
		if (row.trackedAnimeId == null) return;
		try {
			await unarchiveTracked(row.trackedAnimeId);
			onUnarchived?.(row);
		} catch {
			/* toasted */
		}
	}
	async function confirmArchive() {
		const row = archiveTarget;
		if (!row || row.trackedAnimeId == null) return;
		await archiveTracked(row.trackedAnimeId);
		onArchived?.(row);
	}
	async function confirmDeleteTracked() {
		const row = deleteTarget;
		if (!row || row.trackedAnimeId == null) return;
		await deleteTracked(row.trackedAnimeId, row.anilistId);
		onDeleted?.(row);
	}

	/** Per-row tracking actions threaded into the menus (only when enabled). */
	function trackingFor(row: AnimeRow): TrackingMenuCtl | undefined {
		if (!enableTracking) return undefined;
		const tracked = row.trackedAnimeId != null;
		return {
			trackedAnimeId: row.trackedAnimeId ?? null,
			onTrack: () => doTrackCreate(row),
			onEditTracking: () => doTrackEdit(row),
			gotoHref: tracked ? `/tracked/${row.trackedAnimeId}` : null,
			animeHref: `/browse?anilist_id=${row.anilistId}`,
			searchTorrentsHref: tracked
				? `/rss?q=${encodeURIComponent(row.romaji_title ?? row.english_title ?? '')}`
				: null,
			onArchive: trackedCtx && tracked && !archivedView ? () => doArchive(row) : null,
			onUnarchive: trackedCtx && tracked && archivedView ? () => doUnarchive(row) : null,
			onDelete: trackedCtx && tracked ? () => doDeleteTracked(row) : null,
			archived: archivedView
		};
	}
	const tracking = $derived(enableTracking ? trackingFor : undefined);

	function setSort(key: SortKey) {
		sort.current = { ...sort.current, key };
	}
	function toggleDir() {
		sort.current = { ...sort.current, dir: sort.current.dir === 'asc' ? 'desc' : 'asc' };
	}

	// Client-side header sort (Browse season / Tracked): 1:1 column→SortKey map. Columns absent here
	// aren't sortable. Clicking the active key toggles direction; a new key keeps the current direction.
	const CLIENT_COLUMN_SORT: Partial<Record<ColumnId, SortKey>> = {
		title: 'title',
		popularity: 'popularity',
		meanScore: 'score',
		startDate: 'airdate',
		next: 'next',
		episodes: 'episodes'
	};
	const clientColumnSort = $derived<ColumnSort>({
		key: sort.current.key,
		dir: sort.current.dir,
		sortKeyFor: (col) => CLIENT_COLUMN_SORT[col] ?? null,
		onSort: (col) => {
			const key = CLIENT_COLUMN_SORT[col];
			if (!key) return;
			if (sort.current.key === key) toggleDir();
			else setSort(key);
		}
	});
	// Client contexts drive the internal store; server contexts (user list) pass their own adapter.
	const tableColumnSort = $derived(enableSort ? clientColumnSort : columnSort);

	/* --- selection --- */
	// A stable key enables selection; fall back to the context so a misconfigured caller is still isolated.
	const selId = $derived(selectionId ?? ctx);
	const canSelect = $derived(enableSelection);
	const selecting = $derived(canSelect && selection.isActive(selId));
	const selectedCount = $derived(selection.count(selId));
	// Visible display order (flattened across groups) — drives shift-range math.
	const orderedIds = $derived(groups.flatMap((g) => g.rows.map((r) => r.anilistId)));

	const capToast = () => notifyInfo(`Selection limited to ${MAX_SELECTION} items`);

	function selectClick(row: AnimeRow, e: MouseEvent) {
		const ok = e.shiftKey
			? selection.toggleRange(selId, row.anilistId, orderedIds)
			: selection.toggle(selId, row.anilistId);
		if (!ok) capToast();
	}
	function selectEnter(row: AnimeRow) {
		selection.enter(selId, row.anilistId);
	}

	/* --- batch actions --- */
	const selectedIds = $derived(selection.all(selId));
	const selectedRows = $derived(rows.filter((r) => selection.isSelected(selId, r.anilistId)));
	// "Set score" is disabled when any off-list item is selected; "Delete" only sends on-list ids.
	const hasOffListSelected = $derived(selectedRows.some((r) => !r.entry));
	const deletableIds = $derived(selectedRows.filter((r) => r.entry).map((r) => r.anilistId));

	let scoreOpen = $state(false);
	let confirmDeleteOpen = $state(false);

	const batchCtl = $derived<BatchMenuCtl>({
		count: selectedCount,
		hasOffListSelected,
		deletableCount: deletableIds.length,
		setStatus: doSetStatus,
		openScore: () => (scoreOpen = true),
		openDelete: () => (confirmDeleteOpen = true),
		...(trackedCtx
			? {
					archived: archivedView,
					archive: archivedView ? undefined : () => (confirmBatchArchiveOpen = true),
					deleteTracked: () => (confirmBatchDeleteOpen = true)
				}
			: {})
	});

	const selectionCtl = $derived<SelectionCtl | undefined>(
		canSelect
			? {
					active: selecting,
					isSelected: (id: number) => selection.isSelected(selId, id),
					click: selectClick,
					enter: selectEnter,
					batch: batchCtl
				}
			: undefined
	);

	// Reconcile the selection against the visible dataset: drop ids that left `rows` (moved tab /
	// deleted), exit selection mode when none remain. Skipped while `loading` (transient empty state).
	$effect(() => {
		if (!selecting || loading) return;
		const selIds = selection.all(selId);
		if (selIds.length === 0) return;
		const present = new SvelteSet(rows.map((r) => r.anilistId));
		const gone = selIds.filter((id) => !present.has(id));
		if (gone.length === 0) return;
		if (gone.length === selIds.length) selection.exit(selId);
		else selection.prune(selId, gone);
	});

	async function doSetStatus(status: AnilistAnimeUserStatus) {
		const ids = selection.all(selId);
		if (ids.length === 0) return;
		try {
			// Items leaving a list tab are dropped from the selection by the reconcile effect above.
			await batchSetStatus(ids, status);
		} catch {
			/* HTTP client toasted the detail; selection kept */
		}
	}
	async function doSetScore(score: number) {
		const ids = selection.all(selId);
		if (ids.length === 0) return;
		try {
			await batchSetScore(ids, score);
			scoreOpen = false; // score keeps the selection (rows stay in place)
		} catch {
			/* toasted; keep dialog open so the user can retry */
		}
	}
	async function doDelete() {
		const ids = deletableIds;
		if (ids.length === 0) return;
		// Deleted items leave the list view; the reconcile effect prunes/exits.
		await batchDelete(ids);
	}

	/* --- batch tracked actions (tracked page) --- */
	let confirmBatchArchiveOpen = $state(false);
	let confirmBatchDeleteOpen = $state(false);

	async function doBatchArchive() {
		const ids = selection.all(selId);
		if (ids.length === 0) return;
		await batchArchiveTracked(ids);
		onBatchArchived?.(ids);
	}
	async function doBatchDeleteTracked() {
		const ids = selection.all(selId);
		if (ids.length === 0) return;
		await batchDeleteTracked(ids);
		onBatchDeleted?.(ids);
	}
</script>

{#snippet selectButton()}
	{#if selecting}
		<Button
			type="button"
			size="sm"
			onclick={() => selection.exit(selId)}
			class="gap-1.5"
			title="Clear selection"
		>
			<Icon name="close" size={15} />
			<span>{selectedCount} selected</span>
		</Button>
	{:else}
		<Button
			type="button"
			variant="outline"
			size="sm"
			onclick={() => selection.toggleActive(selId)}
			class="gap-1.5"
		>
			<Icon name="select" size={15} />
			<span class="hidden sm:inline">Select</span>
		</Button>
	{/if}
{/snippet}

<!-- Sticky selection bar: overlays the app header (z-40 > header z-30) while in mode. -->
{#if selecting}
	<div
		class="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background px-3 shadow-sm sm:px-4"
	>
		<button
			type="button"
			onclick={() => selection.exit(selId)}
			aria-label="Exit selection mode"
			class="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
		>
			<Icon name="close" size={22} />
		</button>
		<span class="text-sm font-semibold">{selectedCount} selected</span>

		<div class="ml-auto">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger
					disabled={selectedCount === 0}
					class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-br from-brand-light to-brand px-3.5 text-sm font-medium text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
				>
					<Icon name="edit" size={15} />
					Edit
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" class="w-56">
					{#if !trackedCtx}
						<DropdownMenu.Item disabled>
							<Icon name="tracked" size={15} />
							Start tracking
						</DropdownMenu.Item>
					{/if}

					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger>
							<Icon name="watching" size={15} />
							Set status
						</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent class="w-44">
							{#each ANILIST_USER_STATUSES as s (s)}
								<DropdownMenu.Item onSelect={() => doSetStatus(s)}>
									{ANILIST_STATUS_LABELS[s]}
								</DropdownMenu.Item>
							{/each}
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>

					<DropdownMenu.Item disabled={hasOffListSelected} onSelect={() => (scoreOpen = true)}>
						<Icon name="star" size={15} />
						Set score
					</DropdownMenu.Item>
					{#if hasOffListSelected}
						<p class="px-2 py-1 text-xs text-muted-foreground">
							Some selected items aren't on your list.
						</p>
					{/if}

					<DropdownMenu.Separator />
					<DropdownMenu.Item
						class="text-destructive"
						disabled={deletableIds.length === 0}
						onSelect={() => (confirmDeleteOpen = true)}
					>
						<Icon name="trash" size={15} />
						Delete from list
					</DropdownMenu.Item>

					{#if trackedCtx}
						<DropdownMenu.Separator />
						{#if !archivedView}
							<DropdownMenu.Item onSelect={() => (confirmBatchArchiveOpen = true)}>
								<Icon name="archive" size={15} />
								Archive
							</DropdownMenu.Item>
						{/if}
						<DropdownMenu.Item
							class="text-destructive"
							onSelect={() => (confirmBatchDeleteOpen = true)}
						>
							<Icon name="trash" size={15} />
							Delete tracked anime
						</DropdownMenu.Item>
					{/if}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</div>
{/if}

<!-- Toolbar -->
<div class="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
	<!-- Row 1 (mobile): refresh + full-width search -->
	<div class="flex items-center gap-2">
		<!-- Select lives left of Refresh on both desktop and mobile. -->
		{#if canSelect}
			{@render selectButton()}
		{/if}
		{#if onRefresh}
			<Button type="button" variant="outline" size="sm" onclick={onRefresh} disabled={refreshing}>
				<Icon name="refresh" size={15} class={refreshing ? 'animate-spin' : ''} />
				<span class="hidden sm:inline">{refreshLabel}</span>
			</Button>
		{/if}
		{#if enableSearch}
			<div class="relative flex-1 sm:flex-none">
				<Icon
					name="search"
					size={15}
					class="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
				/>
				<Input bind:value={searchText} placeholder="Search…" class="h-8 w-full pl-8 sm:w-52" />
			</div>
		{:else if searchSlot}
			{@render searchSlot()}
		{/if}
	</div>

	<!-- Controls: a single right-aligned row on desktop; two centered rows on mobile -->
	<div class="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
		<!-- Row 2 (mobile): columns / view / group -->
		<div class="flex flex-wrap justify-center gap-2 sm:contents">
			<!-- Column picker (table views) — left of the view switcher -->
			{#if isTableView(view.current)}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
					>
						<Icon name="columns" size={15} />
						<span class="hidden sm:inline">Columns</span>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content class="w-48" align="end">
						{#each availableColumns as col (col.id)}
							{@const locked = isColumnLocked(col, ctx)}
							<button
								type="button"
								class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
								disabled={locked}
								onclick={() => toggleColumn(col.id)}
							>
								<Checkbox
									checked={locked || columns.current.includes(col.id)}
									tabindex={-1}
									aria-hidden="true"
									class="pointer-events-none"
								/>
								{columnLabel(col, ctx)}
							</button>
						{/each}
						<DropdownMenu.Separator />
						<button
							type="button"
							class="w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
							onclick={resetColumns}
						>
							Reset to defaults
						</button>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{/if}

			<!-- View switcher (active expands to show its name) -->
			<div class="inline-flex rounded-lg border border-border p-0.5">
				{#each availableViews as v (v.mode)}
					{@const active = view.current === v.mode}
					<button
						type="button"
						onclick={() => (view.current = v.mode)}
						class={cn(
							'inline-flex h-7 items-center justify-center gap-1.5 rounded-md transition-colors',
							active
								? 'bg-muted px-2.5 text-foreground'
								: 'size-7 text-muted-foreground hover:text-foreground'
						)}
						title={v.label}
						aria-label={v.label}
						aria-pressed={active}
					>
						<Icon name={v.icon} size={16} />
						{#if active}<span class="text-xs font-medium">{v.label}</span>{/if}
					</button>
				{/each}
			</div>

			<!-- Group -->
			{#if enableGroup}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class={cn(
							'inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm hover:bg-muted',
							group.current !== 'none' ? 'text-foreground' : 'text-muted-foreground'
						)}
					>
						<Icon name="layers" size={15} />
						<span>Group: {GROUP_LABELS[group.current]}</span>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content class="w-44" align="end">
						{#each Object.entries(GROUP_LABELS) as [key, label] (key)}
							<DropdownMenu.Item onSelect={() => (group.current = key as GroupKey)}>
								<span class="flex-1">{label}</span>
								{#if group.current === key}<Icon name="check" size={14} />{/if}
							</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{/if}
		</div>

		<!-- Server-driven controls injected by the consumer (e.g. user-list sort/filter) -->
		{#if controlsSlot}
			{@render controlsSlot()}
		{/if}

		<!-- Row 3 (mobile): sort / filter -->
		<div class="flex flex-wrap justify-center gap-2 sm:contents">
			<!-- Sort -->
			{#if enableSort}
				<div class="inline-flex">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger
							class="inline-flex h-8 items-center gap-1.5 rounded-l-lg border border-border px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
						>
							<Icon name="arrow-down-up" size={15} />
							<span>Sort: {SORT_LABELS[sort.current.key]}</span>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content class="w-40" align="end">
							{#each Object.entries(SORT_LABELS) as [key, label] (key)}
								<DropdownMenu.Item onSelect={() => setSort(key as SortKey)}>
									<span class="flex-1">{label}</span>
									{#if sort.current.key === key}<Icon name="check" size={14} />{/if}
								</DropdownMenu.Item>
							{/each}
						</DropdownMenu.Content>
					</DropdownMenu.Root>
					<button
						type="button"
						onclick={toggleDir}
						class="inline-flex size-8 items-center justify-center rounded-r-lg border border-l-0 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
						title={sort.current.dir === 'asc' ? 'Ascending' : 'Descending'}
						aria-label="Toggle sort direction"
					>
						<Icon name={sort.current.dir === 'asc' ? 'sort-asc' : 'sort-desc'} size={15} />
					</button>
				</div>
			{/if}

			<!-- Filter -->
			{#if enableFilter}
				{#if activeFilterCount > 0}
					<Button type="button" variant="ghost" size="sm" onclick={clearFilters}
						>Clear filters</Button
					>
				{/if}
				{#if isMobile}
					<Sheet.Root bind:open={filterOpen} onOpenChange={onFilterOpenChange}>
						<Sheet.Trigger
							class={cn(
								'inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm hover:bg-muted',
								activeFilterCount > 0 ? 'border-info/40 text-foreground' : 'text-muted-foreground'
							)}
						>
							<Icon name="filter" size={15} />
							Filter
							{#if activeFilterCount > 0}
								<span
									class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-info/15 px-1 text-xs font-semibold text-info"
									>{activeFilterCount}</span
								>
							{/if}
						</Sheet.Trigger>
						<Sheet.Content side="right" class="w-full p-0 sm:max-w-sm">
							<FilterPanel
								bind:draft={draftFilter}
								{present}
								genres={anilistMetadata.genres}
								categoryToTags={anilistMetadata.categoryToTags}
								onApply={applyFilter}
								onClear={clearFilters}
							/>
						</Sheet.Content>
					</Sheet.Root>
				{:else}
					<Popover.Root bind:open={filterOpen} onOpenChange={onFilterOpenChange}>
						<Popover.Trigger
							class={cn(
								'inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm hover:bg-muted',
								activeFilterCount > 0 ? 'border-info/40 text-foreground' : 'text-muted-foreground'
							)}
						>
							<Icon name="filter" size={15} />
							Filter
							{#if activeFilterCount > 0}
								<span
									class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-info/15 px-1 text-xs font-semibold text-info"
									>{activeFilterCount}</span
								>
							{/if}
						</Popover.Trigger>
						<Popover.Content align="end" class="w-96 p-0">
							<FilterPanel
								bind:draft={draftFilter}
								{present}
								genres={anilistMetadata.genres}
								categoryToTags={anilistMetadata.categoryToTags}
								onApply={applyFilter}
								onClear={clearFilters}
							/>
						</Popover.Content>
					</Popover.Root>
				{/if}
			{/if}
		</div>
	</div>
</div>

<!-- Body -->
{#if loading}
	<CollectionSkeleton view={view.current} />
{:else if processed.length === 0}
	<div
		class="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center text-muted-foreground"
	>
		<Icon name="browse" size={32} class="opacity-40" />
		<p>{emptyLabel}</p>
	</div>
{:else}
	<div class="space-y-5">
		{#each groups as g (g.id)}
			<section>
				{#if g.label}
					<button
						type="button"
						onclick={() => toggleCollapse(g.id)}
						class="mb-2 flex w-full items-center gap-2 text-left"
					>
						<Icon name={collapsed.has(g.id) ? 'chevron-right' : 'chevron-down'} size={16} />
						<span class={cn('size-2 rounded-full', g.accent.dot)}></span>
						<span class="font-semibold">{g.label}</span>
						<span class="text-sm text-muted-foreground">({g.rows.length})</span>
					</button>
				{/if}
				{#if !g.label || !collapsed.has(g.id)}
					{#if view.current === 'card'}
						<CardView
							rows={g.rows}
							{onOpen}
							onEdit={edit}
							onIncrement={increment}
							{tracking}
							trackedContext={trackedCtx}
							selection={selectionCtl}
						/>
					{:else if view.current === 'mega'}
						<MegaCardView
							rows={g.rows}
							{onOpen}
							onEdit={edit}
							onIncrement={increment}
							{tracking}
							selection={selectionCtl}
						/>
					{:else if view.current === 'poster'}
						<PosterView
							rows={g.rows}
							{onOpen}
							onEdit={edit}
							onIncrement={increment}
							{tracking}
							trackedContext={trackedCtx}
							selection={selectionCtl}
						/>
					{:else}
						<AnimeTable
							rows={g.rows}
							columns={visibleColumns}
							context={ctx}
							withPoster={view.current === 'list'}
							index={showIndex}
							{onOpen}
							onEdit={edit}
							onIncrement={increment}
							{tracking}
							selection={selectionCtl}
							columnSort={tableColumnSort}
						/>
					{/if}
				{/if}
			</section>
		{/each}
	</div>
{/if}

{#if footer && !loading}
	{@render footer()}
{/if}

{#if editTarget}
	<EditListEntryDialog
		bind:open={editOpen}
		anilistId={editTarget.anilistId}
		title={displayTitle(editTarget)}
		episodes={editTarget.episodes}
		airingStatus={editTarget.airingStatus}
		entry={editTarget.entry}
	/>
{/if}

{#if canSelect}
	<BatchScoreDialog bind:open={scoreOpen} count={selectedIds.length} onSave={doSetScore} />
	<ConfirmDialog
		bind:open={confirmDeleteOpen}
		title="Delete from list?"
		description={`${deletableIds.length} ${deletableIds.length === 1 ? 'entry' : 'entries'} will be removed from your AniList list.`}
		confirmLabel="Delete"
		destructive
		onConfirm={doDelete}
	/>
{/if}

{#if enableTracking}
	<TrackDialog
		bind:open={trackOpen}
		summary={trackSummary}
		item={trackItem}
		onSaved={onTrackSaved}
	/>
{/if}

{#if trackedCtx}
	<ConfirmDialog
		bind:open={confirmArchiveOpen}
		title="Archive this tracked anime?"
		description={`"${archiveTarget ? displayTitle(archiveTarget) : ''}" will be moved to your archived list. You can unarchive it later.`}
		confirmLabel="Archive"
		onConfirm={confirmArchive}
	/>
	<ConfirmDialog
		bind:open={confirmDeleteTrackedOpen}
		title="Delete this tracked anime?"
		description={`"${deleteTarget ? displayTitle(deleteTarget) : ''}" will stop being tracked. This won't touch your AniList list.`}
		confirmLabel="Delete"
		destructive
		onConfirm={confirmDeleteTracked}
	/>
	<ConfirmDialog
		bind:open={confirmBatchArchiveOpen}
		title="Archive selected?"
		description={`${selectedCount} tracked ${selectedCount === 1 ? 'anime' : 'anime'} will be archived.`}
		confirmLabel="Archive"
		onConfirm={doBatchArchive}
	/>
	<ConfirmDialog
		bind:open={confirmBatchDeleteOpen}
		title="Delete selected tracking?"
		description={`${selectedCount} tracked ${selectedCount === 1 ? 'anime' : 'anime'} will stop being tracked. This won't touch your AniList list.`}
		confirmLabel="Delete"
		destructive
		onConfirm={doBatchDeleteTracked}
	/>
{/if}
