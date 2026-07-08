<script lang="ts">
	import type { AnilistAnimeFormat } from '$lib/api/types';
	import { formatLabel } from '$lib/anilist/enums';
	import { FORMAT_ACCENT } from '$lib/anilist/colors';
	import AccentChip from './AccentChip.svelte';

	let {
		format,
		size = 'sm',
		class: className
	}: { format: AnilistAnimeFormat; size?: 'xs' | 'sm'; class?: string } = $props();
</script>

<AccentChip accent={FORMAT_ACCENT[format]} label={formatLabel(format)} {size} class={className} />
