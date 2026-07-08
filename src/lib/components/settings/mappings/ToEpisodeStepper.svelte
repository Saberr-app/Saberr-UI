<script lang="ts">
	/* "To episode" stepper where EMPTY = open-ended (∞) and is the floor. `+` from empty → 1;
	   `-` from 1 → empty; typing 0/blank → empty. Emits `null` for empty (sent as null to the API). */
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	let {
		value,
		onChange,
		ariaLabel,
		invalid = false,
		class: className,
		inputClass
	}: {
		value: number | null;
		onChange: (n: number | null) => void;
		ariaLabel?: string;
		invalid?: boolean;
		class?: string;
		inputClass?: string;
	} = $props();

	const display = $derived(value == null ? '' : String(value));
	const atFloor = $derived(value == null); // empty (∞) is the bottom

	// ∞ acts as the 0 floor; anything below 1 collapses back to ∞. Hold Ctrl/⌘ to step by 10.
	function bump(dir: 1 | -1, e?: MouseEvent) {
		const mult = e && (e.ctrlKey || e.metaKey) ? 10 : 1;
		const next = (value ?? 0) + dir * mult;
		onChange(next < 1 ? null : next);
	}

	function onInput(e: Event & { currentTarget: HTMLInputElement }) {
		const raw = e.currentTarget.value;
		if (raw === '') return onChange(null);
		const n = Number(raw);
		if (Number.isNaN(n)) return;
		onChange(n < 1 ? null : Math.round(n)); // 0 (or below) = ∞
	}
</script>

<div
	class={cn(
		'inline-flex h-9 w-fit items-stretch overflow-hidden rounded-md border border-input bg-background',
		invalid && 'border-destructive',
		className
	)}
>
	<button
		type="button"
		tabindex={-1}
		disabled={atFloor}
		onclick={(e) => bump(-1, e)}
		class="grid w-8 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
		aria-label="Decrease"
	>
		<Icon name="minus" size={15} />
	</button>
	<input
		type="number"
		min="0"
		inputmode="numeric"
		placeholder="∞"
		aria-label={ariaLabel}
		aria-invalid={invalid ? 'true' : undefined}
		value={display}
		oninput={onInput}
		class={cn(
			'no-spinner w-16 border-x border-input bg-transparent text-center text-sm tabular-nums outline-none focus-visible:bg-muted/40',
			inputClass
		)}
	/>
	<button
		type="button"
		tabindex={-1}
		onclick={(e) => bump(1, e)}
		class="grid w-8 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
		aria-label="Increase"
	>
		<Icon name="plus" size={15} />
	</button>
</div>
