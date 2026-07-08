<script lang="ts">
	import RankedDndList from '$lib/components/settings/RankedDndList.svelte';
	import CheckboxField from '$lib/components/settings/CheckboxField.svelte';
	import SettingField from '$lib/components/settings/SettingField.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import {
		ENCODINGS,
		RESOLUTIONS,
		SOURCES,
		type Encoding,
		type Priority,
		type Resolution,
		type Source,
		type TrackedAnimeReleaseProfileSettings
	} from '$lib/api/types';

	// The per-anime release profile editor — the same controls as the global
	// Release Profile settings page, minus the release-group ranking (that lives in
	// its own dialog section). Operates directly on the bound profile object.
	let { profile = $bindable() }: { profile: TrackedAnimeReleaseProfileSettings } = $props();

	const PRIORITY_LABELS: Record<Priority, string> = {
		resolution: 'Resolution',
		language_code: 'Language Code',
		release_group: 'Release Group',
		source: 'Source',
		version: 'Version',
		encoding: 'Encoding'
	};

	const langHasJP = $derived(
		profile.preferred_language_codes.some((c) => c.toUpperCase() === 'JP')
	);
	const showLanguageWarning = $derived(
		profile.language_codes_restricted && profile.preferred_language_codes.length > 0 && !langHasJP
	);
	const showSourceWarning = $derived(
		profile.sources_restricted && profile.preferred_sources.length > 0
	);
</script>

<!-- Faint info tint marks this as a custom override vs the global default. -->
<div class="flex flex-col gap-5 rounded-md border border-info/25 bg-info/5 p-4">
	<SettingField label="Preferred encodings (ranked)">
		<RankedDndList
			value={profile.preferred_encodings}
			options={ENCODINGS}
			onChange={(v) => (profile.preferred_encodings = v as Encoding[])}
			ariaLabel="Preferred encodings"
			emptyLabel="Accept any encoding"
			availableLabel="Available encodings:"
		/>
	</SettingField>

	<Separator />

	<SettingField label="Preferred resolutions (ranked)">
		<RankedDndList
			value={profile.preferred_resolutions}
			options={RESOLUTIONS}
			onChange={(v) => (profile.preferred_resolutions = v as Resolution[])}
			ariaLabel="Preferred resolutions"
			emptyLabel="Accept any resolution"
			availableLabel="Available resolutions:"
		/>
	</SettingField>

	<Separator />

	<div class="flex flex-col gap-2">
		<SettingField
			label="Preferred languages (ranked)"
			help="Use language codes such as EN, JP, etc..."
		>
			<RankedDndList
				value={profile.preferred_language_codes}
				allowFreeText
				onChange={(v) => (profile.preferred_language_codes = v)}
				placeholder="Add a language code (e.g. EN) and press Enter…"
				ariaLabel="Preferred languages"
				emptyLabel="Accept any language"
			/>
		</SettingField>
		<CheckboxField
			bind:checked={profile.language_codes_restricted}
			label="Require releases to match at least one language"
		/>
		{#if showLanguageWarning}
			<p class="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
				Saberr can't always tell a torrent's language reliably. Requiring a language match may block
				some or all torrents from downloading.
			</p>
		{/if}
	</div>

	<Separator />

	<div class="flex flex-col gap-2">
		<SettingField label="Preferred sources (ranked)">
			<RankedDndList
				value={profile.preferred_sources}
				options={SOURCES}
				onChange={(v) => (profile.preferred_sources = v as Source[])}
				ariaLabel="Preferred sources"
				emptyLabel="Accept releases from any source"
				availableLabel="Available sources:"
			/>
		</SettingField>
		<CheckboxField
			bind:checked={profile.sources_restricted}
			label="Require releases to match at least one source"
		/>
		{#if showSourceWarning}
			<p class="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
				Saberr can't always tell a torrent's source reliably. Requiring a source match may block
				some or all torrents from downloading.
			</p>
		{/if}
	</div>

	<Separator />

	<CheckboxField
		bind:checked={profile.accept_release_upgrades}
		label="Allow upgrades based on preferences or versions"
		help="Whether to allow newer torrents that rank higher on your priorities to replace a previous version of the episode"
	/>

	<Separator />

	<SettingField
		label="Priority of a torrent's attributes when determining the best torrent"
		help="Ranking **Resolution** above **Encoding**, for example, lets Saberr prefer a `1080p HEVC` torrent over a `720p AVC` one even when you strictly prefer AVC."
	>
		<RankedDndList
			value={profile.priorities_sorted}
			reorderOnly
			onChange={(v) => (profile.priorities_sorted = v as Priority[])}
			labelOf={(code) => PRIORITY_LABELS[code as Priority] ?? code}
			ariaLabel="Priority order"
		/>
	</SettingField>
</div>
