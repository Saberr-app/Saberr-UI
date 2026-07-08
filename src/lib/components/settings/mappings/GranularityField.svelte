<script lang="ts">
	/* Granularity stepper. Unlike NumberStepper it must SKIP the 0/-1 hole (valid = ≥1 or ≤-2),
	   so it bumps via `nextGranularity` and snaps typed 0/-1. Live preview sentence underneath. */
	import Icon from '$lib/components/Icon.svelte';
	import { nextGranularity, snapGranularity, granularityPreview } from '$lib/mappings/overrides';
	import { cn } from '$lib/utils';

	let { value, onChange }: { value: number; onChange: (n: number) => void } = $props();

	// Single step jumps the 0/-1 hole via `nextGranularity`; Ctrl/⌘ steps by 10, then snaps off the hole.
	function bump(dir: 1 | -1, e: MouseEvent) {
		onChange(
			e.ctrlKey || e.metaKey ? snapGranularity(value + dir * 10) : nextGranularity(value, dir)
		);
	}

	function onInput(e: Event & { currentTarget: HTMLInputElement }) {
		const raw = e.currentTarget.value;
		if (raw === '' || raw === '-') return;
		const n = Number(raw);
		if (!Number.isNaN(n)) onChange(snapGranularity(n));
	}
</script>

<div class="flex flex-col gap-2">
	<div
		class={cn(
			'inline-flex h-9 w-fit items-stretch overflow-hidden rounded-md border border-input bg-background'
		)}
	>
		<button
			type="button"
			tabindex={-1}
			onclick={(e) => bump(-1, e)}
			class="grid w-8 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
			aria-label="Decrease granularity"
		>
			<Icon name="minus" size={15} />
		</button>
		<input
			type="number"
			inputmode="numeric"
			aria-label="Granularity"
			value={String(value)}
			oninput={onInput}
			class="no-spinner w-16 border-x border-input bg-transparent text-center text-sm tabular-nums outline-none focus-visible:bg-muted/40"
		/>
		<button
			type="button"
			tabindex={-1}
			onclick={(e) => bump(1, e)}
			class="grid w-8 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
			aria-label="Increase granularity"
		>
			<Icon name="plus" size={15} />
		</button>
	</div>
	<p class="text-[13px] text-muted-foreground">{granularityPreview(value)}</p>
</div>
