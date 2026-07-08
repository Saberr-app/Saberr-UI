<script lang="ts">
	import { toggleMode } from 'mode-watcher';
	import { buttonVariants } from '$lib/components/ui/button';
	import Icon from '$lib/components/Icon.svelte';
</script>

<button
	type="button"
	onclick={toggleMode}
	class={buttonVariants({ variant: 'ghost', size: 'icon' })}
	aria-label="Toggle light / dark theme"
>
	<Icon name="sun" class="dark:hidden" />
	<Icon name="moon" class="hidden dark:block" />
</button>
