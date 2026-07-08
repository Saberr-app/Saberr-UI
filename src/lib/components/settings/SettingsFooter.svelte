<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';
	import { sidebar } from '$lib/stores/sidebar.svelte';

	// Per-section footer: Save (affirmative) + optional "Reset Defaults" link. Save spins while the
	// PUT is in flight; a failed save keeps the section dirty (client toasts).
	interface Props {
		onSave: () => void | Promise<void>;
		/** Omit to hide the Reset Defaults link (e.g. AniList has nothing to reset). */
		onReset?: () => void;
		/** True when there are unsaved changes in this section. */
		dirty?: boolean;
		/** Form validity. Save stays clickable when false — it calls `onInvalid` (reveal errors) instead of saving. */
		valid?: boolean;
		/** Called when Save is clicked while invalid (e.g. mark fields + scroll to first). */
		onInvalid?: () => void;
		saveLabel?: string;
		resetLabel?: string;
	}

	let {
		onSave,
		onReset,
		dirty = false,
		valid = true,
		onInvalid,
		saveLabel = 'Save',
		resetLabel = 'Reset Defaults'
	}: Props = $props();

	let saving = $state(false);

	async function handleSave() {
		if (saving) return;
		// Invalid → reveal errors without entering the saving state (no spinner flash).
		if (!valid) {
			onInvalid?.();
			return;
		}
		saving = true;
		try {
			await onSave();
		} catch {
			/* failures are surfaced by the HTTP client; keep the section dirty */
		} finally {
			saving = false;
		}
	}
</script>

<!-- In-flow spacer reserves scroll room so the last field clears the fixed bar below. -->
<div aria-hidden="true" class="h-20"></div>

<!-- Fixed action bar: spans the main content area (offset past the desktop sidebar, which it tracks
     via `sidebar.collapsed`), pinned to the viewport bottom so Save/Reset are always reachable. The
     lifted `bg-card` + top border/shadow set it apart from the page surface. -->
<div
	class={cn(
		'fixed right-0 bottom-0 left-0 z-20 border-t border-border bg-card transition-[left] duration-200 ease-out',
		sidebar.collapsed ? 'lg:left-15' : 'lg:left-58'
	)}
>
	<!-- Soft shadow fading upward from the bar into the page, hinting content scrolls beneath. -->
	<div
		aria-hidden="true"
		class="pointer-events-none absolute inset-x-0 bottom-full h-4 bg-gradient-to-t from-black/10 to-transparent dark:from-black/30"
	></div>
	<div class="flex items-center gap-5 px-4 py-3 sm:px-6">
		<Button
			type="button"
			variant="affirmative"
			size="lg"
			class="h-11 px-7 text-base"
			onclick={handleSave}
			disabled={!dirty || saving}
		>
			{#if saving}<Icon name="spinner" size={16} class="animate-spin" />{/if}
			{saveLabel}
		</Button>
		{#if onReset}
			<button
				type="button"
				onclick={onReset}
				class="text-base text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
			>
				{resetLabel}
			</button>
		{/if}
	</div>
</div>
