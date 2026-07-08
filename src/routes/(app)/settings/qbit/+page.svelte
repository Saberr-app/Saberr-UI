<script lang="ts">
	import SettingsPageShell from '$lib/components/settings/SettingsPageShell.svelte';
	import SettingsFooter from '$lib/components/settings/SettingsFooter.svelte';
	import SettingField from '$lib/components/settings/SettingField.svelte';
	import CheckboxField from '$lib/components/settings/CheckboxField.svelte';
	import ServiceStatusBanner from '$lib/components/settings/ServiceStatusBanner.svelte';
	import TestConnectionButton from '$lib/components/settings/TestConnectionButton.svelte';
	import InlineMarkup from '$lib/components/settings/InlineMarkup.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { settings } from '$lib/stores/settings.svelte';
	import { status } from '$lib/stores/status.svelte';
	import { updateQbit, testQbit } from '$lib/api/settings';
	import { notifySuccess } from '$lib/api/notify';
	import type { QbitSettings, QbitSettingsUpdate, QbitConnection } from '$lib/api/types';
	import { validateHttpUrl } from '$lib/utils/validation';
	import { blankToNull, settingsChanged, focusFirstInvalid } from '$lib/utils/form';
	import { tick } from 'svelte';
	import { slide } from 'svelte/transition';

	const HELP_TEXT =
		'To enable qBittorrent web service, go to **qBittorrent** → **Options** → **WebUI** → check "**Web User Interface (Remote Control)**" → set **IP address** (or leave `*`) → set **port** → set your **username** and **password** in Authentication.';

	// 8 asterisks shown when a password is set (the GET only tells us SET/UNSET, never the real value).
	const MASK = '********';
	const passwordMask = (p: 'SET' | 'UNSET') => (p === 'SET' ? MASK : '');

	// Illustrative colours for the worked example (theme-aware literal strings for Tailwind v4).
	const C_REMOTE = 'text-purple-600 dark:text-purple-400';
	const C_LOCAL = 'text-green-600 dark:text-green-400';
	const C_SUFFIX = 'text-blue-700 dark:text-blue-400';

	let draft = $state<QbitSettings>($state.snapshot(settings.current.qbit));
	// The password is edited via its own field. `draft.qbit_password` keeps the GET sentinel and is
	// excluded from both the dirty compare and the PUT body (rebuilt in `save`/`connection`).
	let password = $state(passwordMask(settings.current.qbit.qbit_password));
	let attempted = $state(false);
	let formEl = $state<HTMLElement | null>(null);

	// Remote path mapping: expanded whenever a value is already set (either half present), else collapsed
	// to a "Set" link. All-or-nothing — both required once active (validated on Save).
	let mappingActive = $state(
		!!settings.current.qbit.qbit_remote_path_mapping_remote_path ||
			!!settings.current.qbit.qbit_remote_path_mapping_local_path
	);
	let exampleOpen = $state(false);
	// Which path field is being edited — mismatch warnings show only for the focused field.
	let editingField = $state<'remote' | 'downloads' | null>(null);

	// The downloads directory should sit under the remote path. Prefix must break on a path separator —
	// `S:\.releasing` is NOT under `S:\.releasing-anime` — and trailing slashes are ignored.
	const stripTrail = (s: string) => s.replace(/[/\\]+$/, '');
	const downloadsUnderRemote = (downloads: string, remote: string) => {
		const d = stripTrail(downloads);
		const r = stripTrail(remote);
		return d === r || d.startsWith(r + '/') || d.startsWith(r + '\\');
	};
	const pathsMismatch = $derived(
		mappingActive &&
			!!draft.staging_directory?.trim() &&
			!!draft.qbit_remote_path_mapping_remote_path?.trim() &&
			!downloadsUnderRemote(draft.staging_directory, draft.qbit_remote_path_mapping_remote_path)
	);
	const remoteMissing = $derived(
		mappingActive && !draft.qbit_remote_path_mapping_remote_path?.trim()
	);
	const localMissing = $derived(
		mappingActive && !draft.qbit_remote_path_mapping_local_path?.trim()
	);
	const mappingIncomplete = $derived(remoteMissing || localMissing);

	// Clicking "Set" only shows while unset, so remote is empty here — autofill from the downloads dir.
	function activateMapping() {
		mappingActive = true;
		if (draft.staging_directory?.trim() && !draft.qbit_remote_path_mapping_remote_path) {
			draft.qbit_remote_path_mapping_remote_path = draft.staging_directory;
		}
	}
	function removeMapping() {
		draft.qbit_remote_path_mapping_remote_path = null;
		draft.qbit_remote_path_mapping_local_path = null;
		mappingActive = false;
	}

	// "Organize" is gated on a custom downloads directory: empty ⇒ force unchecked (control also
	// disabled); the moment one is entered, default it to checked (user can still uncheck afterwards).
	let stagingWasEmpty = !settings.current.qbit.staging_directory?.trim();
	$effect(() => {
		const empty = !draft.staging_directory?.trim();
		if (empty) draft.organize_downloads = false;
		else if (stagingWasEmpty) draft.organize_downloads = true;
		stagingWasEmpty = empty;
	});

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
	const stagingEmpty = $derived(!draft.staging_directory?.trim());
	const valid = $derived(!urlError && !mappingIncomplete);

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
		// All-or-nothing is guaranteed by `valid`; removed mapping ⇒ both null.
		draft.qbit_remote_path_mapping_remote_path = blankToNull(
			draft.qbit_remote_path_mapping_remote_path
		);
		draft.qbit_remote_path_mapping_local_path = blankToNull(
			draft.qbit_remote_path_mapping_local_path
		);

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

		<!-- Section 2: remote path mapping -->
		<div class="flex flex-col gap-5">
			<h2 class="text-lg font-semibold tracking-tight">Remote path mapping</h2>

			<!-- Info banner + collapsible worked example -->
			<div class="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
				<p>
					This setting is only needed if qBittorrent reports download paths that Saberr can't
					access, typically when qBit runs in a separate container (docker) or on another machine.
					You might find this
					<a
						href="https://wiki.servarr.com/docker-guide#consistent-and-well-planned-paths"
						target="_blank"
						rel="noopener"
						class="text-info underline underline-offset-2 hover:opacity-80"
					>
						Servarr docker guide
					</a>
					helpful if you're on docker.
				</p>

				<button
					type="button"
					onclick={() => (exampleOpen = !exampleOpen)}
					aria-expanded={exampleOpen}
					class="mt-2 inline-flex items-center gap-1.5 font-medium text-info transition-opacity hover:opacity-80"
				>
					Show example
					<Icon
						name="chevron-right"
						size={14}
						class={'transition-transform ' + (exampleOpen ? 'rotate-90' : '')}
					/>
				</button>

				{#if exampleOpen}
					<div
						transition:slide={{ duration: 180 }}
						class="mt-2 flex flex-col gap-3 rounded-md border border-border bg-background/60 p-3"
					>
						<div class="flex flex-col gap-1.5">
							<p>Remote file path, as seen by qBittorrent:</p>
							<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] break-all">
								<span class={C_REMOTE}>/downloads</span><span class={C_SUFFIX}
									>/anime/Abc/Episode 1.mkv</span
								>
							</code>
							<p class="mt-1">Local file path of the same file, as seen by Saberr:</p>
							<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] break-all">
								<span class={C_LOCAL}>/qbit_downloads</span><span class={C_SUFFIX}
									>/anime/Abc/Episode 1.mkv</span
								>
							</code>
						</div>
						<Icon
							name="arrow-right"
							size={18}
							class="rotate-90 self-center text-muted-foreground"
						/>
						<div class="flex flex-col items-center gap-1 text-center">
							<p class="font-semibold text-foreground">Mapping</p>
							<p>
								Remote path:
								<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] break-all">
									<span class={C_REMOTE}>/downloads</span>
								</code>
							</p>
							<p>
								Local path:
								<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] break-all">
									<span class={C_LOCAL}>/qbit_downloads</span>
								</code>
							</p>
						</div>
					</div>
				{/if}
			</div>

			<!-- Mapping control: "Set" link when unset, two inputs + "Remove mapping" when active -->
			{#if !mappingActive}
				<button
					type="button"
					onclick={activateMapping}
					class="self-start text-sm font-medium text-info transition-opacity hover:opacity-80"
				>
					Set remote path mapping
				</button>
			{:else}
				<div class="flex flex-col gap-3">
					<div class="flex flex-col gap-3 sm:flex-row sm:items-start">
						<!-- Remote path -->
						<div class="flex min-w-0 flex-1 flex-col gap-1.5">
							<Label for="qbit-remote-path" required class="text-sm font-medium">Remote path</Label>
							<Input
								id="qbit-remote-path"
								bind:value={draft.qbit_remote_path_mapping_remote_path}
								aria-invalid={attempted && remoteMissing ? 'true' : undefined}
								onfocus={() => (editingField = 'remote')}
								onblur={() => (editingField = null)}
							/>
							{#if attempted && remoteMissing}
								<p class="text-xs text-destructive">Required.</p>
							{:else if editingField === 'remote' && pathsMismatch}
								<p class="text-xs text-warning">
									Tip: this doesn't match your custom downloads directory.
								</p>
							{:else}
								<p class="text-xs text-muted-foreground">Root path, as seen by qBit</p>
							{/if}
						</div>

						<!-- Arrow: points down on mobile, right on desktop -->
						<Icon
							name="arrow-right"
							size={18}
							class="shrink-0 rotate-90 self-center text-muted-foreground sm:mt-8 sm:rotate-0 sm:self-start"
						/>

						<!-- Local path -->
						<div class="flex min-w-0 flex-1 flex-col gap-1.5">
							<Label for="qbit-local-path" required class="text-sm font-medium">Local path</Label>
							<Input
								id="qbit-local-path"
								bind:value={draft.qbit_remote_path_mapping_local_path}
								aria-invalid={attempted && localMissing ? 'true' : undefined}
							/>
							{#if attempted && localMissing}
								<p class="text-xs text-destructive">Required.</p>
							{:else}
								<p class="text-xs text-muted-foreground">
									Path to the same directory, as seen by Saberr
								</p>
							{/if}
						</div>
					</div>

					<button
						type="button"
						onclick={removeMapping}
						class="self-start text-sm font-medium text-destructive transition-opacity hover:opacity-80"
					>
						Remove mapping
					</button>
				</div>
			{/if}
		</div>

		<!-- Thicker divider between the two sections -->
		<div class="my-1 h-[3px] w-full rounded-full bg-border"></div>

		<!-- Section 3: download handling + tagging -->
		<div class="flex flex-col gap-6">
			<h2 class="text-lg font-semibold tracking-tight">Torrent Settings</h2>
			<SettingField
				label="Custom downloads directory"
				htmlFor="qbit-staging"
				help="This is where torrents are downloaded to before they're copied into their final destination"
				description="**As seen by qBittorrent**."
			>
				<Input
					id="qbit-staging"
					bind:value={draft.staging_directory}
					placeholder="Not set"
					onfocus={() => (editingField = 'downloads')}
					onblur={() => (editingField = null)}
				/>
				{#if editingField === 'downloads' && pathsMismatch}
					<p class="text-xs text-warning">Tip: this doesn't match with your remote mapping path.</p>
				{/if}
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
