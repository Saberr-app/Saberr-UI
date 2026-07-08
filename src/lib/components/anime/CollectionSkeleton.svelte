<script lang="ts">
	import type { ViewMode } from '$lib/anilist/view';

	let { view = 'card', count = 5 }: { view?: ViewMode; count?: number } = $props();
	const items = $derived(Array.from({ length: count }, (_, i) => i));
</script>

{#if view === 'poster'}
	<div
		class="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8"
	>
		{#each items as i (i)}
			<div>
				<div class="skeleton aspect-[2/3] w-full rounded-lg"></div>
				<div class="skeleton mt-1.5 h-3 w-3/4 rounded"></div>
				<div class="skeleton mt-1 h-2.5 w-1/3 rounded"></div>
			</div>
		{/each}
	</div>
{:else if view === 'mega'}
	<div class="grid gap-3 lg:grid-cols-2">
		{#each items as i (i)}
			<div class="flex gap-4 rounded-xl border border-border bg-card p-4">
				<div class="skeleton aspect-[2/3] w-28 shrink-0 rounded-lg sm:w-36"></div>
				<div class="flex-1 space-y-2 py-1">
					<div class="skeleton h-5 w-3/4 rounded"></div>
					<div class="skeleton h-3 w-1/2 rounded"></div>
					<div class="skeleton mt-2 h-3 w-full rounded"></div>
					<div class="skeleton h-3 w-full rounded"></div>
					<div class="skeleton h-3 w-2/3 rounded"></div>
					<div class="skeleton mt-3 h-4 w-1/2 rounded-full"></div>
				</div>
			</div>
		{/each}
	</div>
{:else if view === 'card'}
	<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
		{#each items as i (i)}
			<div class="flex gap-3 rounded-xl border border-border bg-card p-2.5">
				<div class="skeleton aspect-[2/3] w-[4.75rem] shrink-0 rounded-lg"></div>
				<div class="flex-1 space-y-2 py-1">
					<div class="skeleton h-4 w-3/4 rounded"></div>
					<div class="skeleton h-3 w-1/2 rounded"></div>
					<div class="skeleton h-3 w-2/3 rounded"></div>
					<div class="skeleton mt-3 h-3 w-1/3 rounded"></div>
				</div>
			</div>
		{/each}
	</div>
{:else}
	<div class="divide-y divide-border/60 rounded-xl border border-border">
		{#each items as i (i)}
			<div class="flex items-center gap-3 p-3">
				{#if view === 'list'}
					<div class="skeleton h-8 w-8 shrink-0 rounded"></div>
				{/if}
				<div class="skeleton h-4 flex-1 rounded"></div>
				<div class="skeleton h-4 w-16 rounded"></div>
				<div class="skeleton h-4 w-12 rounded"></div>
			</div>
		{/each}
	</div>
{/if}
