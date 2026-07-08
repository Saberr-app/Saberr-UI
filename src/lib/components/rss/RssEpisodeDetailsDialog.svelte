<script lang="ts">
	/* RSS episode-details popup — a thin wrapper over the shared
	   EpisodeDownloadDetailsDialog. Sources the tracked id + the torrent's
	   (possibly multiple) episode numbers from the rss menu store, and renders a
	   plain title header. */
	import { resolveTitle } from '$lib/rss/resolve';
	import { rssMenu } from '$lib/stores/rss-menu.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import EpisodeDownloadDetailsDialog from '$lib/components/tracked/EpisodeDownloadDetailsDialog.svelte';

	const item = $derived(rssMenu.episodeItem);
	const animeTitle = $derived(item ? resolveTitle(item).value : '');
	const episodes = $derived(item?.anilist_episode_numbers ?? []);
</script>

<EpisodeDownloadDetailsDialog
	open={item != null}
	trackedAnimeId={item?.tracked_anime_id ?? null}
	{episodes}
	romajiTitle={item?.anilist_romaji_title ?? item?.anilist_english_title ?? null}
	onClose={() => rssMenu.closeEpisode()}
>
	{#snippet header({ episode })}
		<div class="px-4 pt-4">
			<Dialog.Title class="text-base leading-tight">{animeTitle}</Dialog.Title>
			<Dialog.Description class="text-xs">Episode {episode}</Dialog.Description>
		</div>
	{/snippet}
</EpisodeDownloadDetailsDialog>
