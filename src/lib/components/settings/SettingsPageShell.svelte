<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { beforeNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import { findParentOf, findNavSubItem } from '$lib/config/nav';
	import type { IconName } from '$lib/config/icons';

	interface Props {
		title: string;
		icon: IconName;
		/** Defaults to the subtitle defined for this route in nav.ts. */
		subtitle?: string;
		/** When true, guard against leaving with unsaved changes. */
		dirty?: boolean;
		/** Width constraint for the content column. Defaults to the settings `max-w-2xl`;
		 *  pass e.g. `w-full` for a page that centers its own content. */
		contentClass?: string;
		/** Optional content above the subtitle (e.g. a service status banner). */
		banner?: Snippet;
		children: Snippet;
	}

	let {
		title,
		icon,
		subtitle,
		dirty = false,
		contentClass = 'max-w-2xl',
		banner,
		children
	}: Props = $props();

	const parent = $derived(findParentOf(page.url.pathname));
	const resolvedSubtitle = $derived(subtitle ?? findNavSubItem(page.url.pathname)?.subtitle);

	const UNSAVED_MESSAGE = 'You have unsaved changes. Leave without saving?';

	// In-app navigation: confirm before discarding unsaved edits.
	beforeNavigate((nav) => {
		if (dirty && nav.to?.url.pathname !== page.url.pathname) {
			if (!confirm(UNSAVED_MESSAGE)) nav.cancel();
		}
	});

	// Hard unload (refresh/close/external): trigger the native browser prompt.
	onMount(() => {
		const handler = (e: BeforeUnloadEvent) => {
			if (!dirty) return;
			e.preventDefault();
			e.returnValue = '';
		};
		window.addEventListener('beforeunload', handler);
		return () => window.removeEventListener('beforeunload', handler);
	});
</script>

<div class="flex flex-col gap-4">
	<div>
		<div class="flex items-center gap-2.5">
			<Icon name={icon} size={17} class="shrink-0 text-muted-foreground" />
			{#if parent}
				<nav
					class="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 text-lg tracking-tight"
					aria-label="Breadcrumb"
				>
					<a
						href={parent.href}
						class="font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						{parent.label}
					</a>
					<Icon name="chevron-right" size={16} class="text-muted-foreground" />
					<span class="font-semibold">{title}</span>
				</nav>
			{:else}
				<h1 class="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">{title}</h1>
			{/if}
		</div>
		{#if resolvedSubtitle}
			<p class="mt-1 text-sm text-muted-foreground">{resolvedSubtitle}</p>
		{/if}
	</div>

	<Separator class="h-px bg-border" />

	<!-- Banner lives inside the content wrapper so an empty one (e.g. a healthy
	     service status that renders nothing) adds no extra spacing. -->
	<div class={contentClass}>
		{#if banner}{@render banner()}{/if}
		{@render children()}
	</div>
</div>
