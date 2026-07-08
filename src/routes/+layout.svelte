<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner';

	let { children } = $props();
</script>

<svelte:head>
	<title>Saberr</title>
	<link rel="icon" href="/favicon.ico" />
</svelte:head>

<ModeWatcher />
<!-- High z-index so error toasts sit above sheets, popovers and dropdowns. -->
<Toaster position="top-center" style="z-index: 9999;" />
{@render children()}
