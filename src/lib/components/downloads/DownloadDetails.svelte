<script lang="ts">
	/* The expanded body of a download row — full record: status detail, qbit state, size/version,
	   the three filesystem paths, import time, linked torrent title, and deep-link chips. */
	import type { DownloadItem } from '$lib/api/types';
	import { TORRENT_DOWNLOAD_STATUS_LABELS } from '$lib/api/types';
	import type { IconName } from '$lib/config/icons';
	import { qbitDisplay, formatEta, formatProgress } from '$lib/tracked/qbit';
	import { TONE_DOT } from '$lib/tracked/status';
	import { downloadsActions } from '$lib/stores/downloads-actions.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import RelativeTime from '$lib/components/RelativeTime.svelte';
	import { cn } from '$lib/utils';

	let { item }: { item: DownloadItem } = $props();

	// Expanded view shows qbit whenever the client reports a state (incl. processed).
	const qbit = $derived(item.qbit_status);
	const qd = $derived(qbit ? qbitDisplay(qbit.status) : null);
	const eta = $derived(formatEta(qbit?.eta));

	interface Row {
		label: string;
		value: string;
		mono?: boolean;
	}
	const rows = $derived.by<Row[]>(() => {
		const r: Row[] = [];
		r.push({ label: 'Status', value: TORRENT_DOWNLOAD_STATUS_LABELS[item.status] });
		if (item.status_details) r.push({ label: 'Detail', value: item.status_details });
		if (item.torrent.size) r.push({ label: 'Size', value: item.torrent.size });
		if (item.torrent.version_number > 1)
			r.push({ label: 'Version', value: `v${item.torrent.version_number}` });
		if (item.download_directory_path)
			r.push({ label: 'Download directory', value: item.download_directory_path, mono: true });
		if (item.source_path) r.push({ label: 'Source path', value: item.source_path, mono: true });
		if (item.destination_path)
			r.push({ label: 'Destination path', value: item.destination_path, mono: true });
		return r;
	});

	const hasEpisodes = $derived(item.anilist_episode_numbers.length > 0);
	const links = $derived<{ label: string; href: string; icon: IconName }[]>([
		{
			label: 'Go to tracked anime',
			href: `/tracked/${item.anime.tracked_anime_id}`,
			icon: 'tracked'
		},
		{ label: 'View in browse', href: `/browse?anilist_id=${item.anime.anilist_id}`, icon: 'browse' }
	]);

	const chipClass =
		'inline-flex items-center gap-1.5 rounded-md border border-info/30 bg-info/10 px-2.5 py-1 text-xs font-medium text-info transition-colors hover:bg-info/20';
</script>

<div class="flex flex-col gap-3 text-sm">
	<!-- Torrent title (linked to its web page). -->
	<a
		href={item.torrent.web_link}
		target="_blank"
		rel="noopener noreferrer"
		class="font-mono text-xs break-all text-muted-foreground hover:text-foreground hover:underline"
		title={item.torrent.title}
	>
		{item.torrent.title}
	</a>

	<!-- Phone: each pair stacks (label above value). sm+: a two-column grid via
	     display:contents wrappers, so dt/dd flow into the grid tracks. -->
	<dl class="flex flex-col gap-3 sm:grid sm:grid-cols-[max-content_1fr] sm:gap-x-5 sm:gap-y-2">
		{#each rows as row (row.label)}
			<div class="flex flex-col gap-0.5 sm:contents">
				<dt class="text-muted-foreground">{row.label}</dt>
				<dd class={cn('min-w-0 break-words', row.mono && 'font-mono text-xs break-all')}>
					{row.value}
				</dd>
			</div>
		{/each}

		{#if qd && qbit}
			<div class="flex flex-col gap-0.5 sm:contents">
				<dt class="text-muted-foreground">qBittorrent</dt>
				<dd class="flex min-w-0 flex-col gap-1">
					<div class="flex items-center gap-2">
						<span>{qd.label}</span>
						<span class="text-muted-foreground tabular-nums">
							{formatProgress(qbit.progress)}{#if eta}<span> · {eta} left</span>{/if}
						</span>
					</div>
					{#if qbit.progress < 1}
						<div class="h-1.5 overflow-hidden rounded-full bg-muted">
							<div
								class={cn('h-full rounded-full transition-[width]', TONE_DOT[qd.tone])}
								style="width: {Math.round(qbit.progress * 100)}%"
							></div>
						</div>
					{/if}
				</dd>
			</div>
		{/if}

		{#if item.copied_to_destination_path_at}
			<div class="flex flex-col gap-0.5 sm:contents">
				<dt class="text-muted-foreground">Imported</dt>
				<dd class="min-w-0">
					<RelativeTime
						iso={item.copied_to_destination_path_at}
						scope="downloads"
						defaultAbsolute
						class="text-foreground/80"
					/>
				</dd>
			</div>
		{/if}
	</dl>

	<div class="flex flex-wrap gap-2">
		{#if hasEpisodes}
			<button type="button" class={chipClass} onclick={() => downloadsActions.openEpisode(item)}>
				<Icon name="notes" size={13} /> Episode details
			</button>
		{/if}
		{#each links as link (link.href)}
			<a href={link.href} class={chipClass}>
				<Icon name={link.icon} size={13} />
				{link.label}
			</a>
		{/each}
	</div>
</div>
