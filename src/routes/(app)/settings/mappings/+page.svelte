<script lang="ts">
	import { onMount } from 'svelte';
	import SettingsPageShell from '$lib/components/settings/SettingsPageShell.svelte';
	import MappingStats from '$lib/components/settings/mappings/MappingStats.svelte';
	import MappingOverridesSection from '$lib/components/settings/mappings/MappingOverridesSection.svelte';
	import { Button } from '$lib/components/ui/button';
	import Icon from '$lib/components/Icon.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import { mappings } from '$lib/stores/mappings.svelte';
	import { notifyError, notifySuccess } from '$lib/api/notify';

	onMount(() => {
		mappings.load();
	});

	async function refresh() {
		try {
			await mappings.refresh();
			notifySuccess('Mappings refreshed.');
		} catch (e) {
			notifyError(e instanceof Error ? e.message : "Couldn't refresh mappings");
		}
	}
</script>

<SettingsPageShell title="Mappings" icon="mappings" contentClass="max-w-4xl">
	<div class="flex flex-col gap-6">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<p class="max-w-2xl text-sm text-muted-foreground">
				Saberr uses Taiga's
				<a
					href="https://github.com/erengy/anime-relations"
					target="_blank"
					rel="noreferrer"
					class="text-info hover:underline">anime relations</a
				>
				to resolve target anime from torrent titles through episode number offset, and AniBridge
				<a
					href="https://github.com/anibridge/anibridge-mappings"
					target="_blank"
					rel="noreferrer"
					class="text-info hover:underline">mappings</a
				> to map anime episodes to TVDB episodes.
			</p>
			<Button
				type="button"
				variant="outline"
				disabled={mappings.refreshing}
				onclick={refresh}
				class="shrink-0"
			>
				<Icon name="refresh" size={16} class={mappings.refreshing ? 'animate-spin' : ''} />
				{mappings.refreshing ? 'Refreshing…' : 'Refresh mappings'}
			</Button>
		</div>

		{#if mappings.loadFailed && !mappings.loaded}
			<div class="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
				Couldn't load mappings.
				<button type="button" onclick={() => mappings.load()} class="text-info hover:underline">
					Retry
				</button>
			</div>
		{:else}
			<MappingStats />
			<Separator />
			<MappingOverridesSection />
		{/if}
	</div>
</SettingsPageShell>
