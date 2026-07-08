<script lang="ts">
	import { Label as LabelPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		required = false,
		children,
		...restProps
	}: LabelPrimitive.RootProps & { required?: boolean } = $props();
</script>

<LabelPrimitive.Root
	bind:ref
	data-slot="label"
	class={cn(
		'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
		className
	)}
	{...restProps}
>
	{@render children?.()}
	{#if required}
		<span class="-ml-1 text-destructive" aria-hidden="true">*</span>
		<span class="sr-only">(required)</span>
	{/if}
</LabelPrimitive.Root>
