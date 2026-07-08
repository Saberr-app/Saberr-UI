<script lang="ts">
	import SettingsPageShell from '$lib/components/settings/SettingsPageShell.svelte';
	import SettingsFooter from '$lib/components/settings/SettingsFooter.svelte';
	import SettingField from '$lib/components/settings/SettingField.svelte';
	import CheckboxField from '$lib/components/settings/CheckboxField.svelte';
	import RankedDndList from '$lib/components/settings/RankedDndList.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import { settings } from '$lib/stores/settings.svelte';
	import { defaultSettings } from '$lib/config/settings-defaults';
	import { updateProfile } from '$lib/api/settings';
	import { notifySuccess } from '$lib/api/notify';
	import {
		ENCODINGS,
		RESOLUTIONS,
		SOURCES,
		type Encoding,
		type Priority,
		type ProfileSettings,
		type Resolution,
		type Source
	} from '$lib/api/types';
	import { settingsChanged } from '$lib/utils/form';

	let draft = $state<ProfileSettings>($state.snapshot(settings.current.profile));

	const dirty = $derived(settingsChanged(draft, settings.current.profile));

	const availableReleaseGroups = $derived(settings.current.meta.available_release_groups);

	const langHasEN = $derived(draft.preferred_language_codes.some((c) => c.toUpperCase() === 'EN'));
	const showLanguageWarning = $derived(
		draft.language_codes_restricted && draft.preferred_language_codes.length > 0 && !langHasEN
	);
	const showSourceWarning = $derived(
		draft.sources_restricted && draft.preferred_sources.length > 0
	);

	const PRIORITY_LABELS: Record<Priority, string> = {
		resolution: 'Resolution',
		language_code: 'Language Code',
		release_group: 'Release Group',
		source: 'Source',
		version: 'Version',
		encoding: 'Encoding'
	};

	const LANGUAGE_WARNING =
		"Saberr can't always tell a torrent's language reliably, because release groups are inconsistent about labelling it. Requiring a language match may end up blocking some or all torrents from downloading.";
	const SOURCE_WARNING =
		"Saberr can't always tell a torrent's source reliably, because release groups are inconsistent about labelling it. Requiring a source match may end up blocking some or all torrents from downloading.";

	async function save() {
		const updated = await updateProfile($state.snapshot(draft));
		settings.patch('profile', updated);
		notifySuccess('Release profile saved.');
	}
	function reset() {
		draft = defaultSettings().profile;
	}
</script>

<SettingsPageShell title="Release Profile" icon="profile" {dirty}>
	{#snippet banner()}
		<div
			class="mb-6 flex items-start gap-2.5 rounded-md border border-info/30 bg-info/5 p-3 text-sm text-muted-foreground"
		>
			<Icon name="help" size={16} class="mt-0.5 shrink-0 text-info" />
			<p>
				This is the default release profile. It applies to every tracked anime that doesn't have its
				own custom profile. Any change you make here affects all of those existing tracked anime.
			</p>
		</div>
	{/snippet}

	<div class="flex flex-col gap-6">
		<SettingField
			largeLabel
			label="Preferred release groups (ranked)"
			description="Release groups not selected will not be considered for downloading. Clear the list to accept anything."
		>
			<RankedDndList
				value={draft.preferred_release_groups}
				options={availableReleaseGroups}
				onChange={(v) => (draft.preferred_release_groups = v)}
				ariaLabel="Preferred release groups"
				emptyLabel="Accept releases from any release group"
				availableLabel="Available release groups:"
			/>
		</SettingField>

		<Separator />

		<SettingField
			largeLabel
			label="Preferred encodings (ranked)"
			description="Encodings not selected will not be considered for downloading. Clear the list to accept anything."
		>
			<RankedDndList
				value={draft.preferred_encodings}
				options={ENCODINGS}
				onChange={(v) => (draft.preferred_encodings = v as Encoding[])}
				ariaLabel="Preferred encodings"
				emptyLabel="Accept any encoding"
				availableLabel="Available encodings:"
			/>
		</SettingField>

		<Separator />

		<SettingField
			largeLabel
			label="Preferred resolutions (ranked)"
			description="Resolutions not selected will not be considered for downloading. Clear the list to accept anything."
		>
			<RankedDndList
				value={draft.preferred_resolutions}
				options={RESOLUTIONS}
				onChange={(v) => (draft.preferred_resolutions = v as Resolution[])}
				ariaLabel="Preferred resolutions"
				emptyLabel="Accept any resolution"
				availableLabel="Available resolutions:"
			/>
		</SettingField>

		<Separator />

		<div class="flex flex-col gap-2">
			<SettingField
				largeLabel
				label="Preferred languages (ranked)"
				help="Use language codes such as EN, JP, etc..."
			>
				<RankedDndList
					value={draft.preferred_language_codes}
					allowFreeText
					onChange={(v) => (draft.preferred_language_codes = v)}
					placeholder="Add a language code (e.g. EN) and press Enter…"
					ariaLabel="Preferred languages"
					emptyLabel="Accept any language"
				/>
			</SettingField>
			<CheckboxField
				bind:checked={draft.language_codes_restricted}
				label="Require releases to match at least one language"
			/>
			{#if showLanguageWarning}
				<p class="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
					{LANGUAGE_WARNING}
				</p>
			{/if}
		</div>

		<Separator />

		<div class="flex flex-col gap-2">
			<SettingField largeLabel label="Preferred sources (ranked)">
				<RankedDndList
					value={draft.preferred_sources}
					options={SOURCES}
					onChange={(v) => (draft.preferred_sources = v as Source[])}
					ariaLabel="Preferred sources"
					emptyLabel="Accept releases from any source"
					availableLabel="Available sources:"
				/>
			</SettingField>
			<CheckboxField
				bind:checked={draft.sources_restricted}
				label="Require releases to match at least one source"
			/>
			{#if showSourceWarning}
				<p class="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
					{SOURCE_WARNING}
				</p>
			{/if}
		</div>

		<Separator />

		<CheckboxField
			bind:checked={draft.accept_release_upgrades}
			label="Allow upgrades based on preferences or versions"
			help="Whether to allow newer torrents that rank higher on your priorities to download and replace a previous version of the episode"
		/>

		<Separator />

		<SettingField
			largeLabel
			label="Priority of a torrent's attributes when determining the best torrent"
			help="If you have `One Piece - 850 [1080p HEVC]` and `One Piece - 850 [720p AVC]` and your preferences are, for example, strictly `AVC` and `1080p`, then ranking **Resolution** as higher than **Encoding** as a priority will allow Saberr to choose the `1080p HEVC` torrent."
			description="Version: release groups sometimes release a fixed/upgraded version of a torrent, e.g. One Piece - 850v2."
		>
			<RankedDndList
				value={draft.priorities_sorted}
				reorderOnly
				onChange={(v) => (draft.priorities_sorted = v as Priority[])}
				labelOf={(code) => PRIORITY_LABELS[code as Priority] ?? code}
				ariaLabel="Priority order"
			/>
		</SettingField>

		<SettingsFooter onSave={save} onReset={reset} {dirty} />
	</div>
</SettingsPageShell>
