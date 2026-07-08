<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import Icon from '$lib/components/Icon.svelte';
	import PasswordField from './PasswordField.svelte';
	import { changePassword } from '$lib/api/credentials';
	import { notifySuccess } from '$lib/api/notify';
	import { isApiError } from '$lib/api/errors';
	import { status } from '$lib/stores/status.svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let oldPassword = $state('');
	let newPassword = $state('');
	let confirm = $state('');
	let showForgot = $state(false);
	let error = $state('');
	let busy = $state(false);

	// Reset transient state whenever the dialog opens.
	$effect(() => {
		if (open) {
			oldPassword = '';
			newPassword = '';
			confirm = '';
			showForgot = false;
			error = '';
		}
	});

	async function submit() {
		error = '';
		if (!oldPassword || !newPassword) {
			error = 'Enter your current and new password.';
			return;
		}
		if (newPassword !== confirm) {
			error = 'New passwords do not match.';
			return;
		}
		busy = true;
		try {
			await changePassword(oldPassword, newPassword);
			notifySuccess('Password changed');
			open = false;
			// The JWT is now invalid; one /status call trips the client's 401 → /login handling.
			void status.poll();
		} catch (e) {
			if (isApiError(e) && e.status === 401) error = 'Current password is incorrect.';
			else if (isApiError(e)) error = e.detail;
			else error = 'Could not reach the server.';
		} finally {
			busy = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Change password</Dialog.Title>
		</Dialog.Header>
		<div class="space-y-4">
			<div class="space-y-1.5">
				<PasswordField
					id="old-password"
					label="Current password"
					autocomplete="current-password"
					bind:value={oldPassword}
				/>
				<button
					type="button"
					class="text-xs text-muted-foreground hover:text-foreground"
					onclick={() => (showForgot = !showForgot)}
				>
					Forgot password?
				</button>
				{#if showForgot}
					<p class="text-xs text-muted-foreground">
						Log out and use the <span class="text-foreground">Reset password</span> option on the sign-in
						screen.
					</p>
				{/if}
			</div>
			<PasswordField
				id="new-password"
				label="New password"
				autocomplete="new-password"
				showWeakHint
				bind:value={newPassword}
			/>
			<PasswordField
				id="confirm-password"
				label="Confirm new password"
				autocomplete="new-password"
				bind:value={confirm}
			/>
			{#if error}<p class="text-sm text-destructive">{error}</p>{/if}
		</div>
		<Dialog.Footer>
			<Button type="button" variant="outline" disabled={busy} onclick={() => (open = false)}>
				Cancel
			</Button>
			<Button type="button" variant="affirmative" disabled={busy} onclick={submit}>
				{#if busy}<Icon name="spinner" size={16} class="animate-spin" />{/if}
				Change password
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
