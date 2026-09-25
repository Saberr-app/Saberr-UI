<script lang="ts">
	import SettingsPageShell from '$lib/components/settings/SettingsPageShell.svelte';
	import SettingsFooter from '$lib/components/settings/SettingsFooter.svelte';
	import SettingField from '$lib/components/settings/SettingField.svelte';
	import CheckboxField from '$lib/components/settings/CheckboxField.svelte';
	import SimpleSelect from '$lib/components/settings/SimpleSelect.svelte';
	import ServiceStatusBanner from '$lib/components/settings/ServiceStatusBanner.svelte';
	import TestConnectionButton from '$lib/components/settings/TestConnectionButton.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { settings } from '$lib/stores/settings.svelte';
	import { defaultSettings } from '$lib/config/settings-defaults';
	import { updateRss, testRssProxy } from '$lib/api/settings';
	import { notifySuccess } from '$lib/api/notify';
	import { RSS_CATEGORIES, type RssSettings } from '$lib/api/types';
	import {
		PROXY_PROTOCOLS,
		PROXY_LABELS,
		emptyProxyDraft,
		parseProxyConfig,
		composeProxyConfig,
		proxyErrors,
		hasProxyError,
		type ProxyDraft,
		type ProxySelection
	} from '$lib/rss/proxy';
	import { validatePositiveInt } from '$lib/utils/validation';
	import { focusFirstInvalid, settingsChanged } from '$lib/utils/form';
	import { tick } from 'svelte';
	import { slide } from 'svelte/transition';

	const MIN_MINUTES = 5;
	const categoryOptions = RSS_CATEGORIES.map((c) => ({ value: c, label: c }));

	let draft = $state<RssSettings>($state.snapshot(settings.current.rss));
	let attempted = $state(false);
	let formEl = $state<HTMLElement | null>(null);

	// Shown to the user in minutes; stored in seconds. Rounded if it doesn't divide cleanly.
	let minutes = $state<number | null>(Math.round(settings.current.rss.rss_check_frequency / 60));

	/* --- Proxy ---------------------------------------------------------------- */

	// `rss_proxy_config` is edited as separate fields and only recomposed on save, so it's excluded
	// from the structural compare; `proxyDirty` covers it instead.
	let proxy = $state<ProxyDraft>(parseProxyConfig(settings.current.rss.rss_proxy_config));
	// The fields stay on screen after switching to "Disabled" — cleared but visible — so it's obvious
	// that saving is what actually drops the stored config. Only a save (or a fresh load) hides them.
	let proxyFieldsShown = $state(settings.current.rss.rss_proxy_config !== null);
	// What was typed before switching to "Disabled", restored if the user switches back without saving.
	let stashed: ProxyDraft | null = null;
	let revealPassword = $state(false);

	const proxyOff = $derived(proxy.protocol === 'disabled');
	const errors = $derived(proxyErrors(proxy));
	const proxyDirty = $derived(
		settingsChanged(proxy, parseProxyConfig(settings.current.rss.rss_proxy_config))
	);
	// The test posts the on-screen config, so it needs a complete, valid one to build.
	const canTest = $derived(!proxyOff && !hasProxyError(errors));

	function selectProtocol(value: string) {
		const next = value as ProxySelection;
		if (next === proxy.protocol) return;
		if (next === 'disabled') {
			stashed = $state.snapshot(proxy);
			Object.assign(proxy, emptyProxyDraft());
			return;
		}
		if (proxyOff && stashed) {
			Object.assign(proxy, stashed);
			stashed = null;
		}
		proxy.protocol = next;
		proxyFieldsShown = true;
	}

	function omitProxyConfig(rss: RssSettings) {
		const { rss_proxy_config: _config, ...rest } = rss;
		void _config;
		return rest;
	}

	const dirty = $derived(
		settingsChanged(omitProxyConfig(draft), omitProxyConfig(settings.current.rss)) || proxyDirty
	);
	const minutesError = $derived(validatePositiveInt(minutes, MIN_MINUTES));
	const valid = $derived(!minutesError && !hasProxyError(errors));

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
		draft.rss_proxy_config = composeProxyConfig(proxy);
		if (proxyOff) draft.rss_proxy_torrent_files_enabled = false;

		const updated = await updateRss($state.snapshot(draft));
		settings.patch('rss', updated);
		// Re-seed from the echo: a cleared proxy now folds the fields away for good.
		proxy = parseProxyConfig(updated.rss_proxy_config);
		proxyFieldsShown = proxy.protocol !== 'disabled';
		stashed = null;
		notifySuccess('RSS settings saved.');
	}
	function reset() {
		draft = defaultSettings().rss;
		minutes = Math.round(draft.rss_check_frequency / 60);
		proxy = parseProxyConfig(draft.rss_proxy_config);
		proxyFieldsShown = proxy.protocol !== 'disabled';
		stashed = null;
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

		<Separator />

		<SettingField label="RSS Proxy Setup" largeLabel spaceContent>
			<div class="flex flex-col gap-5">
				<p class="text-sm text-muted-foreground">Route requests to the RSS feed through a proxy.</p>

				<RadioGroup.Root
					value={proxy.protocol}
					onValueChange={selectProtocol}
					class="flex flex-row flex-wrap gap-x-7 gap-y-3"
				>
					<div class="flex items-center gap-2">
						<RadioGroup.Item value="disabled" id="proxy-disabled" />
						<Label for="proxy-disabled" class="cursor-pointer text-sm">Disabled</Label>
					</div>
					{#each PROXY_PROTOCOLS as protocol (protocol)}
						<div class="flex items-center gap-2">
							<RadioGroup.Item value={protocol} id="proxy-{protocol}" />
							<Label for="proxy-{protocol}" class="cursor-pointer text-sm">
								{PROXY_LABELS[protocol]}
							</Label>
						</div>
					{/each}
				</RadioGroup.Root>

				{#if proxyFieldsShown}
					<div transition:slide={{ duration: 180 }} class="flex flex-col gap-5">
						<div class="flex flex-col gap-3 sm:flex-row sm:items-start">
							<div class="min-w-0 flex-1">
								<SettingField
									label="Host"
									htmlFor="proxy-host"
									required
									error={errors.host}
									showError={attempted}
								>
									<Input
										id="proxy-host"
										bind:value={proxy.host}
										disabled={proxyOff}
										autocomplete="off"
										placeholder="127.0.0.1"
										aria-invalid={attempted && errors.host ? 'true' : undefined}
									/>
								</SettingField>
							</div>
							<div class="sm:w-36">
								<SettingField
									label="Port"
									htmlFor="proxy-port"
									required
									error={errors.port}
									showError={attempted}
								>
									<Input
										id="proxy-port"
										inputmode="numeric"
										bind:value={proxy.port}
										disabled={proxyOff}
										autocomplete="off"
										placeholder="1080"
										aria-invalid={attempted && errors.port ? 'true' : undefined}
									/>
								</SettingField>
							</div>
						</div>

						<div class="grid gap-3 sm:grid-cols-2">
							<SettingField
								label="Username"
								htmlFor="proxy-username"
								description="Optional."
								error={errors.username}
								showError={attempted}
							>
								<Input
									id="proxy-username"
									bind:value={proxy.username}
									disabled={proxyOff}
									autocomplete="off"
									placeholder="No username"
									aria-invalid={attempted && errors.username ? 'true' : undefined}
								/>
							</SettingField>

							<SettingField
								label="Password"
								htmlFor="proxy-password"
								description="Optional."
								error={errors.password}
								showError={attempted}
							>
								<div class="relative">
									<Input
										id="proxy-password"
										type={revealPassword ? 'text' : 'password'}
										bind:value={proxy.password}
										disabled={proxyOff}
										autocomplete="off"
										placeholder="No password"
										class="pr-10"
										aria-invalid={attempted && errors.password ? 'true' : undefined}
									/>
									<button
										type="button"
										tabindex={-1}
										disabled={proxyOff}
										onclick={() => (revealPassword = !revealPassword)}
										aria-label={revealPassword ? 'Hide password' : 'Show password'}
										class="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
									>
										<Icon name={revealPassword ? 'eye-off' : 'eye'} size={16} />
									</button>
								</div>
							</SettingField>
						</div>

						<div>
							<TestConnectionButton
								label="Test proxy"
								disabled={!canTest}
								action={() => testRssProxy(composeProxyConfig(proxy)!)}
							/>
						</div>

						<CheckboxField
							bind:checked={draft.rss_proxy_torrent_files_enabled}
							disabled={proxyOff}
							label="Download torrent files via proxy"
							help="Otherwise, torrent links will be sent directly to the torrent client"
						/>
					</div>
				{/if}
			</div>
		</SettingField>

		<SettingsFooter onSave={save} onReset={reset} {dirty} {valid} onInvalid={revealErrors} />
	</div>
</SettingsPageShell>
