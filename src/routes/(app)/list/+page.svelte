<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { AnimeRow } from '$lib/anilist/row';
	import { LIST_TABS, type ListTab } from '$lib/stores/userlist.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import UserListView from '$lib/components/anime/UserListView.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	const tab = $derived<ListTab>(
		LIST_TABS.find((t) => t.id === page.url.searchParams.get('tab'))?.id ?? 'watching'
	);

	// Optional tracked-status deep link (?tracked=true|false), e.g. from a tracked-page banner.
	const initialTracked = $derived.by<boolean | undefined>(() => {
		const v = page.url.searchParams.get('tracked');
		return v === 'true' ? true : v === 'false' ? false : undefined;
	});

	function setTab(t: ListTab) {
		goto(t === 'watching' ? '/list' : `/list?tab=${t}`, {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}

	function openAnime(row: AnimeRow) {
		goto(`/browse?anilist_id=${row.anilistId}`);
	}

	// Reflect a tracked-filter change to the URL (?tracked=true|false, removed for "Either").
	function onTrackedChange(value: boolean | null) {
		const parts: string[] = [];
		if (tab !== 'watching') parts.push(`tab=${tab}`);
		if (value !== null) parts.push(`tracked=${value}`);
		const qs = parts.join('&');
		goto(qs ? `/list?${qs}` : '/list', { replaceState: true, keepFocus: true, noScroll: true });
	}
</script>

<PageHeader title="Anime List" icon="list" />

<!-- Tabs (horizontally scrollable on phone — doubles as the mobile quick-switch) -->
<div class="no-scrollbar mt-4 mb-5 flex gap-1 overflow-x-auto border-b border-border">
	{#each LIST_TABS as t (t.id)}
		<button
			type="button"
			onclick={() => setTab(t.id)}
			class={cn(
				'-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
				tab === t.id
					? 'border-brand text-foreground'
					: 'border-transparent text-muted-foreground hover:text-foreground'
			)}
		>
			<Icon name={t.icon} size={16} />
			{t.label}
		</button>
	{/each}
</div>

{#key tab}
	<UserListView status={tab} onOpen={openAnime} {initialTracked} {onTrackedChange} />
{/key}
