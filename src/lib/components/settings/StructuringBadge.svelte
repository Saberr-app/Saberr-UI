<script lang="ts">
	import { mode } from 'mode-watcher';

	// A small logo badge indicating which structuring mode a setting applies to.
	// TVDB swaps its logo per theme; AniList is a self-contained badge.
	let { type, class: className = 'h-4' }: { type: 'tvdb' | 'anilist'; class?: string } = $props();

	const src = $derived(
		type === 'anilist'
			? '/img/anilist.png'
			: mode.current === 'dark'
				? '/img/tvdb-dark.png'
				: '/img/tvdb-light.png'
	);
	const alt = $derived(type === 'anilist' ? 'AniList Structuring' : 'TVDB Structuring');
</script>

<img
	{src}
	{alt}
	title={alt}
	decoding="async"
	class="inline-block w-auto rounded-[3px] {className}"
/>
