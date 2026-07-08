<script lang="ts">
	/* Two stat cards: relations/offsets + AniList↔TVDB mappings, each a count + last-updated.
	   Status-token accents only (never brand red as a glyph). */
	import { mappings } from '$lib/stores/mappings.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import RelativeTime from '$lib/components/RelativeTime.svelte';

	const stats = $derived(mappings.stats);
</script>

<div class="grid gap-4 sm:grid-cols-2">
	<div class="rounded-lg border border-border bg-card p-4">
		<div class="flex items-center gap-2 text-xs text-muted-foreground">
			<Icon name="layers" size={14} class="text-info" />
			Relations / offsets
		</div>
		<div class="mt-1.5 text-2xl font-semibold tabular-nums">
			{stats ? stats.anime_relations_count.toLocaleString() : '—'}
		</div>
		{#if stats}
			<div class="text-xs text-muted-foreground">
				Refreshed <RelativeTime iso={stats.anime_relations_last_updated_at} coarseSubMinute />
			</div>
		{/if}
	</div>

	<div class="rounded-lg border border-border bg-card p-4">
		<div class="flex items-center gap-2 text-xs text-muted-foreground">
			<Icon name="mappings" size={14} class="text-affirmative" />
			AniList ↔ TVDB mappings
		</div>
		<div class="mt-1.5 text-2xl font-semibold tabular-nums">
			{stats ? stats.anilist_tvdb_mappings_count.toLocaleString() : '—'}
		</div>
		{#if stats}
			<div class="text-xs text-muted-foreground">
				Refreshed <RelativeTime iso={stats.anilist_tvdb_mappings_last_updated_at} coarseSubMinute />
			</div>
		{/if}
	</div>
</div>
