<script lang="ts">
	import SettingsPageShell from '$lib/components/settings/SettingsPageShell.svelte';
	import SettingsFooter from '$lib/components/settings/SettingsFooter.svelte';
	import SettingField from '$lib/components/settings/SettingField.svelte';
	import SimpleSelect from '$lib/components/settings/SimpleSelect.svelte';
	import SearchableSelect from '$lib/components/settings/SearchableSelect.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import { settings } from '$lib/stores/settings.svelte';
	import { defaultSettings } from '$lib/config/settings-defaults';
	import { updateGeneral } from '$lib/api/settings';
	import { notifySuccess } from '$lib/api/notify';
	import { TITLE_LANGUAGES, type GeneralSettings } from '$lib/api/types';
	import { validateHttpUrl, validatePositiveInt } from '$lib/utils/validation';
	import { blankToNull, settingsChanged, focusFirstInvalid } from '$lib/utils/form';
	import { tick } from 'svelte';

	// Backend minimums for the "set as failed after" timers.
	const MIN_DOWNLOAD_MINUTES = 5;
	const MIN_PROCESSING_MINUTES = 1;

	let draft = $state<GeneralSettings>($state.snapshot(settings.current.general));
	let attempted = $state(false);
	let formEl = $state<HTMLElement | null>(null);

	const dirty = $derived(settingsChanged(draft, settings.current.general));

	// Timezone list from the platform, with UTC guaranteed present.
	const timezones =
		typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC'];
	const tzOptions = (timezones.includes('UTC') ? timezones : ['UTC', ...timezones]).map((tz) => ({
		value: tz,
		label: tz
	}));
	const titleLangOptions = TITLE_LANGUAGES.map((l) => ({ value: l, label: l }));

	const timezoneError = $derived(draft.timezone.trim() ? null : 'Pick a timezone.');
	const urlError = $derived(validateHttpUrl(draft.published_url));
	const downloadError = $derived(
		validatePositiveInt(draft.set_download_as_failed_after_minutes, MIN_DOWNLOAD_MINUTES)
	);
	const processingError = $derived(
		validatePositiveInt(draft.set_processing_as_failed_after_minutes, MIN_PROCESSING_MINUTES)
	);
	const valid = $derived(!timezoneError && !urlError && !downloadError && !processingError);

	function revealErrors() {
		attempted = true;
		tick().then(() => focusFirstInvalid(formEl));
	}

	async function save() {
		// An empty optional URL must be sent as null, not "" (backend minLength=1).
		draft.published_url = blankToNull(draft.published_url);
		const updated = await updateGeneral($state.snapshot(draft));
		settings.patch('general', updated);
		notifySuccess('General settings saved.');
	}
	function reset() {
		draft = defaultSettings().general;
	}
</script>

<SettingsPageShell title="General" icon="general" {dirty}>
	<div class="flex flex-col gap-6" bind:this={formEl}>
		<SettingField
			label="Timezone"
			htmlFor="timezone"
			required
			error={timezoneError}
			showError={attempted}
		>
			<SearchableSelect id="timezone" bind:value={draft.timezone} options={tzOptions} />
		</SettingField>

		<SettingField label="Preferred Anime title display language" htmlFor="title-lang">
			<SimpleSelect
				id="title-lang"
				bind:value={draft.anilist_preferred_title_language}
				options={titleLangOptions}
			/>
		</SettingField>

		<SettingField
			label="Published URL"
			htmlFor="published-url"
			help=""
			error={urlError}
			showError={attempted}
		>
			<Input
				id="published-url"
				type="url"
				placeholder="https://saberr.example.com"
				bind:value={draft.published_url}
				aria-invalid={attempted && urlError ? 'true' : undefined}
			/>
		</SettingField>

		<Separator class="my-1" />

		<div class="flex flex-col gap-1.5">
			<div class="flex flex-wrap items-center gap-2 text-sm">
				<span>Set torrents that have been downloading for</span>
				<Input
					type="number"
					min={MIN_DOWNLOAD_MINUTES}
					class="h-8 w-20"
					bind:value={draft.set_download_as_failed_after_minutes}
					aria-invalid={attempted && downloadError ? 'true' : undefined}
				/>
				<span>minutes as failed.</span>
			</div>
			{#if attempted && downloadError}<p class="text-xs text-destructive">{downloadError}</p>{/if}
		</div>

		<div class="flex flex-col gap-1.5">
			<div class="flex flex-wrap items-center gap-2 text-sm">
				<span>Set torrents that have been processing/importing for</span>
				<Input
					type="number"
					min={MIN_PROCESSING_MINUTES}
					class="h-8 w-20"
					bind:value={draft.set_processing_as_failed_after_minutes}
					aria-invalid={attempted && processingError ? 'true' : undefined}
				/>
				<span>minutes as failed.</span>
			</div>
			{#if attempted && processingError}
				<p class="text-xs text-destructive">{processingError}</p>
			{/if}
		</div>

		<SettingsFooter onSave={save} onReset={reset} {dirty} {valid} onInvalid={revealErrors} />
	</div>
</SettingsPageShell>
