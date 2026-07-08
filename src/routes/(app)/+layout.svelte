<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { pageTitle } from '$lib/config/nav';
	import { pageTitleOverride } from '$lib/stores/page-title.svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import MobileDrawer from '$lib/components/layout/MobileDrawer.svelte';
	import { watchExpiry } from '$lib/stores/auth';
	import { settings } from '$lib/stores/settings.svelte';
	import { status } from '$lib/stores/status.svelte';
	import { anilistMetadata } from '$lib/stores/anilist-metadata.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { children } = $props();

	// Gate content until the first settings fetch resolves, so pages only render real API data
	// (or the defaults fallback once a fetch has failed). See the settings store contract.
	const settingsReady = $derived(settings.loaded || settings.loadFailed);

	let drawerOpen = $state(false);

	// Authed here (guarded by +layout.ts). Start the global data layer: token-expiry watch, settings, status.
	onMount(() => {
		watchExpiry();
		settings.start();
		status.start();
		// Load AniList genres/tags (Browse/list filters); cached 1-week TTL, usually a no-op.
		void anilistMetadata.ensureFresh();
		return () => {
			settings.stop();
			status.stop();
		};
	});
</script>

<svelte:head><title>{pageTitleOverride.value ?? pageTitle(page.url.pathname)}</title></svelte:head>

<div class="min-h-screen bg-background text-foreground">
	<Header onMenuClick={() => (drawerOpen = true)} />

	<div class="flex">
		<Sidebar />
		<main class="min-w-0 flex-1">
			<div class="w-full p-4 sm:p-6">
				{#if settingsReady}
					{@render children()}
				{:else}
					<div class="flex min-h-[60vh] items-center justify-center text-muted-foreground">
						<Icon name="spinner" size={28} class="animate-spin" />
					</div>
				{/if}
			</div>
		</main>
	</div>
</div>

<MobileDrawer bind:open={drawerOpen} />
