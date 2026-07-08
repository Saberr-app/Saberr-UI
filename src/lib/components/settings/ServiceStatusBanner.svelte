<script lang="ts">
	import { status } from '$lib/stores/status.svelte';
	import { statusTone } from '$lib/config/service-indicators';
	import type { ServiceCode } from '$lib/api/types';
	import { cn } from '$lib/utils';

	// A boxed status line per service: green "Online", or error level + details in warning/destructive.
	// Pass one service or several (e.g. Discord's two webhooks, each labelled).
	let {
		service,
		labels = {},
		hideWhenHealthy = false
	}: {
		service: ServiceCode | ServiceCode[];
		/** Per-service prefix shown when more than one service is rendered. */
		labels?: Partial<Record<ServiceCode, string>>;
		/** Don't render a service's line while it's healthy (e.g. AniList — no "Online" box). */
		hideWhenHealthy?: boolean;
	} = $props();

	const codes = $derived(Array.isArray(service) ? service : [service]);
	const multi = $derived(codes.length > 1);
	const isHealthy = (svc: ReturnType<typeof status.service>) => !svc || svc.healthy;
	// Which lines render (honoring `hideWhenHealthy`); a waiting service always shows its grey "Waiting…" line.
	const visible = $derived(
		codes.filter(
			(code) => status.isWaiting(code) || !(hideWhenHealthy && isHealthy(status.service(code)))
		)
	);

	type Tone = 'green' | 'red' | 'orange' | 'grey';
	const boxClass = (tone: Tone) =>
		tone === 'green'
			? 'border-success/40 bg-success/10 text-success'
			: tone === 'red'
				? 'border-destructive/40 bg-destructive/10 text-destructive'
				: tone === 'orange'
					? 'border-warning/40 bg-warning/10 text-warning'
					: 'border-border bg-muted/50 text-muted-foreground';

	const dotClass = (tone: Tone) =>
		tone === 'green'
			? 'bg-success'
			: tone === 'red'
				? 'bg-destructive'
				: tone === 'orange'
					? 'bg-warning'
					: 'bg-muted-foreground';
</script>

{#if (status.current || status.anyWaiting) && visible.length}
	<div class="mb-3 flex flex-col gap-2">
		{#each visible as code (code)}
			{@const waiting = status.isWaiting(code)}
			{@const svc = status.service(code)}
			{@const tone = waiting ? 'grey' : statusTone(code, svc)}
			<div class={cn('flex items-start gap-2 rounded-md border p-3 text-sm', boxClass(tone))}>
				<span class={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', dotClass(tone))}></span>
				<div>
					{#if multi && labels[code]}
						<span class="font-semibold">{labels[code]}:</span>
					{/if}
					{#if waiting}
						<span class="font-medium">Waiting for service status…</span>
					{:else if !svc || svc.healthy}
						<span class="font-medium">Online</span>
					{:else}
						<span class="font-semibold">{svc.error_level}</span>
						{#if svc.error_details}
							<span class="opacity-90"> — {svc.error_details}</span>
						{/if}
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}
