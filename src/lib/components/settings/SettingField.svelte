<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Label } from '$lib/components/ui/label';
	import { cn } from '$lib/utils';
	import HelpHint from './HelpHint.svelte';
	import InlineMarkup from './InlineMarkup.svelte';

	// A labelled settings row: label (+ optional help), the control, optional description + error.
	interface Props {
		label: string;
		/** Popup-help note (the "?" hint). May contain **bold** / `code`. */
		help?: string;
		/** Muted description under the control. May contain **bold** / `code`. */
		description?: string;
		/** Validation error message (shown in destructive color). */
		error?: string | null;
		/** Render the error only when true — lets a form defer reveal until a save attempt. */
		showError?: boolean;
		/** Mark the field required: a red asterisk after the label. */
		required?: boolean;
		/** id of the control, to wire the <label for>. */
		htmlFor?: string;
		/** Slightly larger label text. */
		largeLabel?: boolean;
		/** Extra space between the label and its content (e.g. under a `largeLabel` section header). */
		spaceContent?: boolean;
		/** Optional inline element after the label (e.g. a structuring badge). */
		badge?: Snippet;
		children: Snippet;
	}

	let {
		label,
		help,
		description,
		error,
		showError = true,
		required = false,
		htmlFor,
		largeLabel = false,
		spaceContent = false,
		badge,
		children
	}: Props = $props();
</script>

<div class="flex flex-col gap-1.5">
	<div class="flex items-center gap-1.5">
		<Label for={htmlFor} {required} class={cn('font-medium', largeLabel ? 'text-base' : 'text-sm')}>
			{label}
		</Label>
		{#if badge}{@render badge()}{/if}
		{#if help}
			<HelpHint text={help} />
		{/if}
	</div>

	{#if spaceContent}
		<div class="mt-2">{@render children()}</div>
	{:else}
		{@render children()}
	{/if}

	{#if description}
		<p class="text-xs text-muted-foreground"><InlineMarkup text={description} /></p>
	{/if}
	{#if error && showError}
		<p class="text-xs text-destructive">{error}</p>
	{/if}
</div>
