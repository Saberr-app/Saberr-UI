<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import { findParentOf } from '$lib/config/nav';
	import type { IconName } from '$lib/config/icons';

	interface Props {
		title: string;
		icon: IconName;
		/** Optional one-line description shown under the title. */
		description?: string;
	}

	let { title, icon, description }: Props = $props();

	// Subpages show a breadcrumb: "Parent > This page". Derived from the nav config.
	const parent = $derived(findParentOf(page.url.pathname));
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
		{#if description}
			<p class="mt-1 text-sm text-muted-foreground">{description}</p>
		{/if}
	</div>

	<div
		class="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-border p-8 text-sm text-muted-foreground"
	>
		Placeholder — “{title}” content is coming soon.
	</div>
</div>
