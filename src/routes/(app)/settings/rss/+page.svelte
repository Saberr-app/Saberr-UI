<script lang="ts">
	import SettingsPageShell from '$lib/components/settings/SettingsPageShell.svelte';
	import SettingsFooter from '$lib/components/settings/SettingsFooter.svelte';
	import SettingField from '$lib/components/settings/SettingField.svelte';
	import CheckboxField from '$lib/components/settings/CheckboxField.svelte';
	import SimpleSelect from '$lib/components/settings/SimpleSelect.svelte';
	import ServiceStatusBanner from '$lib/components/settings/ServiceStatusBanner.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import { settings } from '$lib/stores/settings.svelte';
	import { defaultSettings } from '$lib/config/settings-defaults';
	import { updateRss } from '$lib/api/settings';
	import { notifySuccess } from '$lib/api/notify';
	import { RSS_CATEGORIES, type RssSettings } from '$lib/api/types';
	import { validatePositiveInt } from '$lib/utils/validation';
	import { focusFirstInvalid, settingsChanged } from '$lib/utils/form';
	import { tick } from 'svelte';

	const MIN_MINUTES = 5;
	const categoryOptions = RSS_CATEGORIES.map((c) => ({ value: c, label: c }));

	let draft = $state<RssSettings>($state.snapshot(settings.current.rss));
	let attempted = $state(false);
	let formEl = $state<HTMLElement | null>(null);

	// Shown to the user in minutes; stored in seconds. Rounded if it doesn't divide cleanly.
	let minutes = $state<number | null>(Math.round(settings.current.rss.rss_check_frequency / 60));

	const dirty = $derived(settingsChanged(draft, settings.current.rss));
	const minutesError = $derived(validatePositiveInt(minutes, MIN_MINUTES));
	const valid = $derived(!minutesError);

	function revealErrors() {
		attempted = true;
		tick().then(() => focusFirstInvalid(formEl));
	}
	// The poll interval is read at startup, so an edit only applies after a restart.
	const frequencyChanged = $derived(
		draft.rss_check_frequency !== settings.current.rss.rss_check_frequency
	);

	function onMinutesInput() {
		if (minutes === null || !Number.isFinite(minutes)) return;
		draft.rss_check_frequency = Math.round(minutes) * 60;
	}

	async function save() {
		const updated = await updateRss($state.snapshot(draft));
		settings.patch('rss', updated);
		notifySuccess('RSS settings saved.');
	}
	function reset() {
		draft = defaultSettings().rss;
		minutes = Math.round(draft.rss_check_frequency / 60);
	}
</script>

<SettingsPageShell title="RSS Service" icon="rss" {dirty}>
	{#snippet banner()}
		<ServiceStatusBanner service="rss" />
	{/snippet}

	<div class="flex flex-col gap-6" bind:this={formEl}>
		<SettingField label="RSS Consumer" largeLabel spaceContent>
			<div class="flex flex-col gap-3">
				<CheckboxField
					bind:checked={draft.auto_download}
					label="Auto-download torrents"
					help="Whether new torrents should auto-download if they meet the requirements"
				/>

				<SettingField
					label="RSS check frequency (minutes)"
					htmlFor="rss-frequency"
					required
					help="How often Saberr should check for new releases"
					error={minutesError}
					showError={attempted}
				>
					<Input
						id="rss-frequency"
						type="number"
						min={MIN_MINUTES}
						class="w-32"
						bind:value={minutes}
						oninput={onMinutesInput}
						aria-invalid={attempted && minutesError ? 'true' : undefined}
					/>
					{#if frequencyChanged && !minutesError}
						<p class="mt-2 text-xs text-warning">
							Changes to the check frequency won't take effect until Saberr is restarted.
						</p>
					{/if}
				</SettingField>
			</div>
		</SettingField>

		<Separator />

		<SettingField label="Filters" largeLabel spaceContent>
			<SettingField
				label="Category"
				htmlFor="rss-category"
				help="This determines the search category for both the RSS consumer and manual search. Set 'All' to disable filtering."
			>
				<div class="max-w-xs">
					<SimpleSelect
						id="rss-category"
						bind:value={draft.rss_category}
						options={categoryOptions}
					/>
				</div>
			</SettingField>
		</SettingField>

		<SettingsFooter onSave={save} onReset={reset} {dirty} {valid} onInvalid={revealErrors} />
	</div>
</SettingsPageShell>
