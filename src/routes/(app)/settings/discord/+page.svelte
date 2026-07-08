<script lang="ts">
	import SettingsPageShell from '$lib/components/settings/SettingsPageShell.svelte';
	import SettingsFooter from '$lib/components/settings/SettingsFooter.svelte';
	import SettingField from '$lib/components/settings/SettingField.svelte';
	import CheckboxField from '$lib/components/settings/CheckboxField.svelte';
	import TestConnectionButton from '$lib/components/settings/TestConnectionButton.svelte';
	import ServiceStatusBanner from '$lib/components/settings/ServiceStatusBanner.svelte';
	import InlineMarkup from '$lib/components/settings/InlineMarkup.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import Icon from '$lib/components/Icon.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { status } from '$lib/stores/status.svelte';
	import { updateDiscord, testDiscord } from '$lib/api/settings';
	import { notifyInfo, notifySuccess } from '$lib/api/notify';
	import { resolveBackendUrl } from '$lib/config/api';
	import type { DiscordSettings } from '$lib/api/types';
	import {
		validateHttpUrl,
		validateSnowflake,
		validateDiscordWebhookUsername
	} from '$lib/utils/validation';
	import { blankToNull, settingsChanged, focusFirstInvalid } from '$lib/utils/form';
	import { tick } from 'svelte';
	import { slide } from 'svelte/transition';

	const HELPER =
		'Create a Discord webhook by **right-clicking** a channel → **Edit Channel** → **Integrations** → **Create/New Webhook** → click on the webhook you just created → configure it with an avatar and a name (optional) → **Copy Webhook URL** and paste it into the field below.';

	let draft = $state<DiscordSettings>($state.snapshot(settings.current.discord));
	let attempted = $state(false);
	let formEl = $state<HTMLElement | null>(null);
	let helpOpen = $state(false);

	// Avatar URL dialog (draft until confirmed; the avatar saves with the rest of the form).
	let avatarDialogOpen = $state(false);
	let avatarUrlDraft = $state('');
	const avatarUrlDraftError = $derived(validateHttpUrl(blankToNull(avatarUrlDraft)));

	const dirty = $derived(settingsChanged(draft, settings.current.discord));
	const notificationsError = $derived(
		validateHttpUrl(draft.notifications_discord_webhook_url, { httpsOnly: true })
	);
	const usernameError = $derived(validateDiscordWebhookUsername(draft.discord_webhook_username));
	const userIdError = $derived(validateSnowflake(draft.discord_user_id));
	const valid = $derived(!notificationsError && !usernameError && !userIdError);

	const hasAvatar = $derived(!!draft.discord_webhook_avatar_url?.trim());
	const avatarUrl = $derived(resolveBackendUrl(draft.discord_webhook_avatar_url));

	function revealErrors() {
		attempted = true;
		tick().then(() => focusFirstInvalid(formEl));
	}

	// The test endpoint requires a non-empty webhook — don't fire it on a blank field.
	async function testWebhook(): Promise<boolean> {
		const url = blankToNull(draft.notifications_discord_webhook_url);
		if (!url) {
			notifyInfo('Enter a webhook URL first.');
			return false;
		}
		return testDiscord(url);
	}

	function openAvatarDialog() {
		avatarUrlDraft = draft.discord_webhook_avatar_url ?? '';
		avatarDialogOpen = true;
	}

	function confirmAvatar() {
		if (avatarUrlDraftError) return;
		draft.discord_webhook_avatar_url = blankToNull(avatarUrlDraft);
		avatarDialogOpen = false;
	}

	function removeAvatar() {
		draft.discord_webhook_avatar_url = null;
	}

	async function save() {
		// Empty optional strings must be sent as null, not "" (backend minLength=1).
		draft.notifications_discord_webhook_url = blankToNull(draft.notifications_discord_webhook_url);
		draft.discord_webhook_username = blankToNull(draft.discord_webhook_username);
		draft.discord_webhook_avatar_url = blankToNull(draft.discord_webhook_avatar_url);
		draft.discord_user_id = blankToNull(draft.discord_user_id);

		// Capture whether the webhook URL changed before patching the store.
		const before = settings.current.discord;
		const notificationsChanged =
			draft.notifications_discord_webhook_url !== before.notifications_discord_webhook_url;

		const updated = await updateDiscord($state.snapshot(draft));
		settings.patch('discord', updated);
		// A changed webhook URL needs its health re-evaluated — show "waiting".
		if (notificationsChanged) status.markServiceWaiting('notifications_discord_webhook');
		notifySuccess('Discord settings saved.');
	}
</script>

<SettingsPageShell title="Discord Notifications" icon="discord" {dirty}>
	{#snippet banner()}
		<ServiceStatusBanner service="notifications_discord_webhook" />
	{/snippet}

	<div class="flex flex-col gap-6" bind:this={formEl}>
		<!-- Section 1: Webhook Setup -->
		<div class="flex flex-col gap-5">
			<h2 class="text-lg font-semibold tracking-tight">Webhook Setup</h2>

			<!-- Collapsible "How to setup" -->
			<div>
				<button
					type="button"
					onclick={() => (helpOpen = !helpOpen)}
					aria-expanded={helpOpen}
					class="inline-flex items-center gap-1.5 text-sm font-medium text-info transition-opacity hover:opacity-80"
				>
					How to setup
					<Icon
						name="chevron-right"
						size={15}
						class={'transition-transform ' + (helpOpen ? 'rotate-90' : '')}
					/>
				</button>
				{#if helpOpen}
					<p
						transition:slide={{ duration: 180 }}
						class="mt-2 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground"
					>
						<InlineMarkup text={HELPER} />
					</p>
				{/if}
			</div>

			<div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
				<!-- Avatar + change control -->
				<div class="flex flex-col items-center gap-2">
					<div
						class="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted"
					>
						{#if avatarUrl}
							<img
								src={avatarUrl}
								alt={draft.discord_webhook_username ?? 'Webhook avatar'}
								class="size-full object-cover"
							/>
						{:else}
							<Icon name="discord" size={36} class="text-muted-foreground" />
						{/if}
					</div>
					<div class="flex items-center gap-1.5">
						<Button type="button" variant="outline" size="sm" onclick={openAvatarDialog}>
							<Icon name={hasAvatar ? 'edit' : 'plus'} size={14} />
							{hasAvatar ? 'Change' : 'Add'}
						</Button>
						{#if hasAvatar}
							<Button
								type="button"
								variant="outline"
								size="sm"
								aria-label="Remove avatar"
								title="Remove avatar"
								class="px-2 text-muted-foreground hover:text-destructive"
								onclick={removeAvatar}
							>
								<Icon name="trash" size={14} />
							</Button>
						{/if}
					</div>
				</div>

				<!-- Username + webhook URL -->
				<div class="flex min-w-0 flex-1 flex-col gap-5">
					<SettingField
						label="Webhook username"
						htmlFor="discord-webhook-username"
						description="Optional: webhook username in notification messages."
						error={usernameError}
						showError={attempted}
					>
						<Input
							id="discord-webhook-username"
							placeholder="Not set"
							bind:value={draft.discord_webhook_username}
							aria-invalid={attempted && usernameError ? 'true' : undefined}
						/>
					</SettingField>

					<SettingField
						label="Discord webhook URL"
						htmlFor="notifications-webhook"
						error={notificationsError}
						showError={attempted}
					>
						<div class="flex items-center gap-3">
							<Input
								id="notifications-webhook"
								type="url"
								placeholder="https://discord.com/api/webhooks/…"
								bind:value={draft.notifications_discord_webhook_url}
								aria-invalid={attempted && notificationsError ? 'true' : undefined}
							/>
							<TestConnectionButton variant="outline" label="Test" action={testWebhook} />
						</div>
					</SettingField>
				</div>
			</div>
		</div>

		<div class="my-1 h-[3px] w-full rounded-full bg-border"></div>

		<!-- Section 2: Customization -->
		<div class="flex flex-col gap-5">
			<h2 class="text-lg font-semibold tracking-tight">Customization</h2>
			<SettingField
				label="Discord user ID"
				htmlFor="discord-user-id"
				description="Optional: For pings on error notifications."
				error={userIdError}
				showError={attempted}
			>
				<Input
					id="discord-user-id"
					class="max-w-xs"
					placeholder="Not set"
					bind:value={draft.discord_user_id}
					aria-invalid={attempted && userIdError ? 'true' : undefined}
				/>
			</SettingField>
		</div>

		<div class="my-1 h-[3px] w-full rounded-full bg-border"></div>

		<!-- Section 3: Notifications -->
		<div class="flex flex-col gap-5">
			<h2 class="text-lg font-semibold tracking-tight">Notifications</h2>
			<div class="flex flex-col gap-3">
				<CheckboxField label="Notify on new login" bind:checked={draft.discord_notify_on_login} />
				<CheckboxField
					label="Notify on episode imported"
					bind:checked={draft.discord_notify_on_download_processed}
				/>
				<CheckboxField
					label="Notify on episode upgraded"
					bind:checked={draft.discord_notify_on_upgrade_download_processed}
				/>
				<CheckboxField
					label="Notify on download/import failed"
					bind:checked={draft.discord_notify_on_download_failed}
				/>
			</div>
		</div>

		<SettingsFooter onSave={save} {dirty} {valid} onInvalid={revealErrors} />
	</div>
</SettingsPageShell>

<Dialog.Root bind:open={avatarDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{hasAvatar ? 'Change' : 'Add'} webhook avatar</Dialog.Title>
		</Dialog.Header>
		<SettingField
			label="Image URL"
			htmlFor="discord-avatar-url"
			description="Direct link to a JPG, PNG or GIF image."
			error={avatarUrlDraftError}
			showError
		>
			<Input
				id="discord-avatar-url"
				type="url"
				placeholder="https://example.com/avatar.png"
				bind:value={avatarUrlDraft}
				aria-invalid={avatarUrlDraftError ? 'true' : undefined}
			/>
		</SettingField>
		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={() => (avatarDialogOpen = false)}>
				Cancel
			</Button>
			<Button
				type="button"
				variant="affirmative"
				disabled={!!avatarUrlDraftError}
				onclick={confirmAvatar}
			>
				{hasAvatar ? 'Save' : 'Add'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
