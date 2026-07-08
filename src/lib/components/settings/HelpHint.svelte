<script lang="ts">
	import * as Popover from '$lib/components/ui/popover';
	import Icon from '$lib/components/Icon.svelte';
	import InlineMarkup from './InlineMarkup.svelte';

	// "Popup help": a small ? that reveals a note on click (works on touch + mouse).
	// The note may contain **bold** / `code`, rendered via InlineMarkup.
	let { text }: { text: string } = $props();
</script>

<Popover.Root>
	<Popover.Trigger
		class="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
		aria-label="Help"
	>
		<Icon name="help" size={14} />
	</Popover.Trigger>
	<Popover.Content class="max-w-xs" side="top">
		<p class="text-sm leading-relaxed"><InlineMarkup {text} /></p>
	</Popover.Content>
</Popover.Root>
