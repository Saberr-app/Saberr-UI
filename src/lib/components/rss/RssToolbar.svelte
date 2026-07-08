<script lang="ts">
	/* RSS page toolbar (two rows). Row 1: selection control (actions when selected, else "Select
	   all"), settings menu, search toggle, "Check for torrents" + countdown, group dropdown. Row 2
	   (search): query + release-groups multiselect + Search. Selection actions are wired by the page. */
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { slide } from 'svelte/transition';
	import { rss } from '$lib/stores/rss.svelte';
	import { notifyError } from '$lib/api/notify';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import MultiSelectDropdown from '$lib/components/MultiSelectDropdown.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import type { IconName } from '$lib/config/icons';
	import { cn } from '$lib/utils';

	let {
		selectionCount,
		downloadableCount,
		discardableCount,
		allSelectableSelected,
		hasSelectable,
		onDownload,
		onDiscard,
		onSelectAll,
		onUnselectAll
	}: {
		selectionCount: number;
		/** Selected rows with no existing download (Download enabled only when all qualify). */
		downloadableCount: number;
		/** Selected rows that can be discarded (not already imported). */
		discardableCount: number;
		allSelectableSelected: boolean;
		hasSelectable: boolean;
		onDownload: () => void;
		onDiscard: () => void;
		onSelectAll: () => void;
		onUnselectAll: () => void;
	} = $props();

	const btnBase =
		'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50';
	const btn = `${btnBase} hover:bg-muted`;
	// Own base (no hover:bg-muted) — else the grey hover would win over the fill and hide white text on light.
	const btnPrimary = `${btnBase} border-transparent bg-info-strong text-white hover:bg-info-strong/90`;

	// --- search row (state lives in the store; the URL is the source of truth) ---
	const groupOptions = $derived(rss.availableGroups.map((g) => ({ value: g, label: g })));

	function toggleSearch() {
		if (rss.searchOpen) {
			// Closing: clear the URL when a search is showing (the page effect restores the feed).
			if (rss.searchMode) goto('/rss');
			else rss.searchOpen = false;
		} else {
			if (rss.searchGroups.length === 0) rss.searchGroups = [...rss.availableGroups];
			rss.searchOpen = true;
		}
	}

	// Triggering a search persists it in the URL (`q` always; `groups` only when a non-full subset);
	// the page's URL effect runs the actual search. Re-searching the SAME query would navigate to an
	// identical URL (a SvelteKit no-op → the effect never re-fires), so in that case fire it directly.
	function runSearch() {
		const query = rss.searchQuery.trim();
		const parts = [`q=${encodeURIComponent(query)}`];
		// `groups` only when a non-full subset (some/none); all-selected omits it (= all).
		if (rss.searchGroups.length !== rss.availableGroups.length) {
			parts.push(`groups=${encodeURIComponent(rss.searchGroups.join(','))}`);
		}
		const target = `?${parts.join('&')}`;
		if (target === page.url.search) {
			void rss.search(query, rss.searchGroups);
		} else {
			void goto(`/rss${target}`, { keepFocus: true, noScroll: true });
		}
	}

	async function runCheck() {
		try {
			await rss.check();
		} catch (e) {
			notifyError(e instanceof Error ? e.message : 'Could not check for torrents');
		}
	}

	// --- pull countdown ---
	const nextMs = $derived(rss.nextPull ? Date.parse(rss.nextPull) : null);
	const pulling = $derived(
		rss.pulling || rss.currentlyPulling || (nextMs != null && nextMs <= rss.now)
	);
	const countdown = $derived.by(() => {
		if (pulling || nextMs == null) return null;
		const remain = Math.max(0, nextMs - rss.now);
		const m = Math.floor(remain / 60000);
		const s = Math.floor((remain % 60000) / 1000);
		return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	});

	const settingsLinks: { label: string; href: string; icon: IconName }[] = [
		{ label: 'Configure RSS settings', href: '/settings/rss', icon: 'rss' },
		{ label: 'Configure qBittorrent settings', href: '/settings/qbit', icon: 'qbit' },
		{ label: 'Configure default profile', href: '/settings/profile', icon: 'profile' },
		{ label: 'Configure processing settings', href: '/settings/processing', icon: 'processing' }
	];
</script>

<div class="flex flex-col gap-2.5">
	<!-- Row 1 — mobile: three centered rows (select·settings / check / search | group);
	     desktop: one row with the search/group cluster pushed right. -->
	<div class="flex flex-col items-center gap-2.5 sm:flex-row sm:flex-wrap sm:gap-2">
		<!-- Cluster A: select · settings -->
		<div class="flex items-center gap-2">
			<!-- Selection control -->
			{#if selectionCount > 0}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class={cn(btn, 'border-transparent bg-accent text-accent-foreground hover:bg-accent')}
					>
						<Icon name="check" size={15} />
						<b class="font-semibold">{selectionCount} selected</b>
						<Icon name="chevron-down" size={14} class="opacity-70" />
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="start" class="w-56">
						<DropdownMenu.Item
							disabled={downloadableCount === 0 || downloadableCount !== selectionCount}
							onSelect={onDownload}
						>
							<Icon name="downloads" size={15} />
							Download &amp; import
							<span class="ml-auto text-xs text-muted-foreground">{downloadableCount}</span>
						</DropdownMenu.Item>
						<DropdownMenu.Item
							disabled={discardableCount === 0 || discardableCount !== selectionCount}
							onSelect={onDiscard}
						>
							<Icon name="trash" size={15} />
							Discard
							<span class="ml-auto text-xs text-muted-foreground">{discardableCount}</span>
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<DropdownMenu.Item onSelect={onUnselectAll}>
							<Icon name="close" size={15} />
							Unselect all
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{:else}
				<button
					type="button"
					class={cn(btn, 'text-muted-foreground')}
					disabled={!hasSelectable || allSelectableSelected}
					onclick={onSelectAll}
				>
					<Icon name="select" size={15} />
					Select all
				</button>
			{/if}

			<!-- Settings -->
			<DropdownMenu.Root>
				<DropdownMenu.Trigger class={cn(btn, 'px-2.5 text-muted-foreground')} title="Configure">
					<Icon name="settings" size={16} />
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start" class="w-60">
					{#each settingsLinks as link (link.href)}
						<DropdownMenu.Item onSelect={() => goto(link.href)}>
							<Icon name={link.icon} size={15} />
							{link.label}
						</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>

		<div class="mx-0.5 hidden h-5 w-px bg-border sm:block"></div>

		<!-- Check for torrents (its own row on mobile) -->
		<button type="button" class={btnPrimary} disabled={pulling} onclick={runCheck}>
			{#if pulling}
				<Icon name="spinner" size={15} class="animate-spin" />
				Checking…
			{:else}
				<Icon name="refresh" size={15} />
				Check for torrents
				{#if countdown}<span class="tabular-nums opacity-85">({countdown})</span>{/if}
			{/if}
		</button>

		<!-- Cluster B: search | group -->
		<div class="flex items-center gap-2 sm:ml-auto">
			<!-- Search toggle -->
			<button type="button" class={cn(btn, 'text-muted-foreground')} onclick={toggleSearch}>
				<Icon name={rss.searchOpen ? 'close' : 'search'} size={15} />
				{rss.searchOpen ? 'Close search' : 'Search'}
			</button>

			<div class="mx-0.5 h-5 w-px bg-border"></div>

			<div class="flex items-center gap-2">
				<span class="text-xs text-muted-foreground">Group</span>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger class={cn(btn, 'text-foreground')}>
						{rss.groupPref.current === 'episode' ? 'By episode' : 'None'}
						<Icon name="chevron-down" size={14} class="text-muted-foreground" />
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-40">
						<DropdownMenu.Item onSelect={() => (rss.groupPref.current = 'none')}>
							None
							{#if rss.groupPref.current === 'none'}<Icon
									name="check"
									size={15}
									class="ml-auto"
								/>{/if}
						</DropdownMenu.Item>
						<DropdownMenu.Item onSelect={() => (rss.groupPref.current = 'episode')}>
							By episode
							{#if rss.groupPref.current === 'episode'}<Icon
									name="check"
									size={15}
									class="ml-auto"
								/>{/if}
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</div>
	</div>

	<!-- Row 2: search -->
	{#if rss.searchOpen}
		<div
			transition:slide={{ duration: 180 }}
			class="flex flex-col gap-2 rounded-lg border bg-card/60 p-2 sm:flex-row sm:items-center"
		>
			<input
				type="text"
				bind:value={rss.searchQuery}
				placeholder="Search on Nyaa…"
				class="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-foreground/15"
				onkeydown={(e) => e.key === 'Enter' && runSearch()}
			/>
			<div class="flex items-center gap-2">
				<MultiSelectDropdown
					options={groupOptions}
					bind:selected={rss.searchGroups}
					placeholder="Release groups"
				/>
				<button
					type="button"
					class={cn(btnPrimary, 'flex-1 justify-center sm:flex-none')}
					disabled={rss.pulling}
					onclick={runSearch}
				>
					<Icon name="search" size={15} />
					Search
				</button>
			</div>
		</div>
	{/if}
</div>
