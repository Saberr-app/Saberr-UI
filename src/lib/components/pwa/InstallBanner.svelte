<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { Button } from '$lib/components/ui/button';
	import { install } from '$lib/pwa/install.svelte';

	let dx = $state(0);
	let startX = 0;
	let dragging = $state(false);

	function onStart(e: TouchEvent) {
		startX = e.touches[0].clientX;
		dragging = true;
	}
	function onMove(e: TouchEvent) {
		if (dragging) dx = e.touches[0].clientX - startX;
	}
	function onEnd() {
		dragging = false;
		if (Math.abs(dx) > 80) install.dismiss();
		dx = 0;
	}

	const opacity = $derived(Math.max(0, 1 - Math.abs(dx) / 240));
</script>

{#if install.visible}
	<div class="fixed inset-x-0 bottom-0 z-50 p-3 sm:hidden">
		<div
			role="region"
			aria-label="Install app"
			class="flex items-center gap-3 rounded-lg border bg-card p-3 text-card-foreground shadow-lg"
			style="transform: translateX({dx}px); opacity: {opacity}; transition: {dragging
				? 'none'
				: 'transform 150ms, opacity 150ms'};"
			ontouchstart={onStart}
			ontouchmove={onMove}
			ontouchend={onEnd}
		>
			<Icon name="grip" size={18} class="shrink-0 text-muted-foreground" />
			<span class="min-w-0 flex-1 text-sm">Install Saberr for quick access.</span>
			<Button variant="affirmative" size="sm" onclick={() => install.install()}>Install</Button>
		</div>
	</div>
{/if}
