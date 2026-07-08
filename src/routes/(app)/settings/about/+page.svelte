<script lang="ts">
	import { onMount } from 'svelte';
	import SettingsPageShell from '$lib/components/settings/SettingsPageShell.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import RelativeTime from '$lib/components/RelativeTime.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { getSystemStats, getLatestAppRelease, getCurrentAppRelease } from '$lib/api/system';
	import { cmpVersion } from '$lib/config/version';
	import { renderMarkdown } from '$lib/utils/markdown';
	import { cn } from '$lib/utils';
	import type { AppReleaseItem } from '$lib/api/types';

	/** Backend app version — fetched from `/system/stats` (same source as the System page). */
	let appVersion = $state<string | null>(null);
	onMount(async () => {
		try {
			appVersion = (await getSystemStats()).app_version;
		} catch {
			appVersion = null;
		}
	});

	/* --- Release details (runs the update check on entering the page) ---------- */
	let release = $state<AppReleaseItem | null>(null);
	let checking = $state(false);
	/** The release the details dialog is showing — the latest (green chip) or the
	 *  currently-installed one (version chip). */
	let dialogRelease = $state<AppReleaseItem | null>(null);
	let loadingCurrent = $state(false);
	let detailsOpen = $state(false);

	/** An update exists when the latest published version outranks what we're running. */
	const hasUpdate = $derived(!!release && cmpVersion(release.version, release.current_version) > 0);
	const bodyHtml = $derived(dialogRelease ? renderMarkdown(dialogRelease.body) : '');

	async function checkForUpdates(userInitiated = true) {
		if (checking) return;
		checking = true;
		try {
			release = await getLatestAppRelease(userInitiated);
		} catch {
			release = null;
		} finally {
			checking = false;
		}
	}

	// Implicit on-entry check — silent (no error toast).
	onMount(() => checkForUpdates(false));

	/** Open the details dialog for the latest release (green "Update available" chip). */
	function showLatestRelease() {
		if (!release) return;
		dialogRelease = release;
		detailsOpen = true;
	}

	/** Fetch + show the currently-installed release's notes (version chip). */
	async function showCurrentRelease() {
		if (loadingCurrent) return;
		loadingCurrent = true;
		try {
			dialogRelease = await getCurrentAppRelease();
			detailsOpen = true;
		} catch {
			// Silent — the version chip just doesn't open if there's nothing to show.
		} finally {
			loadingCurrent = false;
		}
	}

	/** Project links. Keep this list small + central — add a row to add a link. */
	const LINKS: { label: string; href: string; logo?: { dark: string; light: string } }[] = [
		{
			label: 'GitHub',
			href: 'https://github.com/somechazzy/saberr',
			logo: { dark: '/img/github-dark.png', light: '/img/github-light.png' }
		}
	];

	/** Third-party data sources Saberr builds on. Append `{ name, url }` to credit more. */
	const ATTRIBUTIONS: { name: string; url: string }[] = [
		{ name: 'AniBridge mappings', url: 'https://github.com/anibridge/anibridge-mappings' },
		{ name: "Taiga's anime relations", url: 'https://github.com/erengy/anime-relations' },
		{ name: 'AniList', url: 'https://anilist.co' },
		{ name: 'TheTVDB', url: 'https://thetvdb.com' },
		{ name: 'Nyaa.si', url: 'https://nyaa.si' }
	];

	let attributionsOpen = $state(false);

	/** Logo ring spin: 7 speeds (deg/ms), slowest first; each click steps up and wraps. */
	const SPIN_SPEEDS = [
		350 / 8000,
		360 / 5000,
		360 / 3000,
		360 / 1800,
		360 / 1000,
		360 / 550,
		360 / 360
	];
	let spinStep = $state(0);
	let spinEl = $state<HTMLSpanElement | undefined>(undefined);

	function cycleSpin() {
		spinStep = (spinStep + 1) % SPIN_SPEEDS.length;
	}

	// rAF accumulator instead of a CSS keyframe: we integrate the angle ourselves and ease
	// velocity toward the selected speed, then feed it to the conic gradient's `from` angle
	// (--a). Spinning the gradient's start angle — not the element — keeps the lit rim
	// perfectly concentric with the logo (no mask, no corner shimmer). spinStep is read live
	// inside the loop (not an effect dep), so a click never restarts the loop.
	$effect(() => {
		const el = spinEl;
		if (!el) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			el.style.setProperty('--a', '0deg');
			return;
		}
		let angle = 0;
		let vel = SPIN_SPEEDS[0];
		let last = performance.now();
		let raf = requestAnimationFrame(function tick(now) {
			const dt = now - last;
			last = now;
			vel += (SPIN_SPEEDS[spinStep] - vel) * Math.min(1, dt / 160);
			angle = (angle + vel * dt) % 360;
			el.style.setProperty('--a', `${angle}deg`);
			raf = requestAnimationFrame(tick);
		});
		return () => cancelAnimationFrame(raf);
	});
</script>

<SettingsPageShell title="About" icon="about" contentClass="w-full">
	<div class="mx-auto flex w-full max-w-sm flex-col items-center gap-10 py-6 text-center">
		<!-- Hero -->
		<div class="reveal flex flex-col items-center gap-5">
			<!-- A conic comet-arc gradient sitting 3px behind the logo, concentric with it;
			     the logo covers the centre leaving an even rim. The gradient's `from` angle
			     is spun via rAF (no element rotation, no mask). Click to cycle speed. -->
			<button
				type="button"
				onclick={cycleSpin}
				class="logo-aura group relative cursor-pointer border-0 bg-transparent p-0 outline-none"
				aria-label="Saberr logo — click to change the ring spin speed"
			>
				<span class="logo-aura-glow" aria-hidden="true" bind:this={spinEl}></span>
				<img
					src="/logo-light.svg"
					alt="Saberr"
					class="relative h-24 w-24 rounded-[1.75rem] transition-transform duration-200 group-active:scale-95 dark:hidden"
				/>
				<img
					src="/logo.svg"
					alt="Saberr"
					class="relative hidden h-24 w-24 rounded-[1.75rem] transition-transform duration-200 group-active:scale-95 dark:block"
				/>
			</button>
			<div class="flex flex-col gap-1.5">
				<h2 class="text-4xl font-bold tracking-tight">Saberr</h2>
				<p class="text-sm text-muted-foreground">Seasonal Anime Library Management</p>
			</div>
			<!-- Version chip: click to view the currently-installed release's notes. -->
			<button
				type="button"
				onclick={showCurrentRelease}
				disabled={loadingCurrent}
				class="rounded-full border border-border bg-muted/60 px-3 py-1 font-mono text-xs font-medium tracking-wide text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground disabled:opacity-70"
			>
				v{appVersion ?? '—'}
			</button>

			<!-- Update check: a green chip opening the release details when one's available,
			     otherwise a muted "Check for updates" link that re-runs the check. -->
			{#if hasUpdate && release}
				<button
					type="button"
					onclick={showLatestRelease}
					class="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-medium text-success transition-colors hover:bg-success/20"
				>
					<Icon name="upgrade" size={14} />
					Update available (v{release.version})
				</button>
			{:else}
				<button
					type="button"
					onclick={() => checkForUpdates(true)}
					disabled={checking}
					class="text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline disabled:cursor-default disabled:no-underline disabled:opacity-70"
				>
					{checking ? 'Checking for updates…' : 'Check for updates'}
				</button>
			{/if}
		</div>

		<!-- Links -->
		<div class="reveal flex w-full flex-col items-center gap-3" style:animation-delay="80ms">
			<h3 class="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
				Links
			</h3>
			<div class="flex flex-wrap justify-center gap-2">
				{#each LINKS as link (link.href)}
					<a
						href={link.href}
						target="_blank"
						rel="noopener noreferrer"
						class="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-all hover:border-foreground/20 hover:shadow-md"
					>
						{#if link.logo}
							<img src={link.logo.light} alt="" class="h-4 w-4 dark:hidden" />
							<img src={link.logo.dark} alt="" class="hidden h-4 w-4 dark:block" />
						{/if}
						{link.label}
						<Icon
							name="external-link"
							size={14}
							class="text-muted-foreground transition-colors group-hover:text-foreground"
						/>
					</a>
				{/each}
			</div>
		</div>

		<!-- Attributions (collapsed by default) -->
		<div class="reveal flex w-full flex-col items-center gap-3" style:animation-delay="160ms">
			<button
				type="button"
				onclick={() => (attributionsOpen = !attributionsOpen)}
				class="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:text-foreground"
				aria-expanded={attributionsOpen}
			>
				Attributions
				<Icon
					name="chevron-down"
					size={14}
					class={cn('transition-transform', attributionsOpen && 'rotate-180')}
				/>
			</button>
			{#if attributionsOpen}
				<ul class="flex w-full flex-col items-center gap-1.5 text-sm">
					{#each ATTRIBUTIONS as attr (attr.url)}
						<li>
							<a
								href={attr.url}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-1.5 text-info transition-opacity hover:opacity-80"
							>
								{attr.name}
								<Icon name="external-link" size={12} />
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</SettingsPageShell>

<!-- Release details (opened from the version chip or the green "Update available" chip). -->
{#if dialogRelease}
	<Dialog.Root bind:open={detailsOpen}>
		<Dialog.Content class="flex max-h-[90dvh] flex-col gap-4 overflow-y-auto sm:max-w-lg">
			<Dialog.Header class="min-w-0 gap-1 text-left">
				<Dialog.Title class="min-w-0 pr-8 break-words">{dialogRelease.name}</Dialog.Title>
				<Dialog.Description class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
					<span class="font-mono">v{dialogRelease.version}</span>
					<span aria-hidden="true">·</span>
					<span>Published <RelativeTime iso={dialogRelease.published_at} /></span>
				</Dialog.Description>
			</Dialog.Header>

			{#if bodyHtml}
				<!-- eslint-disable-next-line svelte/no-at-html-tags — sanitized in renderMarkdown -->
				<div class="release-body min-w-0 text-sm leading-relaxed break-words">{@html bodyHtml}</div>
			{:else}
				<p class="text-sm text-muted-foreground">No release notes provided.</p>
			{/if}

			<Dialog.Footer>
				<Button href={dialogRelease.web_link} target="_blank" rel="noopener noreferrer">
					<Icon name="external-link" size={16} />
					View on GitHub
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<style>
	.reveal {
		animation: reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
	}
	@keyframes reveal {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	/* Brand comet rim. A rounded conic-gradient masked into a ring: the outer edge sits 3px
	   beyond the logo (inset -3px) and the ring is `padding`-thick, growing inward so it
	   overlaps the logo edge and connects cleanly. Masked as a true annulus (not a filled
	   disc) so it never bleeds through the logo's transparent centre. Only the gradient's
	   `from` angle (--a) spins, set per frame from script — the element never rotates, so the
	   rim corners can't drift. */
	.logo-aura-glow {
		position: absolute;
		inset: -3px;
		border-radius: calc(1.75rem + 3px);
		pointer-events: none;
		padding: 6px;
		background: conic-gradient(
			from var(--a, 0deg),
			transparent 0deg,
			transparent 200deg,
			var(--brand-light) 300deg,
			var(--brand-active) 340deg,
			transparent 360deg
		);
		/* Keep only the padding band: full box minus the content box = the ring. */
		-webkit-mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		-webkit-mask-composite: xor;
		mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		mask-composite: exclude;
	}
	@media (prefers-reduced-motion: reduce) {
		.reveal {
			animation: none;
		}
	}

	/* Rendered release notes (sanitized markdown) — light typographic defaults, left-aligned. */
	.release-body {
		text-align: left;
	}
	.release-body :global(h1),
	.release-body :global(h2),
	.release-body :global(h3),
	.release-body :global(h4) {
		margin: 1em 0 0.4em;
		font-weight: 600;
		line-height: 1.3;
	}
	.release-body :global(h1) {
		font-size: 1.15em;
	}
	.release-body :global(h2) {
		font-size: 1.05em;
	}
	.release-body :global(:first-child) {
		margin-top: 0;
	}
	.release-body :global(p),
	.release-body :global(ul),
	.release-body :global(ol),
	.release-body :global(blockquote) {
		margin: 0.5em 0;
	}
	.release-body :global(ul),
	.release-body :global(ol) {
		padding-left: 1.4em;
	}
	.release-body :global(ul) {
		list-style: disc;
	}
	.release-body :global(ol) {
		list-style: decimal;
	}
	.release-body :global(li) {
		margin: 0.2em 0;
	}
	.release-body :global(a) {
		color: var(--info);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.release-body :global(code) {
		border-radius: 0.25rem;
		background: var(--muted);
		padding: 0.1em 0.35em;
		font-size: 0.9em;
	}
	.release-body :global(pre) {
		overflow-x: auto;
		border-radius: 0.5rem;
		background: var(--muted);
		padding: 0.75em 1em;
	}
	.release-body :global(pre code) {
		background: none;
		padding: 0;
	}
	.release-body :global(blockquote) {
		border-left: 3px solid var(--border);
		padding-left: 0.8em;
		color: var(--muted-foreground);
	}
	.release-body :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: 0.5rem;
	}
	.release-body :global(hr) {
		margin: 1em 0;
		border: none;
		border-top: 1px solid var(--border);
	}
</style>
