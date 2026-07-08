<script lang="ts">
	import { onMount } from 'svelte';
	import SettingsPageShell from '$lib/components/settings/SettingsPageShell.svelte';
	import BackupsSection from '$lib/components/settings/BackupsSection.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { getSystemStats } from '$lib/api/system';
	import { status } from '$lib/stores/status.svelte';
	import { statusTone } from '$lib/config/service-indicators';
	import { UI_VERSION } from '$lib/config/version';
	import { formatUptime } from '$lib/utils/time';
	import { formatBytes } from '$lib/utils/number';
	import { cn } from '$lib/utils';
	import type { ServiceCode, SystemStats } from '$lib/api/types';

	let stats = $state<SystemStats | null>(null);
	let loadFailed = $state(false);
	// 1s tick driving the live uptime count-up.
	let now = $state(Date.now());

	// Every service in display order, with a fallback label (live `services_status[code].name` overrides it).
	const SERVICES: { code: ServiceCode; label: string }[] = [
		{ code: 'qbit', label: 'qBittorrent' },
		{ code: 'anilist', label: 'AniList' },
		{ code: 'tvdb', label: 'TheTVDB' },
		{ code: 'rss', label: 'RSS (Nyaa)' },
		{ code: 'notifications_discord_webhook', label: 'Discord Webhook' }
	];

	onMount(() => {
		void load();
		const id = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(id);
	});

	async function load() {
		try {
			stats = await getSystemStats();
			loadFailed = false;
		} catch {
			loadFailed = true;
		}
	}

	const uptime = $derived(stats ? formatUptime(stats.up_since, now) : '');

	type Tone = 'green' | 'red' | 'orange' | 'grey';
	const dotClass = (tone: Tone) =>
		tone === 'green'
			? 'bg-success'
			: tone === 'red'
				? 'bg-destructive'
				: tone === 'orange'
					? 'bg-warning'
					: 'bg-muted-foreground';
	const toneText = (tone: Tone) =>
		tone === 'green'
			? 'text-success'
			: tone === 'red'
				? 'text-destructive'
				: tone === 'orange'
					? 'text-warning'
					: 'text-muted-foreground';

	/** Status label + tone for one service row. */
	function serviceState(code: ServiceCode): { label: string; tone: Tone } {
		if (status.isWaiting(code)) return { label: 'Checking…', tone: 'grey' };
		const svc = status.service(code);
		if (!status.current) return { label: 'Unknown', tone: 'grey' };
		if (!svc || svc.healthy) return { label: 'Online', tone: 'green' };
		return { label: svc.error_level ?? 'Error', tone: statusTone(code, svc) };
	}

	/** Used percent (0–100), or null when capacity is unknown. */
	function usedPct(used: number | null, total: number | null): number | null {
		if (used == null || total == null || total <= 0) return null;
		return Math.min(100, Math.round((used / total) * 100));
	}
</script>

<SettingsPageShell title="System" icon="system">
	<div class="flex flex-col gap-8">
		<!-- Section 1: Saberr -->
		<section class="flex flex-col gap-3">
			<h2 class="flex items-center gap-2 text-sm font-semibold">
				<Icon name="system" size={16} class="text-muted-foreground" />
				Saberr
			</h2>
			<dl
				class="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-1"
			>
				<div class="flex flex-col gap-1 bg-card p-4">
					<dt class="text-xs text-muted-foreground">App version</dt>
					<dd class="font-mono text-sm font-medium">{stats?.app_version ?? '—'}</dd>
				</div>
				<div class="flex flex-col gap-1 bg-card p-4">
					<dt class="text-xs text-muted-foreground">Web app version</dt>
					<dd class="font-mono text-sm font-medium">{UI_VERSION}</dd>
				</div>
				<div class="flex flex-col gap-1 bg-card p-4">
					<dt class="text-xs text-muted-foreground">Uptime</dt>
					<dd class="text-sm font-medium tabular-nums">{uptime || '—'}</dd>
				</div>
			</dl>
		</section>

		<!-- Section 2: External services -->
		<section class="flex flex-col gap-3">
			<h2 class="flex items-center gap-2 text-sm font-semibold">
				<Icon name="globe" size={16} class="text-muted-foreground" />
				External services
			</h2>
			<div class="overflow-hidden rounded-lg border border-border">
				{#each SERVICES as { code, label }, i (code)}
					{@const svc = status.service(code)}
					{@const st = serviceState(code)}
					<div
						class={cn(
							'flex items-center justify-between gap-3 bg-card px-4 py-3',
							i > 0 && 'border-t border-border'
						)}
					>
						<span class="text-sm font-medium">{svc?.name ?? label}</span>
						<span class={cn('flex items-center gap-2 text-sm', toneText(st.tone))}>
							<span class={cn('h-2.5 w-2.5 rounded-full', dotClass(st.tone))}></span>
							{st.label}
						</span>
					</div>
				{/each}
			</div>
		</section>

		<!-- Section 3: Storage -->
		<section class="flex flex-col gap-3">
			<h2 class="flex items-center gap-2 text-sm font-semibold">
				<Icon name="database" size={16} class="text-muted-foreground" />
				Storage
			</h2>
			{#if loadFailed}
				<p class="text-sm text-muted-foreground">Couldn't load storage stats.</p>
			{:else if !stats}
				<p class="text-sm text-muted-foreground">Loading…</p>
			{:else if stats.disk_stats.length === 0}
				<p class="text-sm text-muted-foreground">No disks reported.</p>
			{:else}
				<div class="flex flex-col gap-4">
					{#each stats.disk_stats as disk (disk.path + disk.name)}
						{@const pct = usedPct(disk.used, disk.total)}
						{@const critical = pct != null && pct >= 90}
						<div class="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-4">
							<div class="flex items-baseline justify-between gap-3">
								<span class="min-w-0 truncate text-sm font-medium">
									<span class="font-mono">{disk.path}</span>
									<span class="text-muted-foreground">({disk.name})</span>
								</span>
								<span class="shrink-0 text-xs text-muted-foreground tabular-nums">
									{formatBytes(disk.used)} / {formatBytes(disk.total)}
									{#if pct != null}<span class="ml-1">· {pct}%</span>{/if}
								</span>
							</div>
							<div class="h-2 overflow-hidden rounded-full bg-muted">
								<div
									class={cn('h-full rounded-full', critical ? 'bg-destructive' : 'bg-success')}
									style:width="{pct ?? 0}%"
								></div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Section 4: Backups -->
		<BackupsSection />
	</div>
</SettingsPageShell>
