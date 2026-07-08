<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/Icon.svelte';
	import {
		dismissBannerForMonth,
		isBannerDismissed,
		type TrackedBannerKey
	} from '$lib/tracked/banners';

	// Up to three advisory banners atop the tracked list. Each can be X'd (in-memory,
	// returns next reload) or "Don't show again" (persisted ~1 month). The actual
	// counts/visibility are decided by the page; we only own the dismissal + layout.
	let {
		notOnListCount,
		anilistConfigured,
		releasingWatchingCount,
		releasingPlanningCount,
		finishedCount,
		onShowNotOnList,
		onAddAllToWatching,
		onShowFinished,
		adding = false
	}: {
		notOnListCount: number;
		anilistConfigured: boolean;
		releasingWatchingCount: number;
		releasingPlanningCount: number;
		finishedCount: number;
		onShowNotOnList: () => void;
		onAddAllToWatching: () => void;
		onShowFinished: () => void;
		adding?: boolean;
	} = $props();

	const hidden = new SvelteSet<TrackedBannerKey>();
	const isDismissed = (key: TrackedBannerKey) => hidden.has(key) || isBannerDismissed(key);

	function close(key: TrackedBannerKey) {
		hidden.add(key);
	}
	function never(key: TrackedBannerKey) {
		dismissBannerForMonth(key);
		hidden.add(key);
	}

	const showNotOnList = $derived(
		anilistConfigured && notOnListCount > 0 && !isDismissed('not_on_list')
	);
	const showReleasing = $derived(
		(releasingWatchingCount > 0 || releasingPlanningCount > 0) && !isDismissed('releasing')
	);
	const showFinished = $derived(finishedCount > 0 && !isDismissed('finished'));
</script>

{#snippet dismissers(key: TrackedBannerKey)}
	<div class="flex items-center gap-1">
		<button
			type="button"
			onclick={() => never(key)}
			class="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
		>
			Don't show again
		</button>
		<button
			type="button"
			onclick={() => close(key)}
			aria-label="Dismiss"
			class="grid size-7 place-items-center rounded text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
		>
			<Icon name="close" size={15} />
		</button>
	</div>
{/snippet}

{#if showNotOnList || showReleasing || showFinished}
	<div class="mb-4 flex flex-col gap-2">
		{#if showNotOnList}
			<div
				class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-info/30 bg-info/5 px-3 py-2.5"
			>
				<Icon name="alert-triangle" size={16} class="shrink-0 text-info" />
				<p class="min-w-0 flex-1 text-sm">
					You're tracking <span class="font-semibold">{notOnListCount}</span>
					{notOnListCount === 1 ? 'anime' : 'anime'} that
					{notOnListCount === 1 ? "isn't" : "aren't"} on your AniList list.
				</p>
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={onShowNotOnList}
						class="rounded-md border border-info/40 px-2.5 py-1 text-xs font-medium text-info transition-colors hover:bg-info/10"
					>
						Show me
					</button>
					<button
						type="button"
						onclick={onAddAllToWatching}
						disabled={adding}
						class="inline-flex items-center gap-1.5 rounded-md bg-info-strong px-2.5 py-1 text-xs font-medium text-white transition hover:brightness-110 disabled:opacity-60"
					>
						{#if adding}<Icon name="spinner" size={13} class="animate-spin" />{/if}
						Add all to watching
					</button>
					{@render dismissers('not_on_list')}
				</div>
			</div>
		{/if}

		{#if showReleasing}
			<div
				class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2.5"
			>
				<Icon name="rss" size={16} class="shrink-0 text-success" />
				<p class="min-w-0 flex-1 text-sm">
					You have releasing anime on your list that you aren't tracking yet.
				</p>
				<div class="flex flex-wrap items-center gap-2">
					{#if releasingWatchingCount > 0}
						<button
							type="button"
							onclick={() => goto('/list?tab=watching&tracked=false')}
							class="rounded-md border border-success/40 px-2.5 py-1 text-xs font-medium text-success transition-colors hover:bg-success/10"
						>
							Watching ({releasingWatchingCount})
						</button>
					{/if}
					{#if releasingPlanningCount > 0}
						<button
							type="button"
							onclick={() => goto('/list?tab=planned&tracked=false')}
							class="rounded-md border border-success/40 px-2.5 py-1 text-xs font-medium text-success transition-colors hover:bg-success/10"
						>
							Plan to watch ({releasingPlanningCount})
						</button>
					{/if}
					{@render dismissers('releasing')}
				</div>
			</div>
		{/if}

		{#if showFinished}
			<div
				class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5"
			>
				<Icon name="completed" size={16} class="shrink-0 text-muted-foreground" />
				<p class="min-w-0 flex-1 text-sm">
					<span class="font-semibold">{finishedCount}</span>
					tracked {finishedCount === 1 ? 'anime has' : 'anime have'} finished airing.
				</p>
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={onShowFinished}
						class="rounded-md border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-background/60"
					>
						Show me
					</button>
					{@render dismissers('finished')}
				</div>
			</div>
		{/if}
	</div>
{/if}
