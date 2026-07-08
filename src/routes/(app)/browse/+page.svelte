<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { AnimeRow } from '$lib/anilist/row';
	import { ANILIST_ANIME_SEASONS, type AnilistAnimeSeason } from '$lib/api/types';
	import { browse } from '$lib/stores/browse.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SeasonView from '$lib/components/anime/SeasonView.svelte';
	import SearchView from '$lib/components/anime/SearchView.svelte';
	import AnimeDetail from '$lib/components/anime/AnimeDetail.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	const anilistId = $derived(page.url.searchParams.get('anilist_id'));

	// Deep link `?season=Spring2026` selects that season (e.g. from the empty tracked
	// list CTA). Applied once on entry; the user can navigate seasons after.
	onMount(() => {
		const raw = page.url.searchParams.get('season');
		const m = raw ? /^([A-Za-z]+)(\d{4})$/.exec(raw) : null;
		if (!m) return;
		const season = m[1].toUpperCase() as AnilistAnimeSeason;
		if (!ANILIST_ANIME_SEASONS.includes(season)) return;
		browse.selSeason = season;
		browse.selYear = Number(m[2]);
	});
	const tab = $derived(page.url.searchParams.get('tab') === 'search' ? 'search' : 'season');
	// Where the detail's "Browse" breadcrumb returns to (preserves the active tab, J2).
	const backHref = $derived(tab === 'search' ? '/browse?tab=search' : '/browse');

	function openAnime(row: AnimeRow) {
		const suffix = tab === 'search' ? '&tab=search' : '';
		goto(`/browse?anilist_id=${row.anilistId}${suffix}`);
	}

	function setTab(t: 'season' | 'search') {
		goto(t === 'season' ? '/browse' : '/browse?tab=search', {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}

	const tabs: { id: 'season' | 'search'; label: string; icon: 'view-card' | 'search' }[] = [
		{ id: 'season', label: 'Season View', icon: 'view-card' },
		{ id: 'search', label: 'Search', icon: 'search' }
	];
</script>

{#if anilistId}
	{#key anilistId}
		<AnimeDetail anilistId={Number(anilistId)} {backHref} />
	{/key}
{:else}
	<PageHeader title="Browse" icon="browse" />

	<div class="mt-4 mb-5 flex gap-1 border-b border-border">
		{#each tabs as t (t.id)}
			<button
				type="button"
				onclick={() => setTab(t.id)}
				class={cn(
					'-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
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

	{#if tab === 'season'}
		<SeasonView onOpen={openAnime} />
	{:else}
		<SearchView onOpen={openAnime} />
	{/if}
{/if}
