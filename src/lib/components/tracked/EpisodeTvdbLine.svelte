<script lang="ts">
	/* The TVDB-structuring line shown in the episode download-status popups:
	   structuring badge + episode code (+ absolute) + episode titles. Renders
	   nothing when there's no code or titles. */
	import StructuringBadge from '$lib/components/settings/StructuringBadge.svelte';

	let {
		code,
		absolute,
		titles
	}: {
		code: string | null;
		absolute: string | null;
		titles: string | null;
	} = $props();
</script>

{#if code || titles}
	<div class="flex flex-wrap items-baseline gap-x-1.5 text-xs">
		<StructuringBadge type="tvdb" class="h-3 w-auto translate-y-[2px]" />
		{#if code}
			<span class="font-medium text-foreground">{code}</span>
			{#if absolute}<span class="text-muted-foreground">{absolute}</span>{/if}
		{/if}
		{#if code && titles}<span class="text-muted-foreground">-</span>{/if}
		{#if titles}<span class="text-foreground">{titles}</span>{/if}
	</div>
{/if}
