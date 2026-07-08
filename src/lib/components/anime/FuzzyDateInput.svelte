<script lang="ts">
	import type { AnilistDate } from '$lib/api/types';
	import SimpleSelect from '$lib/components/settings/SimpleSelect.svelte';

	let { value = $bindable(), valueClass }: { value: AnilistDate; valueClass?: string } = $props();

	const MONTHS = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec'
	];

	const nextYear = new Date().getFullYear() + 1;
	const years = Array.from({ length: nextYear - 1940 + 1 }, (_, i) => nextYear - i);

	const dayCount = $derived(
		value.year != null && value.month != null ? new Date(value.year, value.month, 0).getDate() : 31
	);
	const days = $derived(Array.from({ length: dayCount }, (_, i) => i + 1));

	const yearOptions = [
		{ value: '', label: 'Year' },
		...years.map((y) => ({ value: String(y), label: String(y) }))
	];
	const monthOptions = [
		{ value: '', label: 'Month' },
		...MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))
	];
	const dayOptions = $derived([
		{ value: '', label: 'Day' },
		...days.map((d) => ({ value: String(d), label: String(d) }))
	]);

	function setPart(part: 'year' | 'month' | 'day', raw: string) {
		const n = raw === '' ? null : Number(raw);
		value = { ...value, [part]: n };
		// If day is now invalid for the new month/year, trim it.
		if (value.day != null && value.day > dayCount) value = { ...value, day: null };
	}
</script>

<div class="flex gap-1.5">
	<div class="min-w-0 flex-1">
		<SimpleSelect
			value={value.year != null ? String(value.year) : ''}
			options={yearOptions}
			onValueChange={(v) => setPart('year', v)}
			contentClass="max-h-64"
			{valueClass}
		/>
	</div>
	<div class="min-w-0 flex-1">
		<SimpleSelect
			value={value.month != null ? String(value.month) : ''}
			options={monthOptions}
			onValueChange={(v) => setPart('month', v)}
			{valueClass}
		/>
	</div>
	<div class="min-w-0 flex-1">
		<SimpleSelect
			value={value.day != null ? String(value.day) : ''}
			options={dayOptions}
			onValueChange={(v) => setPart('day', v)}
			contentClass="max-h-64"
			{valueClass}
		/>
	</div>
</div>
