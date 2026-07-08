<script lang="ts">
	import { SMILEY_PATHS, type SmileyValue } from '$lib/config/score-smileys';
	import { cn } from '$lib/utils';

	let {
		value,
		size = 20,
		class: className
	}: { value: SmileyValue; size?: number; class?: string } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 496 512"
	width={size}
	height={size}
	fill="currentColor"
	class={cn('shrink-0', className)}
	aria-hidden="true"
>
	<path d={SMILEY_PATHS[value]} />
</svg>
