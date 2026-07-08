<script lang="ts">
	import { slide } from 'svelte/transition';
	import MultiSelectDropdown from '$lib/components/MultiSelectDropdown.svelte';
	import DateTimeRangePicker from './DateTimeRangePicker.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';
	import { AUDIT_CATEGORIES, AUDIT_CODES } from '$lib/api/types';
	import type { SortDirection } from '$lib/api/types';
	import { humanizeEnum } from '$lib/audit/labels';
	import { eventLabel } from '$lib/audit/config';
	import { toUtcIso } from '$lib/utils/time';

	interface Props {
		categories: string[];
		codes: string[];
		textQuery: string;
		createdAfter: string | null;
		createdBefore: string | null;
		sortDirection: SortDirection;
		onchange: () => void;
	}

	let {
		categories = $bindable(),
		codes = $bindable(),
		textQuery = $bindable(),
		createdAfter = $bindable(),
		createdBefore = $bindable(),
		sortDirection = $bindable(),
		onchange
	}: Props = $props();

	const categoryOptions = AUDIT_CATEGORIES.map((c) => ({ value: c, label: humanizeEnum(c) }));
	const codeOptions = AUDIT_CODES.map((c) => ({ value: c, label: eventLabel(c) }));

	let expanded = $state(false);
	let textRaw = $state(textQuery);
	// Local datetime-local values for the range picker (so a global clear resets them).
	let dateStart = $state('');
	let dateEnd = $state('');
	let debounce: ReturnType<typeof setTimeout> | undefined;

	const advancedActive = $derived(textQuery.trim() !== '' || !!createdAfter || !!createdBefore);
	const anyActive = $derived(categories.length > 0 || codes.length > 0 || advancedActive);

	function onTextInput(e: Event) {
		textRaw = (e.currentTarget as HTMLInputElement).value;
		clearTimeout(debounce);
		debounce = setTimeout(() => {
			textQuery = textRaw.trim();
			onchange();
		}, 300);
	}

	function toggleSort() {
		sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
		onchange();
	}

	function applyRange() {
		createdAfter = toUtcIso(dateStart);
		createdBefore = toUtcIso(dateEnd);
		onchange();
	}

	function clearAll() {
		clearTimeout(debounce);
		categories = [];
		codes = [];
		textQuery = '';
		textRaw = '';
		dateStart = '';
		dateEnd = '';
		createdAfter = null;
		createdBefore = null;
		onchange();
	}
</script>

<div class="flex flex-col gap-3">
	<!-- Row 1 (never wraps): category + event + clear + sort direction + expand toggle. -->
	<div class="flex flex-nowrap items-center gap-2">
		<div class="min-w-0">
			<MultiSelectDropdown
				options={categoryOptions}
				bind:selected={categories}
				placeholder="Category"
				{onchange}
			/>
		</div>
		<div class="min-w-0">
			<MultiSelectDropdown
				options={codeOptions}
				bind:selected={codes}
				placeholder="Event"
				{onchange}
			/>
		</div>

		{#if anyActive}
			<button
				type="button"
				onclick={clearAll}
				class="shrink-0 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
			>
				Clear filters
			</button>
		{/if}

		<button
			type="button"
			onclick={toggleSort}
			class="ml-auto inline-flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors hover:bg-muted"
			aria-label={`Sort ${sortDirection === 'desc' ? 'newest first' : 'oldest first'}`}
			title={sortDirection === 'desc' ? 'Newest first' : 'Oldest first'}
		>
			<Icon name={sortDirection === 'desc' ? 'sort-desc' : 'sort-asc'} size={16} />
		</button>

		<button
			type="button"
			onclick={() => (expanded = !expanded)}
			class={cn(
				'inline-flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors hover:bg-muted',
				advancedActive && 'border-info/40 text-info'
			)}
			aria-label="More filters"
			aria-expanded={expanded}
		>
			<Icon
				name="chevron-down"
				size={16}
				class={cn('transition-transform', expanded && 'rotate-180')}
			/>
		</button>
	</div>

	<!-- Row 2 (animated): full-width text search + datetime range. -->
	{#if expanded}
		<div transition:slide={{ duration: 200 }} class="flex flex-col gap-4 pt-1">
			<div class="relative">
				<Icon
					name="search"
					size={16}
					class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
				/>
				<input
					type="search"
					value={textRaw}
					oninput={onTextInput}
					placeholder="Search log text…"
					class="h-9 w-full rounded-lg border bg-background pr-3 pl-9 text-sm focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:outline-none"
				/>
			</div>
			<DateTimeRangePicker bind:start={dateStart} bind:end={dateEnd} onapply={applyRange} />
		</div>
	{/if}
</div>
