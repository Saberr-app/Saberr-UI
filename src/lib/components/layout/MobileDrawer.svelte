<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import NavMenu from './NavMenu.svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();
</script>

<Sheet.Root bind:open>
	<Sheet.Content side="left" class="w-72 gap-0 bg-sidebar p-0">
		<div class="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
			<img src="/logo-light.svg" alt="Saberr" class="h-7 w-7 dark:hidden" />
			<img src="/logo.svg" alt="Saberr" class="hidden h-7 w-7 dark:block" />
			<span class="text-lg font-semibold tracking-tight">Saberr</span>
		</div>
		<div class="overflow-y-auto">
			<NavMenu onNavigate={() => (open = false)} />
		</div>
	</Sheet.Content>
</Sheet.Root>
