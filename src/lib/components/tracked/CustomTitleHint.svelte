<script lang="ts">
	import HelpHint from '$lib/components/settings/HelpHint.svelte';
	import InlineMarkup from '$lib/components/settings/InlineMarkup.svelte';
	import { seasonMatchPreview } from '$lib/tracked/custom-title';

	// Hint shown under a "custom title"/"custom detection title" field, in both the
	// tracked Add/Edit release-groups section and the RSS Identify dialog. When the
	// title ends with "season {n}" we also surface the season-shorthand form the
	// backend will additionally match (seasonMatchPreview).
	let { title }: { title: string | null | undefined } = $props();

	const season = $derived(seasonMatchPreview(title));
</script>

<div class="rounded-md border border-info/30 bg-info/5 p-2.5 text-xs">
	<p class="flex items-start gap-1 font-medium text-foreground">
		<span>Torrents with this exact title will be matched against this anime.</span>
		<HelpHint text="Ignored if the offset causes the release episode number to become negative." />
	</p>
	<div class="mt-1.5 space-y-0.5 text-muted-foreground">
		{#if season}
			<p>This will match against both:</p>
			<ul class="ml-4 list-disc">
				<li><InlineMarkup text={`**${season.full}**`} /></li>
				<li><InlineMarkup text={`**${season.shorthand}**`} /></li>
			</ul>
		{/if}
		<p>Consider setting an offset if necessary. An example:</p>
		<p><InlineMarkup text="**Torrent title**: `Dr Stone S4 Episode 35`" /></p>
		<p><InlineMarkup text="**Tracked anime**: `Dr Stone S4 Part 3`" /></p>
		<p><InlineMarkup text="**Actual episode**: `Dr Stone S4 Part 3 Episode 11`" /></p>
		<p><InlineMarkup text="**Offset**: 35 - 11 = **24**." /></p>
	</div>
</div>
