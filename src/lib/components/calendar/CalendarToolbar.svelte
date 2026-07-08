<script lang="ts">
	import type { CalendarView } from '$lib/api/schedule';
	import {
		calendarCardSize,
		calendarFirstDay,
		calendarScope,
		calendarSort,
		calendarView,
		type CalendarSort,
		type CardSize
	} from '$lib/stores/calendar-prefs.svelte';
	import { isToday } from '$lib/calendar/datetime';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';
	import PeriodNavigator from './PeriodNavigator.svelte';
	import ScopeMenu from './ScopeMenu.svelte';
	import CalendarSettingsMenu from './CalendarSettingsMenu.svelte';

	let {
		anchor,
		loading = false,
		onAnchor,
		onRefresh
	}: {
		anchor: Date;
		loading?: boolean;
		onAnchor: (d: Date) => void;
		/** Force refresh (manual button). */
		onRefresh: () => void;
	} = $props();

	const VIEWS: { v: CalendarView; label: string }[] = [
		{ v: 'day', label: 'Day' },
		{ v: 'week', label: 'Week' },
		{ v: 'month', label: 'Month' }
	];
	const SIZES: { v: CardSize; label: string }[] = [
		{ v: 'full', label: 'Full' },
		{ v: 'compact', label: 'Compact' }
	];
	const SORTS: { v: CalendarSort; label: string }[] = [
		{ v: 'airing', label: 'Airing time' },
		{ v: 'popularity', label: 'Popularity' }
	];

	const atToday = $derived(isToday(anchor));
	const sortLabel = $derived(
		SORTS.find((s) => s.v === calendarSort.current)?.label ?? 'Airing time'
	);
</script>

<div class="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start">
	<!-- Row 1 (mobile): period nav + Today -->
	<div class="flex items-center justify-center gap-2.5">
		<PeriodNavigator
			view={calendarView.current}
			{anchor}
			firstDay={calendarFirstDay.current}
			{onAnchor}
		/>

		<button
			type="button"
			onclick={() => onAnchor(new Date())}
			disabled={atToday}
			class="h-9 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
		>
			Today
		</button>
	</div>

	<!-- Row 2 (mobile): view + card size. Desktop reverses so card size sits LEFT of view. -->
	<div class="flex items-center justify-center gap-2.5 sm:ml-auto sm:flex-row-reverse">
		<!-- view switcher -->
		<div class="inline-flex rounded-lg border border-border p-0.5">
			{#each VIEWS as v (v.v)}
				<button
					type="button"
					onclick={() => (calendarView.current = v.v)}
					class={cn(
						'rounded-md px-3 py-1 text-sm font-medium transition-colors',
						calendarView.current === v.v
							? 'bg-muted text-foreground'
							: 'text-muted-foreground hover:text-foreground'
					)}
				>
					{v.label}
				</button>
			{/each}
		</div>

		<!-- card size (day/week only; rendering-only, no refetch) -->
		{#if calendarView.current !== 'month'}
			<div class="inline-flex rounded-lg border border-border p-0.5">
				{#each SIZES as s (s.v)}
					<button
						type="button"
						onclick={() => (calendarCardSize.current = s.v)}
						class={cn(
							'rounded-md px-3 py-1 text-sm font-medium transition-colors',
							calendarCardSize.current === s.v
								? 'bg-muted text-foreground'
								: 'text-muted-foreground hover:text-foreground'
						)}
					>
						{s.label}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Row 3 (mobile): sort + scope + first day + refresh -->
	<div class="flex flex-wrap items-center justify-center gap-2.5">
		<!-- sort (client-side; direction fixed) -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
			>
				<Icon name="arrow-down-up" size={15} />
				<span>{sortLabel}</span>
				<Icon name="chevron-down" size={14} />
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-44">
				<DropdownMenu.Label>Sort by</DropdownMenu.Label>
				<DropdownMenu.Separator />
				{#each SORTS as s (s.v)}
					<DropdownMenu.Item onSelect={() => (calendarSort.current = s.v)}>
						<span class="flex-1">{s.label}</span>
						{#if calendarSort.current === s.v}<Icon name="check" size={14} />{/if}
					</DropdownMenu.Item>
				{/each}
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<ScopeMenu bind:selected={calendarScope.current} />

		<CalendarSettingsMenu />

		<button
			type="button"
			onclick={onRefresh}
			class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-br from-brand-light to-brand px-3 text-sm font-medium text-white transition-[filter] hover:brightness-110"
		>
			<Icon name="refresh" size={15} class={cn(loading && 'animate-spin')} />
			<span class="hidden sm:inline">Force refresh</span>
		</button>
	</div>
</div>
