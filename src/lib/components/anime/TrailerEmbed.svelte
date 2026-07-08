<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { Button } from '$lib/components/ui/button';

	let { url }: { url: string } = $props();

	type Parsed = {
		provider: 'youtube' | 'dailymotion';
		id: string;
		thumb: string;
		embed: string;
	} | null;

	function parse(raw: string): Parsed {
		try {
			const u = new URL(raw);
			const host = u.hostname.replace(/^www\./, '');
			// YouTube — watch?v= / youtu.be/ID / embed/ID / -nocookie
			if (
				host.endsWith('youtube.com') ||
				host === 'youtu.be' ||
				host.endsWith('youtube-nocookie.com')
			) {
				const id =
					host === 'youtu.be'
						? u.pathname.slice(1)
						: (u.searchParams.get('v') ?? u.pathname.split('/').filter(Boolean).pop() ?? '');
				if (!id) return null;
				return {
					provider: 'youtube',
					id,
					thumb: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
					embed: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
				};
			}
			// Dailymotion — dailymotion.com/video/ID / dai.ly/ID
			if (host.endsWith('dailymotion.com') || host === 'dai.ly') {
				const id =
					host === 'dai.ly'
						? u.pathname.slice(1)
						: (u.pathname.split('/').filter(Boolean).pop() ?? '').split('_')[0];
				if (!id) return null;
				return {
					provider: 'dailymotion',
					id,
					thumb: `https://www.dailymotion.com/thumbnail/video/${id}`,
					embed: `https://www.dailymotion.com/embed/video/${id}?autoplay=1`
				};
			}
		} catch {
			/* fall through to link */
		}
		return null;
	}

	const parsed = $derived(parse(url));
	let playing = $state(false);
</script>

{#if parsed}
	<div
		class="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black"
	>
		{#if playing}
			<iframe
				src={parsed.embed}
				title="Trailer"
				class="absolute inset-0 h-full w-full"
				allow="autoplay; encrypted-media; picture-in-picture"
				allowfullscreen
			></iframe>
		{:else}
			<button
				type="button"
				onclick={() => (playing = true)}
				class="group absolute inset-0 h-full w-full"
				aria-label="Play trailer"
			>
				<img
					src={parsed.thumb}
					alt="Trailer thumbnail"
					loading="lazy"
					class="h-full w-full object-cover opacity-80 transition group-hover:scale-105 group-hover:opacity-100"
				/>
				<span class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></span>
				<span
					class="absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand-light/90 text-white shadow-lg ring-1 ring-white/20 backdrop-blur transition group-hover:scale-110"
				>
					<Icon name="play" size={26} class="ml-1 fill-current" />
				</span>
			</button>
		{/if}
	</div>
{:else}
	<Button href={url} target="_blank" rel="noopener noreferrer" variant="outline" size="sm">
		<Icon name="play" size={15} />
		Watch trailer
	</Button>
{/if}
