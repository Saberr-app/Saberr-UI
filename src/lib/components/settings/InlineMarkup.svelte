<script lang="ts" module>
	type Segment = { type: 'text' | 'bold' | 'italic' | 'code'; value: string };

	// `inline code` first (so any * inside code is left alone), then **bold**, then *italic*.
	// Bold is tried before italic so `**x**` isn't mis-read as two empty italics.
	const TOKEN = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;

	/** Split a string into plain / bold / italic / code segments for safe rendering. */
	export function parseInlineMarkup(input: string): Segment[] {
		const segments: Segment[] = [];
		let lastIndex = 0;
		for (const match of input.matchAll(TOKEN)) {
			const raw = match[0];
			const start = match.index;
			if (start > lastIndex) {
				segments.push({ type: 'text', value: input.slice(lastIndex, start) });
			}
			if (raw.startsWith('`')) {
				segments.push({ type: 'code', value: raw.slice(1, -1) });
			} else if (raw.startsWith('**')) {
				segments.push({ type: 'bold', value: raw.slice(2, -2) });
			} else {
				segments.push({ type: 'italic', value: raw.slice(1, -1) });
			}
			lastIndex = start + raw.length;
		}
		if (lastIndex < input.length) {
			segments.push({ type: 'text', value: input.slice(lastIndex) });
		}
		return segments;
	}

	/** Plain text with all inline markup removed (e.g. for `title` tooltips). */
	export function stripInlineMarkup(input: string): string {
		return parseInlineMarkup(input)
			.map((s) => s.value)
			.join('');
	}
</script>

<script lang="ts">
	// Renders helper/note text that contains **bold** and `code`, as real markup.
	// Built from parsed segments (no raw {@html}) so it's injection-safe.
	let { text }: { text: string } = $props();

	const segments = $derived(parseInlineMarkup(text));
</script>

{#each segments as seg, i (i)}
	{#if seg.type === 'bold'}
		<strong class="font-semibold">{seg.value}</strong>
	{:else if seg.type === 'italic'}
		<em class="italic">{seg.value}</em>
	{:else if seg.type === 'code'}
		<code class="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{seg.value}</code>
	{:else}
		{seg.value}
	{/if}
{/each}
