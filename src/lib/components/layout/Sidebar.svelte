<script lang="ts">
	import NavMenu from './NavMenu.svelte';
	import { sidebar } from '$lib/stores/sidebar.svelte';
	import { cn } from '$lib/utils';
</script>

<aside
	class={cn(
		'sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 overflow-x-hidden overflow-y-auto border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out lg:block',
		sidebar.collapsed ? 'w-15' : 'w-58'
	)}
>
	<NavMenu collapsed={sidebar.collapsed} showToggle />
</aside>
