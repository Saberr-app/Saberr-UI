<script lang="ts">
	import { weekdayOptions } from '$lib/calendar/datetime';
	import {
		calendarFirstDay,
		calendarFilters,
		calendarShowAiringStatus,
		calendarShowDownloadStatus,
		calendarShowEpisodeMarkers
	} from '$lib/stores/calendar-prefs.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import Icon from '$lib/components/Icon.svelte';

	const options = weekdayOptions();
</script>

{#snippet toggleRow(label: string, checked: boolean, onToggle: () => void, onColor: string)}
	<button
		type="button"
		role="switch"
		aria-checked={checked}
		onclick={onToggle}
		class="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-muted"
	>
		<span>{label}</span>
		<span
			class="relative h-5 w-9 shrink-0 rounded-full transition-colors {checked
				? onColor
				: 'bg-muted-foreground/30'}"
		>
			<span
				class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform {checked
					? 'translate-x-4'
					: ''}"
			></span>
		</span>
	</button>
{/snippet}

<Popover.Root>
	<Popover.Trigger
		class="relative inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-expanded:bg-muted"
		aria-label="Calendar settings"
		title="Calendar settings"
	>
		<Icon name="settings" size={16} />
		{#if calendarFilters.premieresOnly}
			<span
				class="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-warning ring-2 ring-background"
			></span>
		{/if}
	</Popover.Trigger>

	<Popover.Content align="end" class="w-64 p-1">
		<div
			class="px-2 pt-2 pb-1 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase"
		>
			First day of the week
		</div>
		{#each options as opt (opt.value)}
			<button
				type="button"
				onclick={() => (calendarFirstDay.current = opt.value)}
				class="flex w-full items-center gap-2.5 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-muted"
			>
				<span class="flex-1">{opt.label}</span>
				{#if opt.value === calendarFirstDay.current}<Icon name="check" size={14} />{/if}
			</button>
		{/each}

		<div class="my-1 border-t border-border"></div>
		<div
			class="px-2 pt-1 pb-1 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase"
		>
			Indicators
		</div>
		{@render toggleRow(
			'Airing status indicator',
			calendarShowAiringStatus.current,
			() => (calendarShowAiringStatus.current = !calendarShowAiringStatus.current),
			'bg-info'
		)}
		{@render toggleRow(
			'Download status indicator',
			calendarShowDownloadStatus.current,
			() => (calendarShowDownloadStatus.current = !calendarShowDownloadStatus.current),
			'bg-info'
		)}
		{@render toggleRow(
			'First/final episode indicator',
			calendarShowEpisodeMarkers.current,
			() => (calendarShowEpisodeMarkers.current = !calendarShowEpisodeMarkers.current),
			'bg-info'
		)}

		<div class="my-1 border-t border-border"></div>
		<div
			class="px-2 pt-1 pb-1 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase"
		>
			Filters
		</div>
		{@render toggleRow(
			'Show premieres only',
			calendarFilters.premieresOnly,
			() => (calendarFilters.premieresOnly = !calendarFilters.premieresOnly),
			'bg-warning'
		)}
		<div class="h-1.5"></div>
	</Popover.Content>
</Popover.Root>
