<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	let {
		value,
		min = 0,
		max = null,
		step = 1,
		decimals = 0,
		emptyAtZero = false,
		nullable = false,
		invalid = false,
		placeholder = '—',
		ariaLabel,
		onChange,
		class: className,
		inputClass
	}: {
		value: number | null;
		min?: number;
		max?: number | null;
		step?: number;
		/** Decimal places to keep (POINT_10_DECIMAL scores use 1). */
		decimals?: number;
		/** Render an empty field when the value is 0 (e.g. an unset score). */
		emptyAtZero?: boolean;
		/** Allow an empty value (clearing the field emits `null` instead of `min`). */
		nullable?: boolean;
		/** Render a red (error) border — for a required field left empty. */
		invalid?: boolean;
		placeholder?: string;
		ariaLabel?: string;
		onChange: (n: number | null) => void;
		class?: string;
		/** Override the inner input width (e.g. `w-16` to fit 4 digits). */
		inputClass?: string;
	} = $props();

	function clamp(n: number): number {
		if (Number.isNaN(n)) n = min;
		n = Math.max(min, n);
		if (max != null) n = Math.min(max, n);
		const f = 10 ** decimals;
		return decimals > 0 ? Math.round(n * f) / f : Math.round(n);
	}

	const display = $derived(value == null || (emptyAtZero && value === 0) ? '' : String(value));
	const atMin = $derived(value != null && value <= min);
	const atMax = $derived(value != null && max != null && value >= max);

	// Hold Ctrl (or ⌘) while clicking to step by 10× (clamp still respects min/max).
	function bump(dir: 1 | -1, e?: MouseEvent) {
		const mult = e && (e.ctrlKey || e.metaKey) ? 10 : 1;
		onChange(clamp((value ?? min) + dir * step * mult));
	}
	function onInput(e: Event & { currentTarget: HTMLInputElement }) {
		const raw = e.currentTarget.value;
		if (raw === '') return onChange(nullable ? null : min);
		const n = Number(raw);
		if (!Number.isNaN(n)) onChange(clamp(n));
	}
</script>

<div
	class={cn(
		'inline-flex h-9 items-stretch overflow-hidden rounded-md border border-input bg-background',
		invalid && 'border-destructive',
		className
	)}
>
	<button
		type="button"
		tabindex={-1}
		disabled={atMin}
		onclick={(e) => bump(-1, e)}
		class="grid w-8 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
		aria-label="Decrease"
	>
		<Icon name="minus" size={15} />
	</button>
	<input
		type="number"
		{min}
		max={max ?? undefined}
		{step}
		inputmode={decimals > 0 ? 'decimal' : 'numeric'}
		{placeholder}
		aria-label={ariaLabel}
		aria-invalid={invalid ? 'true' : undefined}
		value={display}
		oninput={onInput}
		class={cn(
			'no-spinner w-12 border-x border-input bg-transparent text-center text-sm tabular-nums outline-none focus-visible:bg-muted/40',
			inputClass
		)}
	/>
	<button
		type="button"
		tabindex={-1}
		disabled={atMax}
		onclick={(e) => bump(1, e)}
		class="grid w-8 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
		aria-label="Increase"
	>
		<Icon name="plus" size={15} />
	</button>
</div>
