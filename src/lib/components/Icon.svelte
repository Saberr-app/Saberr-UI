<script lang="ts">
	import { icons, type IconName } from '$lib/config/icons';
	import { cn } from '$lib/utils';

	interface Props {
		name: IconName;
		/** Pixel size of the square icon. */
		size?: number;
		/** Stroke thickness. */
		strokeWidth?: number;
		class?: string;
	}

	let { name, size = 20, strokeWidth = 2, class: className }: Props = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	class={cn('shrink-0', className)}
	aria-hidden="true"
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted, static, in-repo SVG markup -->
	{@html icons[name]}
</svg>
