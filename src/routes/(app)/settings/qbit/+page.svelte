<script lang="ts">
	import SettingsPageShell from '$lib/components/settings/SettingsPageShell.svelte';
	import SettingsFooter from '$lib/components/settings/SettingsFooter.svelte';
	import SettingField from '$lib/components/settings/SettingField.svelte';
	import CheckboxField from '$lib/components/settings/CheckboxField.svelte';
	import ServiceStatusBanner from '$lib/components/settings/ServiceStatusBanner.svelte';
	import TestConnectionButton from '$lib/components/settings/TestConnectionButton.svelte';
	import InlineMarkup from '$lib/components/settings/InlineMarkup.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import { settings } from '$lib/stores/settings.svelte';
	import { status } from '$lib/stores/status.svelte';
	import { updateQbit, testQbit, validatePath } from '$lib/api/settings';
	import { notifySuccess } from '$lib/api/notify';
	import type { QbitSettings, QbitSettingsUpdate, QbitConnection } from '$lib/api/types';
	import { validateHttpUrl } from '$lib/utils/validation';
	import { blankToNull, settingsChanged, focusFirstInvalid } from '$lib/utils/form';
	import { tick } from 'svelte';

	const HELP_TEXT =
		'To enable qBittorrent web service, go to **qBittorrent** → **Options** → **WebUI** → check "**Web User Interface (Remote Control)**" → set **IP address** (or leave `*`) → set **port** → set your **username** and **password** in Authentication.';

	// 8 asterisks shown when a password is set (the GET only tells us SET/UNSET, never the real value).
	const MASK = '********';
	const passwordMask = (p: 'SET' | 'UNSET') => (p === 'SET' ? MASK : '');

	let draft = $state<QbitSettings>($state.snapshot(settings.current.qbit));
	// The password is edited via its own field. `draft.qbit_password` keeps the GET sentinel and is
	// excluded from both the dirty compare and the PUT body (rebuilt in `save`/`connection`).
	let password = $state(passwordMask(settings.current.qbit.qbit_password));
	let attempted = $state(false);
	let formEl = $state<HTMLElement | null>(null);

	// What to send for qbit_password: OMIT when unchanged (still the mask / still empty), null when a
	// set password was cleared, the plaintext when newly typed.
	function passwordToSend(): { present: boolean; value: string | null } {
		const mask = passwordMask(settings.current.qbit.qbit_password);
		if (password === mask) return { present: false, value: null };
		if (password.trim() === '') return { present: true, value: null };
		return { present: true, value: password };
	}

	// Connection-only subset (blanks nulled) for the test endpoint; password follows the same rules.
	const connection = (): QbitConnection => {
		const pw = passwordToSend();
		return {
			qbit_base_url: blankToNull(draft.qbit_base_url),
			qbit_username: blankToNull(draft.qbit_username),
			...(pw.present ? { qbit_password: pw.value } : {})
		};
	};

	// qbit_password is a sentinel in the store, so it can't take part in the structural compare — its
	// dirtiness is tracked separately (cleared or newly typed = dirty).
	const withoutPassword = (q: QbitSettings) => {
		const { qbit_password: _pw, ...rest } = q;
		void _pw;
		return rest;
	};
	const passwordDirty = $derived(password !== passwordMask(settings.current.qbit.qbit_password));
	const dirty = $derived(
		settingsChanged(withoutPassword(draft), withoutPassword(settings.current.qbit)) || passwordDirty
	);
	const urlError = $derived(validateHttpUrl(draft.qbit_base_url));
	const stagingEmpty = $derived(!draft.staging_directory);
	const valid = $derived(!urlError);

	function revealErrors() {
		attempted = true;
		tick().then(() => focusFirstInvalid(formEl));
	}

	async function save() {
		// Empty optional strings must be sent as null, not "" (backend rejects "" on nullable minLength=1).
		draft.qbit_base_url = blankToNull(draft.qbit_base_url);
		draft.qbit_username = blankToNull(draft.qbit_username);
		draft.torrent_category = blankToNull(draft.torrent_category);
		draft.staging_directory = blankToNull(draft.staging_directory);

		// Capture whether the connection changed before patching the store.
		const before = settings.current.qbit;
		const pw = passwordToSend();
		const connectionChanged =
			draft.qbit_base_url !== before.qbit_base_url ||
			draft.qbit_username !== before.qbit_username ||
			pw.present;

		// Rebuild the body: omit qbit_password unless it was cleared (null) or newly typed (plaintext).
		const body: QbitSettingsUpdate = {
			...withoutPassword($state.snapshot(draft)),
			...(pw.present ? { qbit_password: pw.value } : {})
		};
		const updated = await updateQbit(body);
		settings.patch('qbit', updated);
		// Re-sync to the echo so the form reads clean again (masked when set, empty when cleared).
		draft.qbit_password = updated.qbit_password;
		password = passwordMask(updated.qbit_password);
		// A changed connection needs its health re-evaluated — show "waiting".
		if (connectionChanged) status.markServiceWaiting('qbit');
		notifySuccess('qBittorrent settings saved.');
	}
</script>

<SettingsPageShell title="qBit Service" icon="qbit" {dirty}>
	{#snippet banner()}
		<ServiceStatusBanner service="qbit" />
	{/snippet}

	<div class="flex flex-col gap-6" bind:this={formEl}>
		<!-- Section 1: connection (host / username / password) -->
		<div class="flex flex-col gap-6">
			<h2 class="text-lg font-semibold tracking-tight">Service Setup</h2>
			<SettingField
				label="Host"
				htmlFor="qbit-host"
				help="You can enter a local address (`http://ip_or_localhost:port`) or a custom domain (`https://qbit.example.com`)"
				error={urlError}
				showError={attempted}
			>
				<Input
					id="qbit-host"
					type="url"
					placeholder="http://localhost:8080"
					bind:value={draft.qbit_base_url}
					aria-invalid={attempted && urlError ? 'true' : undefined}
				/>
			</SettingField>

			<SettingField label="Username" htmlFor="qbit-username">
				<Input
					id="qbit-username"
					bind:value={draft.qbit_username}
					autocomplete="off"
					placeholder="No username"
				/>
			</SettingField>

			<SettingField label="Password" htmlFor="qbit-password">
				<Input
					id="qbit-password"
					type="password"
					placeholder="No password"
					bind:value={password}
					autocomplete="off"
				/>
			</SettingField>

			<p class="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
				<InlineMarkup text={HELP_TEXT} />
			</p>

			<div class="pt-3">
				<TestConnectionButton big action={() => testQbit(connection())} />
			</div>
		</div>

		<!-- Thicker divider between the two sections -->
		<div class="my-1 h-[3px] w-full rounded-full bg-border"></div>

		<!-- Section 2: download handling + tagging -->
		<div class="flex flex-col gap-6">
			<h2 class="text-lg font-semibold tracking-tight">Torrent Settings</h2>
			<SettingField
				label="Downloads directory"
				htmlFor="qbit-staging"
				help="This is where torrents are downloaded to before they're copied into their final destination"
				description="Required to enable “Organize downloads”."
			>
				<div class="flex items-center gap-3">
					<Input id="qbit-staging" bind:value={draft.staging_directory} placeholder="Not set" />
					<TestConnectionButton
						variant="outline"
						label="Check"
						action={() => validatePath(draft.staging_directory ?? '', false)}
					/>
				</div>
			</SettingField>

			<CheckboxField
				bind:checked={draft.organize_downloads}
				disabled={stagingEmpty}
				label="Organize downloads into anime directories"
				description="If enabled, torrents will be downloaded into folders matching the anime title."
			/>

			<SettingField label="qBit category for torrents sent by Saberr" htmlFor="qbit-category">
				<Input id="qbit-category" bind:value={draft.torrent_category} placeholder="Not set" />
			</SettingField>

			<Separator />

			<div class="flex flex-col gap-4">
				<h2 class="text-sm font-medium">Torrent tags</h2>
				<CheckboxField
					bind:checked={draft.apply_release_group_as_torrent_tag}
					label="Add the release group"
				/>
				<CheckboxField
					bind:checked={draft.apply_encoding_as_torrent_tag}
					label="Add the video encoding"
				/>
				<CheckboxField
					bind:checked={draft.apply_resolution_as_torrent_tag}
					label="Add the video resolution"
				/>
				<CheckboxField
					bind:checked={draft.apply_language_code_as_torrent_tag}
					label="Add the language code"
				/>
				<CheckboxField
					bind:checked={draft.apply_anime_title_as_torrent_tag}
					label="Add the related anime title"
				/>
			</div>
		</div>

		<SettingsFooter onSave={save} {dirty} {valid} onInvalid={revealErrors} />
	</div>
</SettingsPageShell>
