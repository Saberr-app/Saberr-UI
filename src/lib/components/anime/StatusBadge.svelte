<script lang="ts">
	import type { AnilistAnimeUserStatus } from '$lib/api/types';
	import { ANILIST_STATUS_LABELS } from '$lib/anilist/entry';
	import { WATCH_STATUS_ACCENT } from '$lib/anilist/colors';
	import AccentChip from './AccentChip.svelte';

	let {
		status,
		size = 'sm',
		dot = true,
		class: className
	}: {
		status: AnilistAnimeUserStatus;
		size?: 'xs' | 'sm';
		dot?: boolean;
		class?: string;
	} = $props();
</script>

<AccentChip
	accent={WATCH_STATUS_ACCENT[status]}
	label={ANILIST_STATUS_LABELS[status] ?? status}
	{dot}
	{size}
	class={className}
/>
