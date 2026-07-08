<script lang="ts">
	import { goto } from '$app/navigation';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { buttonVariants } from '$lib/components/ui/button';
	import Icon from '$lib/components/Icon.svelte';
	import GlobalSearch from '$lib/components/search/GlobalSearch.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import { triggerTask } from '$lib/api/tasks';
	import { shutdownSystem } from '$lib/api/system';
	import { notifyError, notifyInfo, notifySuccess } from '$lib/api/notify';
	import { logout } from '$lib/stores/auth';
	import { status } from '$lib/stores/status.svelte';
	import { mappings } from '$lib/stores/mappings.svelte';
	import ChangePasswordDialog from '$lib/components/auth/ChangePasswordDialog.svelte';

	interface Props {
		/** Opens the mobile navigation drawer. */
		onMenuClick: () => void;
	}

	let { onMenuClick }: Props = $props();

	let shutdownOpen = $state(false);
	let changePwOpen = $state(false);
	const canChangePassword = $derived(status.current?.context === 'windows');

	/** Fire-and-forget a background task, toasting the queued/already-running outcome. */
	async function runTask(id: string, label: string) {
		try {
			const res = await triggerTask(id);
			if (res === 'running') notifyInfo(`${label} is already running`);
			else notifySuccess(`${label} queued`);
		} catch (e) {
			notifyError(e instanceof Error ? e.message : `Couldn't start ${label}`);
		}
	}

	/** Blocking rebuild of anime-relations + AniList↔TVDB mappings (shared store keeps the
	    Mappings page in sync + guards against double-runs). */
	async function refreshMappings() {
		if (mappings.refreshing) return;
		try {
			await mappings.refresh();
			notifySuccess('Mappings refreshed');
		} catch (e) {
			notifyError(e instanceof Error ? e.message : "Couldn't refresh mappings");
		}
	}

	async function doShutdown() {
		try {
			await shutdownSystem();
			notifySuccess('Shutting down…');
		} catch (e) {
			notifyError(e instanceof Error ? e.message : 'Shutdown failed');
		}
	}

	function handleLogout() {
		logout();
		goto('/login');
	}
</script>

<header
	class="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-header-border bg-header px-3 sm:px-4"
>
	<!-- Mobile: burger -->
	<button
		type="button"
		onclick={onMenuClick}
		class={buttonVariants({ variant: 'ghost', size: 'icon', class: 'lg:hidden' })}
		aria-label="Open navigation menu"
	>
		<Icon name="menu" size={22} />
	</button>

	<!-- Logo -->
	<a href="/tracked" class="flex shrink-0 items-center gap-2">
		<img src="/logo-light.svg" alt="Saberr" class="h-7 w-7 dark:hidden" />
		<img src="/logo.svg" alt="Saberr" class="hidden h-7 w-7 dark:block" />
		<span class="hidden text-lg font-semibold tracking-tight sm:inline">Saberr</span>
	</a>

	<!-- Global search -->
	<GlobalSearch />

	<!-- Right-aligned controls -->
	<div class="ml-auto flex items-center gap-1">
		<ThemeToggle />

		<!-- Quick actions -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				class={buttonVariants({ variant: 'ghost', size: 'icon' })}
				aria-label="Quick actions"
			>
				<Icon name="zap" />
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-60">
				<DropdownMenu.Label>Quick actions</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Item
					class="gap-2"
					onSelect={() => runTask('REFRESH_ANIME_USER_LISTS', 'Anime list sync')}
				>
					<Icon name="refresh" size={16} />
					Sync anime list
				</DropdownMenu.Item>
				<DropdownMenu.Item
					class="gap-2"
					disabled={mappings.refreshing}
					closeOnSelect={false}
					onSelect={refreshMappings}
				>
					<Icon
						name={mappings.refreshing ? 'spinner' : 'layers'}
						size={16}
						class={mappings.refreshing ? 'animate-spin' : ''}
					/>
					{mappings.refreshing ? 'Refreshing mappings…' : 'Refresh AniList/TVDB relations'}
				</DropdownMenu.Item>
				<DropdownMenu.Item
					class="gap-2"
					onSelect={() => runTask('CONSUME_RSS_FEEDS', 'RSS feed consume')}
				>
					<Icon name="rss" size={16} />
					Consume RSS feed
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<!-- User menu -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				class={buttonVariants({ variant: 'ghost', size: 'icon' })}
				aria-label="User menu"
			>
				<Icon name="user" />
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-44">
				{#if canChangePassword}
					<DropdownMenu.Item class="gap-2" onSelect={() => (changePwOpen = true)}>
						<Icon name="lock" size={16} />
						Change password
					</DropdownMenu.Item>
				{/if}
				<DropdownMenu.Item class="gap-2" onSelect={() => (shutdownOpen = true)}>
					<Icon name="power" size={16} />
					Shutdown
				</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<DropdownMenu.Item class="gap-2" onSelect={handleLogout}>
					<Icon name="logout" size={16} />
					Logout
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
</header>

<ConfirmDialog
	bind:open={shutdownOpen}
	title="Are you sure?"
	description=""
	confirmLabel="Shutdown"
	destructive
	onConfirm={doShutdown}
/>

<ChangePasswordDialog bind:open={changePwOpen} />
