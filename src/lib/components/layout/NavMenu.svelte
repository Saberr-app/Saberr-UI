<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { nav, isSeparator } from '$lib/config/nav';
	import Icon from '$lib/components/Icon.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { cn } from '$lib/utils';
	import { status } from '$lib/stores/status.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { sidebar } from '$lib/stores/sidebar.svelte';
	import { severityForPage, severityOverall, type Severity } from '$lib/config/service-indicators';

	interface Props {
		/** Called after a link is clicked — used to close the mobile drawer. */
		onNavigate?: () => void;
		/** Render the icon-only rail. Always expanded in the mobile drawer. */
		collapsed?: boolean;
		/** Show the collapse/expand toggle (desktop sidebar only, not the mobile drawer). */
		showToggle?: boolean;
	}

	let { onNavigate, collapsed = false, showToggle = false }: Props = $props();

	const pathname = $derived(page.url.pathname);
	const services = $derived(status.current?.services_status);

	/** Is the current route inside this section (drives accordion + active section). */
	const inSection = (base: string) => pathname === base || pathname.startsWith(base + '/');

	const dotClass = (sev: Severity) => (sev === 'red' ? 'bg-destructive' : 'bg-warning');
	/** Notification badges cap their displayed count at 99. */
	const capCount = (n: number) => (n > 99 ? '99+' : String(n));

	/** Sidebar "update available" banner → About page (+ close the mobile drawer). */
	function goToAbout() {
		onNavigate?.();
		void goto('/settings/about');
	}
</script>

<Tooltip.Provider delayDuration={300}>
	<nav class="flex min-h-full flex-col gap-0.5 p-2">
		{#each nav as entry, i (i)}
			{#if isSeparator(entry)}
				<Separator class="my-2 bg-sidebar-border" />
			{:else}
				{@const sectionActive = inSection(entry.base)}
				{@const isCurrent = entry.ownPage && pathname === entry.href}
				{@const mainSeverity = entry.base === '/settings' ? severityOverall(services) : null}

				{#if collapsed}
					<!-- Collapsed: icon-only button + name popover; indicators become corner dots. -->
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<a
									{...props}
									href={entry.href}
									onclick={entry.subItems ? undefined : onNavigate}
									aria-current={isCurrent ? 'page' : undefined}
									class={cn(
										'relative mx-auto flex h-10 w-10 items-center justify-center rounded-md transition-colors',
										isCurrent || sectionActive
											? 'bg-sidebar-accent text-sidebar-accent-foreground'
											: 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
									)}
								>
									<Icon name={entry.icon} size={18} />
									{#if entry.base === '/notifications'}
										{#if status.unreadErrorCount > 0}
											<span
												class="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-sidebar"
											></span>
										{:else if status.unreadCount > 0}
											<span
												class="absolute top-1 right-1 h-2 w-2 rounded-full bg-info ring-2 ring-sidebar"
											></span>
										{/if}
									{:else if mainSeverity}
										<span
											class={cn(
												'absolute top-1 right-1 h-2 w-2 rounded-full ring-2 ring-sidebar',
												dotClass(mainSeverity)
											)}
										></span>
									{/if}
								</a>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content side="right">{entry.label}</Tooltip.Content>
					</Tooltip.Root>
				{:else}
					<!-- Expanded: icon + label, inline badges, accordion sub-items. -->
					<a
						href={entry.href}
						onclick={entry.subItems ? undefined : onNavigate}
						aria-current={isCurrent ? 'page' : undefined}
						class={cn(
							'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
							isCurrent
								? 'bg-sidebar-accent text-sidebar-accent-foreground'
								: sectionActive
									? 'text-foreground hover:bg-sidebar-accent/60'
									: 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
						)}
					>
						<Icon name={entry.icon} size={18} />
						<span class="flex-1 truncate">{entry.label}</span>

						{#if entry.base === '/notifications'}
							{#if status.unreadErrorCount > 0}
								<!-- Unread *error* notifications: red count badge. -->
								<span
									class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground"
								>
									{capCount(status.unreadErrorCount)}
								</span>
							{:else if status.unreadCount > 0}
								<!-- Other unread notifications: just a blue "new" dot, no count. -->
								<span class="h-2.5 w-2.5 rounded-full bg-info"></span>
							{/if}
						{:else if mainSeverity}
							<span class={cn('h-2.5 w-2.5 rounded-full', dotClass(mainSeverity))}></span>
						{/if}
					</a>

					{#if entry.subItems && sectionActive}
						<div class="my-0.5 ml-5 flex flex-col gap-0.5 border-l border-sidebar-border pl-2">
							{#each entry.subItems as sub, si (si)}
								{#if isSeparator(sub)}
									<Separator class="my-1 bg-sidebar-border" />
								{:else}
									{@const subCurrent = pathname === sub.href}
									{@const subSeverity = severityForPage(services, sub.href)}
									<a
										href={sub.href}
										onclick={onNavigate}
										aria-current={subCurrent ? 'page' : undefined}
										class={cn(
											'flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors',
											subCurrent
												? 'bg-sidebar-accent/70 font-medium text-sidebar-accent-foreground'
												: 'text-muted-foreground hover:bg-sidebar-accent/40 hover:text-foreground'
										)}
									>
										<Icon name={sub.icon} size={16} />
										<span class="flex-1 truncate">{sub.label}</span>
										{#if subSeverity}
											<span class={cn('h-2 w-2 rounded-full', dotClass(subSeverity))}></span>
										{/if}
									</a>
								{/if}
							{/each}
						</div>
					{/if}
				{/if}
			{/if}
		{/each}

		<!-- Bottom: notices (connection-lost / settings-failed / ui-out-of-date / refresh /
		     remote-update) then the toggle. -->
		<div class="mt-auto flex flex-col gap-2 pt-3">
			{#if status.connectionLost}
				{#if collapsed}
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<div
									{...props}
									class="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-destructive/40 bg-destructive/10 text-destructive dark:text-red-300"
								>
									<Icon name="alert-triangle" size={18} />
								</div>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content side="right">
							Connection to Saberr lost. Trying to reconnect…
						</Tooltip.Content>
					</Tooltip.Root>
				{:else}
					<div
						class="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive dark:text-red-300"
					>
						<Icon name="alert-triangle" size={16} class="mt-0.5" />
						<span>Connection to Saberr lost. Trying to reconnect…</span>
					</div>
				{/if}
			{/if}

			{#if settings.loadFailed}
				{#if collapsed}
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<div
									{...props}
									class="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-destructive/40 bg-destructive/10 text-destructive dark:text-red-300"
								>
									<Icon name="alert-triangle" size={18} />
								</div>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content side="right">
							Your settings failed to load. Some things may behave unexpectedly.
						</Tooltip.Content>
					</Tooltip.Root>
				{:else}
					<div
						class="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive dark:text-red-300"
					>
						<Icon name="alert-triangle" size={16} class="mt-0.5" />
						<span>Your settings failed to load. Some things may behave unexpectedly.</span>
					</div>
				{/if}
			{/if}

			{#if status.uiOutOfDate}
				{#if collapsed}
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<button
									{...props}
									type="button"
									onclick={() => location.reload()}
									class="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-destructive/40 bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20 dark:text-red-300"
								>
									<Icon name="alert-triangle" size={18} />
								</button>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content side="right"
							>UI version out of date — refresh the page to avoid issues.</Tooltip.Content
						>
					</Tooltip.Root>
				{:else}
					<button
						type="button"
						onclick={() => location.reload()}
						class="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-left text-xs text-destructive transition-colors hover:bg-destructive/20 dark:text-red-300"
					>
						<Icon name="alert-triangle" size={16} class="mt-0.5" />
						<span
							>UI version out of date, <span class="font-medium underline">refresh</span> the page to
							avoid issues.</span
						>
					</button>
				{/if}
			{/if}

			{#if status.updateAvailable}
				{#if collapsed}
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<button
									{...props}
									type="button"
									onclick={() => location.reload()}
									class="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-brand/40 bg-brand/10 text-brand transition-colors hover:bg-brand/20"
								>
									<Icon name="upgrade" size={18} />
								</button>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content side="right"
							>A new version was installed. Refresh to update.</Tooltip.Content
						>
					</Tooltip.Root>
				{:else}
					<button
						type="button"
						onclick={() => location.reload()}
						class="flex items-start gap-2 rounded-md border border-brand/40 bg-brand/10 p-2.5 text-left text-xs text-foreground transition-colors hover:bg-brand/20"
					>
						<Icon name="upgrade" size={16} class="mt-0.5 text-brand" />
						<span
							>A new version was installed. <span class="font-medium underline">Refresh</span> to update.</span
						>
					</button>
				{/if}
			{/if}

			{#if status.remoteUpdateAvailable}
				{#if collapsed}
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<button
									{...props}
									type="button"
									onclick={goToAbout}
									class="mx-auto flex h-10 w-10 items-center justify-center rounded-md border border-success/40 bg-success/10 text-success transition-colors hover:bg-success/20"
								>
									<Icon name="upgrade" size={18} />
								</button>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content side="right">
							An update is available. Click to view details.
						</Tooltip.Content>
					</Tooltip.Root>
				{:else}
					<button
						type="button"
						onclick={goToAbout}
						class="flex items-start gap-2 rounded-md border border-success/40 bg-success/10 p-2.5 text-left text-xs text-foreground transition-colors hover:bg-success/20"
					>
						<Icon name="upgrade" size={16} class="mt-0.5 text-success" />
						<span
							>An update is available. <span class="font-medium underline">View details</span
							>.</span
						>
					</button>
				{/if}
			{/if}

			{#if showToggle}
				<Separator class="bg-sidebar-border" />

				{#if collapsed}
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<button
									{...props}
									type="button"
									onclick={() => sidebar.toggle()}
									class="mx-auto flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-foreground"
								>
									<Icon name="panel-left" size={18} />
								</button>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content side="right">Expand</Tooltip.Content>
					</Tooltip.Root>
				{:else}
					<button
						type="button"
						onclick={() => sidebar.toggle()}
						class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/50 hover:text-foreground"
					>
						<Icon name="panel-left" size={18} />
						<span class="flex-1 text-left">Collapse</span>
					</button>
				{/if}
			{/if}
		</div>
	</nav>
</Tooltip.Provider>
