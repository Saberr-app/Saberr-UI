<script lang="ts">
	import SettingsPageShell from '$lib/components/settings/SettingsPageShell.svelte';
	import SettingsFooter from '$lib/components/settings/SettingsFooter.svelte';
	import SettingField from '$lib/components/settings/SettingField.svelte';
	import FormatInput, {
		hasUnknownToken,
		renderFormatPreview
	} from '$lib/components/settings/FormatInput.svelte';
	import TestConnectionButton from '$lib/components/settings/TestConnectionButton.svelte';
	import StructuringBadge from '$lib/components/settings/StructuringBadge.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { settings } from '$lib/stores/settings.svelte';
	import { defaultSettings } from '$lib/config/settings-defaults';
	import { updateProcessing, validatePath } from '$lib/api/settings';
	import {
		SAMPLE_SHOW_TITLE,
		SAMPLE_TOKEN_VALUES,
		EPISODE_SAMPLE_TOKEN_VALUES,
		TVDB_STRUCTURE_PREVIEW,
		ANILIST_STRUCTURE_PREVIEW
	} from '$lib/config/format-sample';
	import { status } from '$lib/stores/status.svelte';
	import { notifyError, notifySuccess } from '$lib/api/notify';
	import type { ProcessingSettings } from '$lib/api/types';
	import { blankToNull, settingsChanged, focusFirstInvalid } from '$lib/utils/form';
	import { tick } from 'svelte';

	let draft = $state<ProcessingSettings>($state.snapshot(settings.current.processing));
	let attempted = $state(false);
	let formEl = $state<HTMLElement | null>(null);

	const dirty = $derived(settingsChanged(draft, settings.current.processing));
	const meta = $derived(settings.current.meta);

	// `{show_name}` in the episode previews = the rendered show-folder-name format (live).
	const showNameSample = $derived(
		renderFormatPreview(draft.default_show_directory_name_format, SAMPLE_TOKEN_VALUES)
	);
	const episodeSamples = $derived({ ...EPISODE_SAMPLE_TOKEN_VALUES, show_name: showNameSample });

	// Live preview of the destination directory, honoring the user's slash style.
	const destPreview = $derived.by(() => {
		const v = draft.default_destination_directory ?? '';
		const slash = v.includes('\\') ? '\\' : '/';
		const base = v.replace(/[\\/]+$/, '');
		return `${base}${slash}${SAMPLE_SHOW_TITLE}${slash}...`;
	});

	// Block saving while any format references an unrecognized token.
	const formatsInvalid = $derived(
		hasUnknownToken(
			draft.default_show_directory_name_format,
			meta.show_directory_formatting_tokens
		) ||
			hasUnknownToken(
				draft.default_season_directory_name_format,
				meta.season_directory_formatting_tokens
			) ||
			hasUnknownToken(
				draft.default_raw_episode_file_name_format,
				meta.raw_episode_formatting_tokens
			) ||
			hasUnknownToken(
				draft.default_episode_file_name_format,
				meta.full_episode_formatting_tokens
			) ||
			hasUnknownToken(
				draft.default_titleless_episode_file_name_format,
				meta.titleless_episode_formatting_tokens
			)
	);

	// All five format fields are required (backend minLength=1).
	const formatsEmpty = $derived(
		!draft.default_show_directory_name_format.trim() ||
			!draft.default_season_directory_name_format.trim() ||
			!draft.default_raw_episode_file_name_format.trim() ||
			!draft.default_episode_file_name_format.trim() ||
			!draft.default_titleless_episode_file_name_format.trim()
	);
	const valid = $derived(!formatsInvalid && !formatsEmpty);

	function revealErrors() {
		attempted = true;
		tick().then(() => focusFirstInvalid(formEl));
	}

	// TVDB service problems surface as a toast at the top of this page (once).
	let toasted = false;
	$effect(() => {
		const svc = status.service('tvdb');
		if (svc && !svc.healthy && !toasted) {
			toasted = true;
			notifyError(svc.error_details ? `TVDB: ${svc.error_details}` : `TVDB: ${svc.error_level}`);
		}
	});

	async function save() {
		// Empty optional parent directory must be sent as null, not "" (minLength=1).
		draft.default_destination_directory = blankToNull(draft.default_destination_directory);
		const updated = await updateProcessing($state.snapshot(draft));
		settings.patch('processing', updated);
		notifySuccess('Processing settings saved.');
	}
	function reset() {
		draft = defaultSettings().processing;
	}
</script>

<SettingsPageShell title="Processing" icon="processing" {dirty}>
	<div class="flex flex-col gap-6" bind:this={formEl}>
		<p class="text-sm text-muted-foreground">These settings can be customized per tracked anime.</p>

		<!-- Prominent structuring choice (transparent — the strong border carries it). -->
		<div class="rounded-lg border-[3px] border-brand/40 bg-transparent p-4">
			<h2 class="mb-3 text-base font-medium">Episode structuring</h2>
			<RadioGroup.Root
				value={draft.tvdb_structure_enabled_default ? 'tvdb' : 'anilist'}
				onValueChange={(v) => (draft.tvdb_structure_enabled_default = v === 'tvdb')}
				class="gap-4"
			>
				<div class="flex flex-col gap-1.5">
					<div class="flex items-center gap-2">
						<RadioGroup.Item value="tvdb" id="struct-tvdb" />
						<Label for="struct-tvdb" class="cursor-pointer text-sm">TVDB Structuring</Label>
						<StructuringBadge type="tvdb" />
					</div>
					<pre
						class="pl-6 font-mono text-xs leading-relaxed whitespace-pre text-muted-foreground">{TVDB_STRUCTURE_PREVIEW}</pre>
				</div>
				<div class="flex flex-col gap-1.5">
					<div class="flex items-center gap-2">
						<RadioGroup.Item value="anilist" id="struct-anilist" />
						<Label for="struct-anilist" class="cursor-pointer text-sm">AniList Structuring</Label>
						<StructuringBadge type="anilist" />
					</div>
					<pre
						class="pl-6 font-mono text-xs leading-relaxed whitespace-pre text-muted-foreground">{ANILIST_STRUCTURE_PREVIEW}</pre>
				</div>
			</RadioGroup.Root>
		</div>

		<Separator />

		<SettingField
			largeLabel
			label="Parent directory for shows"
			htmlFor="dest-dir"
			help="Default parent directory for tracked anime. This is where new anime shows folders will be created."
		>
			<div class="flex flex-col gap-2">
				<div class="flex items-center gap-3">
					<Input id="dest-dir" bind:value={draft.default_destination_directory} />
					<TestConnectionButton
						variant="outline"
						label="Check"
						action={() => validatePath(draft.default_destination_directory ?? '')}
					/>
				</div>
				{#if draft.default_destination_directory}
					<p class="text-sm">
						<span class="text-muted-foreground">Preview:&nbsp;</span><span class="font-bold"
							>{destPreview}</span
						>
					</p>
				{/if}
			</div>
		</SettingField>

		<Separator />

		<SettingField
			largeLabel
			required
			label="Show folder name formatting (Autofill)"
			help="The formatting of the show folder name (used for autofilling in **add** tracked anime dialog)."
		>
			<FormatInput
				value={draft.default_show_directory_name_format}
				onChange={(v) => (draft.default_show_directory_name_format = v)}
				tokens={meta.show_directory_formatting_tokens}
				required
				showError={attempted}
			/>
		</SettingField>

		<Separator />

		<SettingField
			largeLabel
			required
			label="Season folder name formatting"
			help="The formatting of the season folder name."
		>
			{#snippet badge()}<StructuringBadge type="tvdb" />{/snippet}
			<FormatInput
				value={draft.default_season_directory_name_format}
				onChange={(v) => (draft.default_season_directory_name_format = v)}
				tokens={meta.season_directory_formatting_tokens}
				required
				showError={attempted}
			/>
		</SettingField>

		<Separator />

		<SettingField largeLabel required label="Episode file name formatting">
			{#snippet badge()}<StructuringBadge type="anilist" />{/snippet}
			<FormatInput
				value={draft.default_raw_episode_file_name_format}
				onChange={(v) => (draft.default_raw_episode_file_name_format = v)}
				tokens={meta.raw_episode_formatting_tokens}
				required
				showError={attempted}
				samples={episodeSamples}
			/>
		</SettingField>

		<Separator />

		<SettingField largeLabel required label="Episode file name formatting">
			{#snippet badge()}<StructuringBadge type="tvdb" />{/snippet}
			<FormatInput
				value={draft.default_episode_file_name_format}
				onChange={(v) => (draft.default_episode_file_name_format = v)}
				tokens={meta.full_episode_formatting_tokens}
				required
				showError={attempted}
				samples={episodeSamples}
			/>
		</SettingField>

		<Separator />

		<SettingField
			largeLabel
			required
			label="Episode file name formatting without an episode title"
			help="Sometimes TVDB won't have the title of an episode; such as immediately after release"
		>
			{#snippet badge()}<StructuringBadge type="tvdb" />{/snippet}
			<FormatInput
				value={draft.default_titleless_episode_file_name_format}
				onChange={(v) => (draft.default_titleless_episode_file_name_format = v)}
				tokens={meta.titleless_episode_formatting_tokens}
				required
				showError={attempted}
				samples={episodeSamples}
			/>
		</SettingField>

		<SettingsFooter onSave={save} onReset={reset} {dirty} {valid} onInvalid={revealErrors} />
	</div>
</SettingsPageShell>
