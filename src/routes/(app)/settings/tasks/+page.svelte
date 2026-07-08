<script lang="ts">
	import { onMount } from 'svelte';
	import SettingsPageShell from '$lib/components/settings/SettingsPageShell.svelte';
	import TaskCard from '$lib/components/tasks/TaskCard.svelte';
	import { tasks as tasksStore } from '$lib/stores/tasks.svelte';
	import type { Task } from '$lib/api/types';

	// Sorted by category, then task name; grouped into [category, tasks[]] preserving that order.
	const groups = $derived.by(() => {
		const sorted = [...tasksStore.tasks].sort(
			(a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
		);
		const map = new Map<string, Task[]>();
		for (const t of sorted) {
			const bucket = map.get(t.category);
			if (bucket) bucket.push(t);
			else map.set(t.category, [t]);
		}
		return [...map.entries()];
	});

	const loaded = $derived(tasksStore.loaded);
	const loadFailed = $derived(tasksStore.loadFailed);

	onMount(() => {
		tasksStore.start();
		return () => tasksStore.stop();
	});
</script>

<SettingsPageShell title="Tasks" icon="tasks">
	{#if !loaded && loadFailed}
		<p class="text-sm text-muted-foreground">
			Couldn't load tasks. Retrying… make sure the backend is reachable.
		</p>
	{:else if !loaded}
		<p class="text-sm text-muted-foreground">Loading tasks…</p>
	{:else if groups.length === 0}
		<p class="text-sm text-muted-foreground">No tasks to show.</p>
	{:else}
		<div class="flex flex-col gap-8">
			{#each groups as [category, items] (category)}
				<section class="flex flex-col gap-3">
					<h2 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
						{category}
					</h2>
					<div class="flex flex-col gap-3">
						{#each items as task (task.id)}
							<TaskCard {task} />
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
</SettingsPageShell>
