<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import type { IconName } from '$lib/config/icons';

	interface Props {
		title: string;
		icon: IconName;
		subtitle?: string;
		/** Right-aligned header controls (e.g. a "Mark all as read" button). */
		actions?: Snippet;
	}

	let { title, icon, subtitle, actions }: Props = $props();
</script>

<div class="flex flex-col gap-4">
	<div>
		<div class="flex items-center gap-2.5">
			<Icon name={icon} size={17} class="shrink-0 text-muted-foreground" />
			<h1 class="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">{title}</h1>
			{#if actions}
				<div class="flex shrink-0 items-center gap-2">{@render actions()}</div>
			{/if}
		</div>
		{#if subtitle}
			<p class="mt-1 text-sm text-muted-foreground">{subtitle}</p>
		{/if}
	</div>

	<Separator class="h-px bg-border" />
</div>
