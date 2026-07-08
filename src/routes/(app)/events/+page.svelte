<script lang="ts">
	import { onMount } from 'svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import AuditFilters from '$lib/components/audit/AuditFilters.svelte';
	import AuditRow from '$lib/components/audit/AuditRow.svelte';
	import { intersect } from '$lib/utils/infinite-scroll';
	import { listAuditLogs } from '$lib/api/audit';
	import type { AuditLogCategory, AuditLogCode, AuditLogItem, SortDirection } from '$lib/api/types';

	const PAGE_SIZE = 50;

	// --- Filters (owned here, bound into AuditFilters) ---
	let categories = $state<string[]>([]);
	let codes = $state<string[]>([]);
	let textQuery = $state('');
	let createdAfter = $state<string | null>(null);
	let createdBefore = $state<string | null>(null);
	let sortDirection = $state<SortDirection>('desc');

	// --- List state ---
	let items = $state<AuditLogItem[]>([]);
	let loading = $state(false);
	let done = $state(false);
	let firstLoadDone = $state(false);
	let loadFailed = $state(false);

	// Bumped on every filter change; in-flight responses with a stale id are dropped.
	let reqId = 0;

	async function query(offset: number, replace: boolean) {
		const id = replace ? ++reqId : reqId;
		if (replace) {
			items = [];
			done = false;
		}
		loading = true;
		try {
			const data = await listAuditLogs({
				categories: categories as AuditLogCategory[],
				codes: codes as AuditLogCode[],
				textQuery: textQuery || null,
				createdAfter,
				createdBefore,
				sortDirection,
				offset,
				limit: PAGE_SIZE
			});
			if (id !== reqId) return; // a newer filter set superseded this request
			const batch = data.audit_logs;
			items = replace ? batch : [...items, ...batch];
			done = batch.length < PAGE_SIZE;
			firstLoadDone = true;
			loadFailed = false;
		} catch {
			if (id !== reqId) return;
			if (!firstLoadDone) loadFailed = true;
		} finally {
			if (id === reqId) loading = false;
		}
	}

	function applyFilters() {
		void query(0, true);
	}

	// Clicking a row's category chip filters to just that category.
	function setCategoryFilter(category: AuditLogCategory) {
		categories = [category];
		applyFilters();
	}

	function loadMore() {
		if (!loading && !done) void query(items.length, false);
	}

	onMount(() => void query(0, true));
</script>

<PageHeader title="Event logs" icon="audit" />

<div class="mt-6 flex flex-col gap-4">
	<AuditFilters
		bind:categories
		bind:codes
		bind:textQuery
		bind:createdAfter
		bind:createdBefore
		bind:sortDirection
		onchange={applyFilters}
	/>

	<!-- Column header (desktop). -->
	<div
		class="hidden grid-cols-[140px_170px_200px_1fr_auto] gap-x-4 px-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase md:grid"
	>
		<span>Time</span>
		<span>Category</span>
		<span>Event</span>
		<span>Detail</span>
		<span></span>
	</div>

	{#if !firstLoadDone && loadFailed}
		<p class="text-sm text-muted-foreground">
			Couldn't load the audit log. Make sure the backend is reachable, then refresh.
		</p>
	{:else if !firstLoadDone}
		<p class="text-sm text-muted-foreground">Loading audit log…</p>
	{:else if items.length === 0}
		<p class="text-sm text-muted-foreground">No audit entries match these filters.</p>
	{:else}
		<div class="flex flex-col gap-1.5">
			{#each items as item (item.id)}
				<AuditRow {item} onfiltercategory={setCategoryFilter} />
			{/each}
		</div>

		{#if !done}
			<div use:intersect={{ onIntersect: loadMore, disabled: loading }} class="h-1"></div>
			{#if loading}
				<p class="py-2 text-center text-sm text-muted-foreground">Loading more…</p>
			{/if}
		{/if}
	{/if}
</div>
