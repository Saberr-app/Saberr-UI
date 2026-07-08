<script lang="ts">
	import * as Popover from '$lib/components/ui/popover';
	import Icon from '$lib/components/Icon.svelte';
	import StructuringBadge from './StructuringBadge.svelte';
	import { TVDB_STRUCTURE_PREVIEW, ANILIST_STRUCTURE_PREVIEW } from '$lib/config/format-sample';

	// A small "?" that reveals a sample folder/file tree for the given structuring
	// mode — the same previews shown under the Processing page's structuring radio.
	let { type }: { type: 'tvdb' | 'anilist' } = $props();

	const preview = $derived(type === 'tvdb' ? TVDB_STRUCTURE_PREVIEW : ANILIST_STRUCTURE_PREVIEW);
</script>

<Popover.Root>
	<Popover.Trigger
		class="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
		aria-label="Preview structure"
	>
		<Icon name="help" size={14} />
	</Popover.Trigger>
	<Popover.Content class="w-auto max-w-sm" side="top">
		<div class="mb-2 flex items-center gap-2">
			<StructuringBadge {type} />
			<span class="text-xs font-medium text-muted-foreground">Example structure</span>
		</div>
		<pre
			class="overflow-x-auto font-mono text-xs leading-relaxed whitespace-pre text-foreground">{preview}</pre>
	</Popover.Content>
</Popover.Root>
