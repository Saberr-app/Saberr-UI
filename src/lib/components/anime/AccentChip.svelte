<script lang="ts">
	import type { Accent } from '$lib/anilist/colors';
	import Icon from '$lib/components/Icon.svelte';
	import type { IconName } from '$lib/config/icons';
	import { cn } from '$lib/utils';

	let {
		accent,
		label,
		icon,
		dot = false,
		pulse = false,
		size = 'sm',
		class: className
	}: {
		accent: Accent;
		label: string;
		icon?: IconName;
		dot?: boolean;
		pulse?: boolean;
		size?: 'xs' | 'sm';
		class?: string;
	} = $props();
</script>

<span
	class={cn(
		'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap',
		size === 'xs' ? 'px-1.5 py-0.5 text-[0.65rem]' : 'px-2 py-0.5 text-xs',
		accent.chip,
		className
	)}
>
	{#if dot}
		<span class="relative flex size-1.5">
			{#if pulse}
				<span
					class={cn(
						'absolute inline-flex size-full animate-ping rounded-full opacity-75',
						accent.dot
					)}
				></span>
			{/if}
			<span class={cn('relative inline-flex size-1.5 rounded-full', accent.dot)}></span>
		</span>
	{/if}
	{#if icon}
		<Icon name={icon} size={size === 'xs' ? 11 : 12} />
	{/if}
	{label}
</span>
