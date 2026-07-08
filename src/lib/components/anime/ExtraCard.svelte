<script lang="ts">
	import type { AnilistAnimeUserStatus } from '$lib/api/types';
	import { WATCH_STATUS_ACCENT } from '$lib/anilist/colors';
	import { ANILIST_STATUS_LABELS } from '$lib/anilist/entry';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';
	import { resolveBackendUrl } from '$lib/config/api';

	let {
		image,
		title,
		attribute = null,
		topTag = null,
		status = null,
		href = null,
		external = false,
		reserveTitle = false,
		class: className
	}: {
		image: string | null;
		title: string | null;
		/** Text shown over the bottom fade (relation type / role). */
		attribute?: string | null;
		/** Small chip at the top-left (e.g. relation format). */
		topTag?: string | null;
		/** The user's watch status — a colored dot at the bottom-right (null = hidden). */
		status?: AnilistAnimeUserStatus | null;
		href?: string | null;
		/** Open `href` in a new tab (characters / staff) vs in-app nav (relations). */
		external?: boolean;
		/** Always reserve 2 title lines so siblings below stay aligned (cast row). */
		reserveTitle?: boolean;
		class?: string;
	} = $props();

	const imageSrc = $derived(resolveBackendUrl(image));
</script>

<svelte:element
	this={href ? 'a' : 'div'}
	href={href ?? undefined}
	target={href && external ? '_blank' : undefined}
	rel={href && external ? 'noopener noreferrer' : undefined}
	class={cn('group block', href && 'cursor-pointer', className ?? 'w-24 shrink-0 sm:w-28')}
>
	<div
		class="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted ring-1 ring-border transition-all group-hover:ring-2"
	>
		{#if imageSrc}
			<img
				src={imageSrc}
				alt={title ?? ''}
				loading="lazy"
				class="h-full w-full object-cover transition-transform group-hover:scale-105"
			/>
		{:else}
			<div class="grid h-full w-full place-items-center text-muted-foreground/40">
				<Icon name="help" size={32} />
			</div>
		{/if}

		{#if topTag}
			<span
				class="absolute top-1 left-1 rounded-md bg-background/85 px-1.5 py-0.5 text-[0.6rem] font-semibold text-foreground shadow-sm backdrop-blur"
			>
				{topTag}
			</span>
		{/if}

		{#if attribute}
			<div
				class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-1.5 pt-5 pb-1.5"
			>
				<span class="line-clamp-2 text-[0.65rem] leading-tight font-semibold text-white">
					{attribute}
				</span>
			</div>
		{/if}

		{#if status}
			<span
				class={cn(
					'absolute right-1 bottom-1 size-2.5 rounded-full ring-2 ring-background',
					WATCH_STATUS_ACCENT[status].dot
				)}
				title={ANILIST_STATUS_LABELS[status] ?? status}
			></span>
		{/if}
	</div>

	{#if title}
		<p
			class={cn(
				'mt-1 line-clamp-2 text-xs leading-snug font-medium break-words',
				reserveTitle && 'min-h-[2lh]'
			)}
		>
			{title}
		</p>
	{/if}
</svelte:element>
