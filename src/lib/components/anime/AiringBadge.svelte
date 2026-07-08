<script lang="ts">
	import type { AnilistAnimeStatus } from '$lib/api/types';
	import { airingStatusLabel } from '$lib/anilist/enums';
	import { AIRING_STATUS_ACCENT } from '$lib/anilist/colors';
	import AccentChip from './AccentChip.svelte';

	let {
		status,
		size = 'sm',
		class: className
	}: { status: AnilistAnimeStatus; size?: 'xs' | 'sm'; class?: string } = $props();
</script>

<AccentChip
	accent={AIRING_STATUS_ACCENT[status]}
	label={airingStatusLabel(status)}
	dot
	pulse={status === 'RELEASING'}
	{size}
	class={className}
/>
