<script lang="ts">
	import type { CalendarEpisode } from '$lib/calendar/enrich';
	import { groupByDay } from '$lib/calendar/enrich';
	import {
		isSameMonth,
		isToday,
		localDateKey,
		weekdayLabels,
		weeksOfMonth
	} from '$lib/calendar/datetime';
	import { cn } from '$lib/utils';
	import EpisodeBar from './EpisodeBar.svelte';
	import EpisodePopover from './EpisodePopover.svelte';

	let {
		episodes,
		loading = false,
		anchor,
		firstDay,
		onDownloadStatus,
		onEditEntry,
		onTrack,
		onPickDay
	}: {
		episodes: CalendarEpisode[];
		loading?: boolean;
		anchor: Date;
		firstDay: number;
		onDownloadStatus: (ep: CalendarEpisode) => void;
		onEditEntry: (ep: CalendarEpisode) => void;
		onTrack: (ep: CalendarEpisode) => void;
		onPickDay: (day: Date) => void;
	} = $props();

	/** Visible lines per cell before collapsing into "+N more" (the Nth slot). */
	const CAP = 5;

	const weeks = $derived(weeksOfMonth(anchor, firstDay));
	const byDay = $derived(groupByDay(episodes));
	const dows = $derived(weekdayLabels(firstDay));

	// Per-week expansion; reset whenever the visible month/weeks change.
	let expanded = $state<boolean[]>([]);
	$effect(() => {
		if (weeks.length >= 0) expanded = [];
	});

	function epsFor(day: Date): CalendarEpisode[] {
		return byDay[localDateKey(day)] ?? [];
	}
	function toggleWeek(wi: number) {
		const next = [...expanded];
		next[wi] = !next[wi];
		expanded = next;
	}
</script>

<div class="overflow-x-auto">
	<div class="grid min-w-[1050px] grid-cols-7 gap-1">
		{#each dows as d (d)}
			<div
				class="pb-1 text-center text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase"
			>
				{d}
			</div>
		{/each}

		{#each weeks as week, wi (wi)}
			{#each week as day (day.getTime())}
				{@const eps = epsFor(day)}
				{@const isExpanded = expanded[wi] === true}
				{@const visible = isExpanded ? eps : eps.length > CAP ? eps.slice(0, CAP - 1) : eps}
				{@const overflow = eps.length - visible.length}
				{@const inMonth = isSameMonth(day, anchor)}
				<div class={cn('min-h-24 rounded-lg border border-border p-1.5', !inMonth && 'opacity-45')}>
					<button
						type="button"
						onclick={() => onPickDay(day)}
						class={cn(
							'mb-1 inline-flex min-w-5 justify-center rounded px-1 text-[0.7rem] font-semibold transition-colors hover:bg-muted',
							isToday(day) ? 'text-info' : 'text-muted-foreground'
						)}
					>
						{day.getDate()}
					</button>

					<div class="flex flex-col gap-0.5">
						{#if loading}
							{#if inMonth}
								{#each Array.from({ length: 2 }, (_, i) => i) as i (i)}
									<div class="h-4 animate-pulse rounded-sm bg-muted/40"></div>
								{/each}
							{/if}
						{:else}
							{#each visible as ep (ep.id)}
								<EpisodePopover
									episode={ep}
									overlap={false}
									{onDownloadStatus}
									{onEditEntry}
									{onTrack}
								>
									{#snippet trigger(props)}
										<EpisodeBar episode={ep} {...props} />
									{/snippet}
								</EpisodePopover>
							{/each}
							{#if !isExpanded && overflow > 0}
								<button
									type="button"
									onclick={() => toggleWeek(wi)}
									class="px-1 py-0.5 text-left text-[0.65rem] font-semibold text-muted-foreground transition-colors hover:text-foreground"
								>
									+{overflow} more
								</button>
							{:else if isExpanded && eps.length > CAP}
								<button
									type="button"
									onclick={() => toggleWeek(wi)}
									class="px-1 py-0.5 text-left text-[0.65rem] font-semibold text-muted-foreground transition-colors hover:text-foreground"
								>
									Show less
								</button>
							{/if}
						{/if}
					</div>
				</div>
			{/each}
		{/each}
	</div>
</div>
