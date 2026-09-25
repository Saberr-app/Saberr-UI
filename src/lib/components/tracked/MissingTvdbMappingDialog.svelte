<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import Icon from '$lib/components/Icon.svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	function manage() {
		open = false;
		goto('/settings/mappings');
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90dvh] overflow-y-auto sm:max-w-md">
		<Dialog.Header class="min-w-0">
			<Dialog.Title class="flex items-center gap-2">
				<Icon name="alert-triangle" size={16} class="shrink-0 text-destructive" />
				No TVDB mapping
			</Dialog.Title>
			<Dialog.Description>
				This anime has no TVDB series mapped to it yet. This means new episodes cannot be imported.
				Consider refreshing mappings or adding a mapping override.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={() => (open = false)}>Close</Button>
			<Button type="button" onclick={manage}>
				<Icon name="mappings" size={16} />
				Manage mappings
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
