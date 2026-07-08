<script lang="ts">
	import { slide } from 'svelte/transition';
	import Icon from '$lib/components/Icon.svelte';
	import RelativeTime from '$lib/components/RelativeTime.svelte';
	import { cn } from '$lib/utils';
	import { buildAuditText } from '$lib/audit/text';
	import InlineMarkup, { stripInlineMarkup } from '$lib/components/settings/InlineMarkup.svelte';
	import { buildAuditDetails } from '$lib/audit/details';
	import { humanizeEnum } from '$lib/audit/labels';
	import {
		CATEGORY_STYLE,
		CATEGORY_ICON,
		SENTIMENT_DOT,
		sentimentOf,
		eventLabel
	} from '$lib/audit/config';
	import type { AuditLogCategory, AuditLogItem } from '$lib/api/types';

	interface Props {
		item: AuditLogItem;
		/** Clicking the category chip sets it as the active category filter. */
		onfiltercategory: (category: AuditLogCategory) => void;
	}

	let { item, onfiltercategory }: Props = $props();

	const style = $derived(CATEGORY_STYLE[item.category]);
	const text = $derived(buildAuditText(item));
	const details = $derived(buildAuditDetails(item));
	const expandable = $derived(details.rows.length > 0 || details.links.length > 0);

	let open = $state(false);
	function toggle() {
		if (expandable) open = !open;
	}
	function onKeydown(e: KeyboardEvent) {
		// Ignore key events bubbling up from inner controls (e.g. the category button).
		if (!expandable || e.target !== e.currentTarget) return;
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			open = !open;
		}
	}

	function filterCategory(e: MouseEvent) {
		e.stopPropagation();
		onfiltercategory(item.category);
	}
</script>

{#snippet collapsed()}
	<div
		class="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 py-3 pr-3 pl-4 md:grid-cols-[140px_170px_200px_1fr_auto]"
	>
		<!-- Time -->
		<RelativeTime
			iso={item.created_at}
			scope="events"
			class="order-2 justify-self-end text-xs text-muted-foreground tabular-nums md:order-1 md:justify-self-start"
		/>

		<!-- Category chip (click → filter) -->
		<span class="order-1 md:order-2">
			<button
				type="button"
				onclick={filterCategory}
				title="Filter by this category"
				class={cn(
					'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold transition-opacity hover:opacity-80',
					style.chip
				)}
			>
				<Icon name={CATEGORY_ICON[item.category]} size={13} />
				{humanizeEnum(item.category)}
			</button>
		</span>

		<!-- Event -->
		<span
			class="order-3 col-span-2 flex items-center gap-2 text-sm font-medium md:order-3 md:col-span-1"
		>
			<span class={cn('size-2 shrink-0 rounded-full', SENTIMENT_DOT[sentimentOf(item.code)])}
			></span>
			<span class="truncate">{eventLabel(item.code)}</span>
		</span>

		<!-- Text -->
		<span
			class="order-4 col-span-2 text-sm break-words text-foreground md:order-4 md:col-span-1 md:truncate"
			title={stripInlineMarkup(text)}
		>
			<InlineMarkup {text} />
		</span>

		<!-- Expand affordance -->
		<span class="order-5 hidden justify-self-end md:flex">
			{#if expandable}
				<Icon
					name="chevron-down"
					size={16}
					class={cn('text-muted-foreground transition-transform', open && 'rotate-180')}
				/>
			{/if}
		</span>
	</div>
{/snippet}

<div class="relative overflow-hidden rounded-lg border bg-card">
	<!-- Category color edge -->
	<div class={cn('absolute inset-y-0 left-0 w-1', style.bar)}></div>

	{#if expandable}
		<div
			role="button"
			tabindex="0"
			onclick={toggle}
			onkeydown={onKeydown}
			aria-expanded={open}
			class="block w-full cursor-pointer text-left transition-colors outline-none hover:bg-muted/40 focus-visible:bg-muted/40"
		>
			{@render collapsed()}
		</div>
	{:else}
		<div>{@render collapsed()}</div>
	{/if}

	{#if open}
		<div transition:slide={{ duration: 180 }} class={cn('border-t px-4 py-3 pl-5', style.tint)}>
			{#if details.rows.length > 0}
				<dl class="grid grid-cols-[max-content_1fr] gap-x-5 gap-y-2 text-sm">
					{#each details.rows as row (row.label)}
						<dt class="text-muted-foreground">{row.label}</dt>
						<dd class="min-w-0 break-words">
							{#if Array.isArray(row.value)}
								<span class="flex flex-wrap gap-1.5">
									{#each row.value as chip (chip)}
										<span class="rounded-md bg-muted/70 px-1.5 py-0.5 font-mono text-xs"
											>{chip}</span
										>
									{/each}
								</span>
							{:else}
								{row.value}
							{/if}
						</dd>
					{/each}
				</dl>
			{/if}

			{#if details.links.length > 0}
				<div class="mt-3 flex flex-wrap gap-2">
					{#each details.links as link (link.href)}
						<a
							href={link.href}
							class="inline-flex items-center gap-1 rounded-md border border-info/30 bg-info/10 px-2.5 py-1 text-xs font-medium text-info transition-colors hover:bg-info/20"
						>
							{link.label} ›
						</a>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
