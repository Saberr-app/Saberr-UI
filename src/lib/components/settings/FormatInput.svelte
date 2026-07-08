<script lang="ts" module>
	/** All `{code}` token codes referenced in a format string. */
	export function extractTokenCodes(value: string): string[] {
		return [...value.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]);
	}

	/** True if the format references a `{token}` not in the allowed set. */
	export function hasUnknownToken(value: string, tokens: Record<string, string>): boolean {
		const known = new Set(Object.values(tokens));
		return extractTokenCodes(value).some((code) => !known.has(code));
	}

	/** Render a format with sample values substituted for known tokens. */
	export function renderFormatPreview(value: string, samples: Record<string, string>): string {
		return value.replace(/\{([^{}]*)\}/g, (whole, code) => samples[code] ?? whole);
	}
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import type { FormattingTokens } from '$lib/api/types';
	import { SAMPLE_TOKEN_VALUES } from '$lib/config/format-sample';
	import { cn } from '$lib/utils';

	// Free-text filename-format field; tokens stored inline as `{code}`. The token pool below inserts
	// at the caret; unrecognized `{tokens}` flag red; a live sample preview shows below.
	interface Props {
		value: string;
		onChange: (next: string) => void;
		/** Display-name -> code map of the tokens available for this field. */
		tokens: FormattingTokens;
		disabled?: boolean;
		/** Required field: an empty value is invalid (backend minLength=1). */
		required?: boolean;
		/** Reveal the invalid-token error styling. False defers it until a save attempt. */
		showError?: boolean;
		/** Sample values used for the live preview (override per field if needed). */
		samples?: Record<string, string>;
	}

	const MAX = 150;

	let {
		value,
		onChange,
		tokens,
		disabled = false,
		required = false,
		showError = true,
		samples = SAMPLE_TOKEN_VALUES
	}: Props = $props();

	let inputEl = $state<HTMLInputElement | null>(null);
	const overLimit = $derived(value.length > MAX);
	const unknownToken = $derived(hasUnknownToken(value, tokens));
	const missing = $derived(required && value.trim() === '');
	const invalid = $derived(unknownToken || missing);
	// The error is only surfaced once the form allows it (showError).
	const showInvalid = $derived(invalid && showError);
	const preview = $derived(renderFormatPreview(value, samples));

	function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
		onChange(e.currentTarget.value);
	}

	async function insertToken(code: string) {
		const el = inputEl;
		const token = `{${code}}`;
		const start = el?.selectionStart ?? value.length;
		const end = el?.selectionEnd ?? start;
		const next = value.slice(0, start) + token + value.slice(end);
		onChange(next);
		// Restore focus and place the caret right after the inserted token.
		await tick();
		if (el) {
			el.focus();
			const pos = start + token.length;
			el.setSelectionRange(pos, pos);
		}
	}
</script>

<div class="flex flex-col gap-2">
	<input
		bind:this={inputEl}
		{value}
		oninput={handleInput}
		{disabled}
		spellcheck="false"
		autocomplete="off"
		aria-invalid={showInvalid ? 'true' : undefined}
		class={cn(
			'h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-sm',
			'focus-visible:border-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:outline-none',
			'disabled:cursor-not-allowed disabled:opacity-60',
			showInvalid && 'border-destructive text-destructive focus-visible:border-destructive'
		)}
	/>

	<div class={cn('flex flex-wrap gap-1.5', disabled && 'pointer-events-none opacity-60')}>
		{#each Object.entries(tokens) as [name, code] (code)}
			<button
				type="button"
				onclick={() => insertToken(code)}
				{disabled}
				title={`{${code}}`}
				class="rounded-md border border-border bg-secondary px-2 py-1 text-xs text-foreground transition-colors hover:bg-sidebar-accent"
			>
				{name}
			</button>
		{/each}
	</div>

	{#if showInvalid}
		{#if missing}
			<p class="text-xs text-destructive">This field is required.</p>
		{:else}
			<p class="text-xs text-destructive">Unrecognized token — only use the tokens listed above.</p>
		{/if}
	{:else if value}
		<p class="text-sm">
			<span class="text-muted-foreground">Preview:&nbsp;</span><span class="font-bold"
				>{preview}</span
			>
		</p>
	{/if}

	{#if overLimit}
		<p class="text-xs text-warning">A long filename might cause issues while importing.</p>
	{/if}
</div>
