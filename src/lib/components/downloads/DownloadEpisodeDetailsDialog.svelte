<script lang="ts">
	/* Downloads' episode-details popup — a thin wrapper over the shared
	   EpisodeDownloadDetailsDialog. Sources the tracked id + the download's episode
	   numbers from the downloads actions store, and renders a plain title header. */
	import { downloadTitle } from '$lib/downloads/resolve';
	import { downloadsActions } from '$lib/stores/downloads-actions.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import EpisodeDownloadDetailsDialog from '$lib/components/tracked/EpisodeDownloadDetailsDialog.svelte';

	const item = $derived(downloadsActions.episodeItem);
	const animeTitle = $derived(item ? downloadTitle(item) : '');
	const episodes = $derived(item?.anilist_episode_numbers ?? []);
</script>

<EpisodeDownloadDetailsDialog
	open={item != null}
	trackedAnimeId={item?.anime.tracked_anime_id ?? null}
	{episodes}
	romajiTitle={item ? (item.anime.anilist_romaji_title ?? item.anime.anilist_english_title) : null}
	onClose={() => downloadsActions.closeEpisode()}
>
	{#snippet header({ episode })}
		<div class="px-4 pt-4">
			<Dialog.Title class="text-base leading-tight">{animeTitle}</Dialog.Title>
			<Dialog.Description class="text-xs">Episode {episode}</Dialog.Description>
		</div>
	{/snippet}
</EpisodeDownloadDetailsDialog>
