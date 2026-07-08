<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import NotificationListItem from '$lib/components/notifications/NotificationListItem.svelte';
	import { listNotifications, markAllNotificationsRead } from '$lib/api/notifications';
	import { status } from '$lib/stores/status.svelte';
	import { intersect } from '$lib/utils/infinite-scroll';
	import type { NotificationItem, NotificationStatus } from '$lib/api/types';

	const STATUSES: NotificationStatus[] = ['UNREAD', 'READ'];
	const PAGE_SIZE = 25;
	/** When deep-linking to a specific notification we pull a bigger first page. */
	const DEEP_LINK_SIZE = 100;

	let items = $state<NotificationItem[]>([]);
	let loading = $state(false);
	let done = $state(false);
	let initialLoaded = $state(false);
	let loadFailed = $state(false);
	let highlightId = $state<number | null>(null);

	async function fetchPage(offset: number, limit: number): Promise<void> {
		if (loading || done) return;
		loading = true;
		try {
			const data = await listNotifications({ statuses: STATUSES, offset, limit });
			const batch = data.notifications;
			items = [...items, ...batch];
			// End of feed once a page comes back short.
			if (batch.length < limit) done = true;
			initialLoaded = true;
			loadFailed = false;
		} catch {
			if (!initialLoaded) loadFailed = true;
		} finally {
			loading = false;
		}
	}

	function loadMore() {
		void fetchPage(items.length, PAGE_SIZE);
	}

	// Clicking a card clears its "new" tint locally (already read on the backend).
	function markReadLocally(id: number) {
		items = items.map((n) => (n.id === id ? { ...n, status: 'READ' as const } : n));
	}

	onMount(async () => {
		const idParam = Number(page.url.searchParams.get('notification_id'));
		const deepLink = Number.isFinite(idParam) && idParam > 0;

		await fetchPage(0, deepLink ? DEEP_LINK_SIZE : PAGE_SIZE);

		if (deepLink && items.some((n) => n.id === idParam)) {
			highlightId = idParam;
			await tick();
			document
				.getElementById(`notification-${idParam}`)
				?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			setTimeout(() => (highlightId = null), 2500);
		}

		// Clear the unread count on entry without touching local items' status — the "new" tint stays this visit.
		if (initialLoaded) {
			try {
				await markAllNotificationsRead(false);
				await status.poll();
			} catch {
				/* silent — best-effort */
			}
		}
	});
</script>

<PageHeader title="Notifications" icon="notifications" />

<div class="mt-6 flex flex-col gap-2.5">
	{#if !initialLoaded && loadFailed}
		<p class="text-sm text-muted-foreground">
			Couldn't load notifications. Make sure the backend is reachable, then refresh.
		</p>
	{:else if !initialLoaded}
		<p class="text-sm text-muted-foreground">Loading notifications…</p>
	{:else if items.length === 0}
		<p class="text-sm text-muted-foreground">You're all caught up — no notifications.</p>
	{:else}
		{#each items as notification (notification.id)}
			<NotificationListItem
				{notification}
				highlighted={highlightId === notification.id}
				onread={markReadLocally}
			/>
		{/each}

		{#if !done}
			<!-- Sentinel: loads the next page as it scrolls into view. -->
			<div use:intersect={{ onIntersect: loadMore, disabled: loading }} class="h-1"></div>
			{#if loading}
				<p class="py-2 text-center text-sm text-muted-foreground">Loading more…</p>
			{/if}
		{/if}
	{/if}
</div>
