<script lang="ts">
	import { untrack } from 'svelte';
	import type { CalendarView } from '$lib/api/schedule';
	import {
		isSameDay,
		isSameMonth,
		isToday,
		periodLabel,
		startOfMonth,
		stepPeriod,
		weekdayLabels,
		weeksOfMonth
	} from '$lib/calendar/datetime';
	import * as Popover from '$lib/components/ui/popover';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	let {
		view,
		anchor,
		firstDay,
		onAnchor
	}: {
		view: CalendarView;
		anchor: Date;
		firstDay: number;
		onAnchor: (d: Date) => void;
	} = $props();

	let open = $state(false);
	// The month the popover grid is showing (independent of the live anchor).
	let pickerMonth = $state(untrack(() => startOfMonth(anchor)));

	const label = $derived(periodLabel(view, anchor, firstDay));
	const dows = $derived(weekdayLabels(firstDay));
	const weeks = $derived(weeksOfMonth(pickerMonth, firstDay));
	const monthLabel = $derived(
		new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(pickerMonth)
	);

	function step(dir: -1 | 1) {
		onAnchor(stepPeriod(view, anchor, dir));
	}
	function stepPickerMonth(dir: -1 | 1) {
		pickerMonth = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + dir, 1);
	}
	function choose(d: Date) {
		onAnchor(d);
		open = false;
	}
</script>

<div
	class="inline-flex items-stretch overflow-hidden rounded-lg border border-border bg-background shadow-sm"
>
	<button
		type="button"
		onclick={() => step(-1)}
		class="flex items-center px-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
		aria-label="Previous {view}"
	>
		<Icon name="chevron-left" size={16} />
	</button>

	<Popover.Root bind:open onOpenChange={(o) => o && (pickerMonth = startOfMonth(anchor))}>
		<Popover.Trigger
			class="min-w-32 border-x border-border px-3 py-1.5 text-center text-sm font-semibold transition-colors hover:bg-muted"
		>
			{label}
		</Popover.Trigger>
		<Popover.Content class="w-72 p-3" align="center">
			<div class="mb-2 flex items-center justify-between">
				<button
					type="button"
					onclick={() => stepPickerMonth(-1)}
					class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
					aria-label="Previous month"
				>
					<Icon name="chevron-left" size={16} />
				</button>
				<span class="text-sm font-semibold">{monthLabel}</span>
				<button
					type="button"
					onclick={() => stepPickerMonth(1)}
					class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
					aria-label="Next month"
				>
					<Icon name="chevron-right" size={16} />
				</button>
			</div>

			<div class="grid grid-cols-7 gap-0.5 text-center">
				{#each dows as d (d)}
					<span
						class="py-1 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase"
						>{d}</span
					>
				{/each}
				{#each weeks as week, wi (wi)}
					{#each week as day (day.getTime())}
						<button
							type="button"
							onclick={() => choose(day)}
							class={cn(
								'aspect-square rounded-md text-sm transition-colors hover:bg-muted',
								!isSameMonth(day, pickerMonth) && 'text-muted-foreground/40',
								isToday(day) && 'font-bold text-info',
								isSameDay(day, anchor) &&
									'bg-brand-light/15 font-semibold text-foreground ring-1 ring-brand/40'
							)}
						>
							{day.getDate()}
						</button>
					{/each}
				{/each}
			</div>
		</Popover.Content>
	</Popover.Root>

	<button
		type="button"
		onclick={() => step(1)}
		class="flex items-center px-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
		aria-label="Next {view}"
	>
		<Icon name="chevron-right" size={16} />
	</button>
</div>
