<script lang="ts">
	/* Downloads toolbar: a status multi-select filter (server-side `statuses`) + a
	   force-refresh. No sort control — the server is already newest-first. */
	import { TORRENT_DOWNLOAD_STATUS_LABELS, type TorrentDownloadStatus } from '$lib/api/types';
	import MultiSelectDropdown, { type Option } from '$lib/components/MultiSelectDropdown.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	let {
		statuses = $bindable(),
		onchange,
		onrefresh,
		refreshing = false
	}: {
		statuses: string[];
		onchange: () => void;
		onrefresh: () => void;
		refreshing?: boolean;
	} = $props();

	const STATUS_OPTIONS: Option[] = (
		Object.keys(TORRENT_DOWNLOAD_STATUS_LABELS) as TorrentDownloadStatus[]
	).map((s) => ({ value: s, label: TORRENT_DOWNLOAD_STATUS_LABELS[s] }));
</script>

<div class="flex flex-wrap items-center gap-2">
	<MultiSelectDropdown
		options={STATUS_OPTIONS}
		bind:selected={statuses}
		placeholder="Status"
		{onchange}
	/>

	<button
		type="button"
		onclick={onrefresh}
		disabled={refreshing}
		class="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
	>
		<Icon name="refresh" size={15} class={cn(refreshing && 'animate-spin')} />
		Refresh
	</button>
</div>
