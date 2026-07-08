<script lang="ts">
	import type { AnimeCharacter } from '$lib/api/types';
	import { characterRoleLabel } from '$lib/anilist/extras';
	import ExtraCard from './ExtraCard.svelte';

	let { character, showCast }: { character: AnimeCharacter; showCast: boolean } = $props();

	const role = $derived(character.role ? characterRoleLabel(character.role) : null);
</script>

{#if showCast}
	<!-- Character stacked above its voice actor (a ? placeholder when there's none). -->
	<div class="flex w-24 shrink-0 flex-col gap-2 sm:w-28">
		<ExtraCard
			class="w-full"
			image={character.image_url}
			title={character.name}
			attribute={role}
			href={character.site_url}
			external
			reserveTitle
		/>
		{#if character.voice_actor}
			<ExtraCard
				class="w-full"
				image={character.voice_actor.image_url}
				title={character.voice_actor.name}
				href={character.voice_actor.site_url}
				external
			/>
		{:else}
			<ExtraCard class="w-full" image={null} title={null} />
		{/if}
	</div>
{:else}
	<ExtraCard
		image={character.image_url}
		title={character.name}
		attribute={role}
		href={character.site_url}
		external
	/>
{/if}
