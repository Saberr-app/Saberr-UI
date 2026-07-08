<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { nav, isSeparator, type NavSubItem } from '$lib/config/nav';
	import { status } from '$lib/stores/status.svelte';
	import { severityForPage, type Severity } from '$lib/config/service-indicators';
	import { cn } from '$lib/utils';

	// The Settings landing page: list every subpage with its subtitle.
	const settingsEntry = nav.find((e) => !isSeparator(e) && e.base === '/settings');
	const subItems =
		settingsEntry && !isSeparator(settingsEntry)
			? (settingsEntry.subItems ?? []).filter((s): s is NavSubItem => !isSeparator(s))
			: [];

	const services = $derived(status.current?.services_status);
	const dotClass = (sev: Severity) => (sev === 'red' ? 'bg-destructive' : 'bg-warning');
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center gap-2.5">
		<Icon name="settings" size={17} class="shrink-0 text-muted-foreground" />
		<h1 class="text-lg font-semibold tracking-tight">Settings</h1>
	</div>

	<div class="flex max-w-2xl flex-col gap-2">
		{#each subItems as item (item.href)}
			{@const severity = severityForPage(services, item.href)}
			<a
				href={item.href}
				class="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-brand/40 hover:bg-sidebar-accent/40"
			>
				<span
					class="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground"
				>
					<Icon name={item.icon} size={18} />
				</span>
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<span class="font-medium">{item.label}</span>
						{#if severity}
							<span class={cn('h-2 w-2 rounded-full', dotClass(severity))}></span>
						{/if}
					</div>
					{#if item.subtitle}
						<p class="mt-0.5 text-sm text-muted-foreground">{item.subtitle}</p>
					{/if}
				</div>
				<Icon
					name="chevron-right"
					size={18}
					class="mt-0.5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
				/>
			</a>
		{/each}
	</div>
</div>
