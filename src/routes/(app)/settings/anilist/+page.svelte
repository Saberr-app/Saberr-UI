<script lang="ts">
	import SettingsPageShell from '$lib/components/settings/SettingsPageShell.svelte';
	import ServiceStatusBanner from '$lib/components/settings/ServiceStatusBanner.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import Icon from '$lib/components/Icon.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { status } from '$lib/stores/status.svelte';
	import { notifySuccess } from '$lib/api/notify';
	import { anilistTest, anilistAuthenticate, anilistLogout } from '$lib/api/settings';
	import { resolveBackendUrl } from '$lib/config/api';

	const AUTH_LINK = 'https://anilist.co/api/v2/oauth/authorize?client_id=41692&response_type=token';

	const tokenSet = $derived(settings.current.anilist.anilist_user_token === 'SET');
	const profile = $derived(settings.current.anilist.anilist_user_data);
	const avatarUrl = $derived(resolveBackendUrl(profile?.avatar));
	const bannerUrl = $derived(resolveBackendUrl(profile?.banner));

	// Title-cased moderator role badges (max 3): "anime_data" -> "Anime Data".
	const roles = $derived(
		(profile?.moderator_roles ?? []).slice(0, 3).map((r) =>
			r
				.replace(/_/g, ' ')
				.toLowerCase()
				.replace(/\b\w/g, (c) => c.toUpperCase())
		)
	);

	// Auth dialog: step 1 paste token (→ test), step 2 confirm the account (→ connect).
	let dialogOpen = $state(false);
	let step = $state<'token' | 'confirm'>('token');
	let tokenInput = $state('');
	let heldToken = $state('');
	let testedUsername = $state('');
	let testing = $state(false);
	// `connecting` also drives the page's unsaved-changes guard (warn on leave mid-request).
	let connecting = $state(false);

	let disconnectOpen = $state(false);
	let disconnecting = $state(false);

	function startAuth() {
		window.open(AUTH_LINK, '_blank', 'noopener');
		tokenInput = '';
		heldToken = '';
		testedUsername = '';
		step = 'token';
		dialogOpen = true;
	}

	function closeDialog() {
		dialogOpen = false;
		step = 'token';
		tokenInput = '';
		heldToken = '';
		testedUsername = '';
	}

	async function submitToken() {
		if (testing || !tokenInput.trim()) return;
		testing = true;
		try {
			const res = await anilistTest(tokenInput.trim());
			heldToken = tokenInput.trim();
			testedUsername = res.username;
			step = 'confirm';
		} catch {
			/* invalid token / 424 surfaced by the HTTP client; keep the dialog on step 1 */
		} finally {
			testing = false;
		}
	}

	async function connect() {
		if (connecting) return;
		connecting = true;
		try {
			const data = await anilistAuthenticate(heldToken);
			// Adopt the connected state immediately, then reconcile from the backend.
			settings.patch('anilist', {
				...$state.snapshot(settings.current.anilist),
				anilist_user_token: 'SET',
				anilist_username: data?.username ?? testedUsername,
				anilist_user_data: data ?? settings.current.anilist.anilist_user_data
			});
			status.markServiceHealthy('anilist');
			closeDialog();
			notifySuccess('Connected to AniList.');
			await settings.refresh();
		} catch {
			/* surfaced by the HTTP client */
		} finally {
			connecting = false;
		}
	}

	async function disconnect() {
		if (disconnecting) return;
		disconnecting = true;
		try {
			await anilistLogout();
			await settings.refresh();
			disconnectOpen = false;
			notifySuccess('Disconnected from AniList.');
		} catch {
			/* surfaced by the HTTP client */
		} finally {
			disconnecting = false;
		}
	}
</script>

<SettingsPageShell title="AniList Service" icon="anilist" dirty={connecting}>
	{#snippet banner()}
		<!-- Errors still surface here; the healthy "Online" box is suppressed. -->
		<ServiceStatusBanner service="anilist" hideWhenHealthy />
	{/snippet}

	<div class="flex flex-col gap-6">
		{#if tokenSet}
			<!-- Connected: profile card -->
			<div class="overflow-hidden rounded-lg border border-border bg-card">
				{#if bannerUrl}
					<div
						class="h-24 w-full bg-cover bg-center"
						style="background-image: url('{bannerUrl}')"
					></div>
				{/if}
				<div class="flex gap-4 p-4">
					{#if avatarUrl}
						<img
							src={avatarUrl}
							alt={profile?.username}
							class={'size-24 shrink-0 rounded-lg object-cover ' +
								(bannerUrl ? '-mt-16 border-4 border-card' : '')}
						/>
					{/if}
					<div class="min-w-0 flex-1">
						<a
							href={profile?.site_url}
							target="_blank"
							rel="noopener"
							class="text-lg font-bold hover:underline"
						>
							{profile?.username ?? settings.current.anilist.anilist_username}
						</a>
						{#if roles.length}
							<div class="mt-1 flex flex-wrap gap-1">
								{#each roles as role (role)}
									<span
										class="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
									>
										{role}
									</span>
								{/each}
							</div>
						{/if}
						{#if profile}
							<div class="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
								<span
									>Watching: <span class="font-medium text-foreground"
										>{profile.current_anime_count}</span
									></span
								>
								<span
									>Planning: <span class="font-medium text-foreground"
										>{profile.planning_anime_count}</span
									></span
								>
								<span
									>Completed: <span class="font-medium text-foreground"
										>{profile.completed_anime_count}</span
									></span
								>
								<span
									>Mean score: <span class="font-medium text-foreground"
										>{profile.mean_score === 0 ? '-' : profile.mean_score}</span
									></span
								>
							</div>
						{/if}
					</div>
					<div class="flex items-end">
						<Button type="button" variant="destructive" onclick={() => (disconnectOpen = true)}>
							Disconnect
						</Button>
					</div>
				</div>
			</div>
		{:else}
			<!-- Not authenticated yet -->
			<div class="flex flex-col items-start gap-3">
				<p class="max-w-prose text-sm text-muted-foreground">
					Connect your AniList account for a richer experience.
				</p>
				<Button
					type="button"
					variant="affirmative"
					size="lg"
					class="h-12 px-8 text-base"
					onclick={startAuth}
				>
					Authenticate
				</Button>
			</div>
		{/if}
	</div>
</SettingsPageShell>

<!-- Auth dialog: paste token, then confirm the account -->
<Dialog.Root
	bind:open={dialogOpen}
	onOpenChange={(open) => {
		if (!open && !connecting) closeDialog();
	}}
>
	<Dialog.Content class="sm:max-w-md">
		{#if step === 'token'}
			<Dialog.Header>
				<Dialog.Title>Enter the token from AniList</Dialog.Title>
				<Dialog.Description>
					Authorize in the tab that just opened, then paste the generated token here.
				</Dialog.Description>
			</Dialog.Header>
			<Input bind:value={tokenInput} placeholder="Paste your AniList token" autocomplete="off" />
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={closeDialog} disabled={testing}>
					Cancel
				</Button>
				<Button
					type="button"
					variant="affirmative"
					onclick={submitToken}
					disabled={!tokenInput.trim() || testing}
				>
					{#if testing}<Icon name="spinner" size={16} class="animate-spin" />{/if}
					OK
				</Button>
			</Dialog.Footer>
		{:else}
			<Dialog.Header>
				<Dialog.Title>Continue as {testedUsername}?</Dialog.Title>
			</Dialog.Header>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={closeDialog} disabled={connecting}>
					Cancel
				</Button>
				<Button type="button" variant="affirmative" onclick={connect} disabled={connecting}>
					{#if connecting}<Icon name="spinner" size={16} class="animate-spin" />{/if}
					Connect
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Disconnect confirmation -->
<Dialog.Root bind:open={disconnectOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Disconnect AniList?</Dialog.Title>
			<Dialog.Description>Your AniList anime list will be removed from Saberr.</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button
				type="button"
				variant="outline"
				onclick={() => (disconnectOpen = false)}
				disabled={disconnecting}
			>
				Cancel
			</Button>
			<Button type="button" variant="destructive" onclick={disconnect} disabled={disconnecting}>
				{#if disconnecting}<Icon name="spinner" size={16} class="animate-spin" />{/if}
				Disconnect
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
