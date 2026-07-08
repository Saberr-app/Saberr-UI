<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import RelativeTime from '$lib/components/RelativeTime.svelte';
	import { Button } from '$lib/components/ui/button';
	import { triggerTask } from '$lib/api/tasks';
	import { notifyError, notifyInfo } from '$lib/api/notify';
	import { formatFrequency, formatDuration, formatElapsedSince } from '$lib/utils/time';
	import { clock } from '$lib/stores/clock.svelte';
	import type { Task } from '$lib/api/types';

	let { task }: { task: Task } = $props();

	// The list no longer polls (it streams), so lean on the shared minute clock to
	// keep "Running (Xm)" live between task-change events.
	onMount(() => clock.start());

	let triggering = $state(false);

	async function trigger() {
		if (triggering || task.currently_running) return;
		triggering = true;
		try {
			const result = await triggerTask(task.id);
			if (result === 'queued') notifyInfo('Task queued');
			else notifyInfo('Task is already running');
		} catch {
			notifyError('Could not trigger the task. Please try again.');
		} finally {
			triggering = false;
		}
	}
</script>

<div class="flex flex-col gap-3 rounded-xl border bg-card p-4">
	<div class="flex items-start gap-3">
		<Button
			size="icon"
			class="size-9 shrink-0 rounded-full"
			disabled={triggering || task.currently_running}
			aria-label={`Run ${task.name}`}
			onclick={trigger}
		>
			<Icon
				name={triggering ? 'spinner' : 'play'}
				size={16}
				class={triggering ? 'animate-spin' : ''}
			/>
		</Button>

		<div class="min-w-0 flex-1">
			<p class="truncate font-medium">{task.name}</p>
			<p class="mt-0.5 text-sm text-muted-foreground">{formatFrequency(task.frequency)}</p>

			<!-- Bottom status line: "Running…" while active, else the last-run summary. -->
			{#if task.currently_running}
				<p class="mt-2 text-sm font-medium text-foreground">
					{#if task.currently_running_since}
						Running ({formatElapsedSince(task.currently_running_since, clock.tick)})
					{:else}
						Running…
					{/if}
				</p>
			{:else if task.last_run}
				{@const run = task.last_run}
				<p class="mt-2 text-sm text-muted-foreground">
					Last run <RelativeTime
						iso={run.run_time}
						coarseSubMinute
						refreshMs={10000}
					/>{#if !run.run_succeeded}<span class="text-warning">
							{' '}(failed{run.run_error ? `: ${run.run_error}` : ''})</span
						>{/if} · Took {formatDuration(run.run_duration)}
				</p>
			{/if}
		</div>
	</div>

	{#if task.currently_running}
		<div class="task-progress" aria-hidden="true">
			<div class="task-progress-bar"></div>
		</div>
	{/if}
</div>

<style>
	.task-progress {
		position: relative;
		height: 3px;
		overflow: hidden;
		border-radius: 9999px;
		background: var(--muted);
	}
	.task-progress-bar {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 40%;
		border-radius: inherit;
		background: linear-gradient(to right, var(--brand-light), var(--brand));
		animation: task-indeterminate 1.1s ease-in-out infinite;
	}
	@keyframes task-indeterminate {
		0% {
			left: -40%;
		}
		100% {
			left: 100%;
		}
	}
</style>
