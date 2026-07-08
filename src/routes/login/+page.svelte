<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { login, getLastUsername } from '$lib/stores/auth';
	import { isApiError } from '$lib/api/errors';
	import {
		getCredentialsStatus,
		setupCredentials,
		requestPasswordReset,
		resetPasswordWithCode
	} from '$lib/api/credentials';
	import type { AppContext } from '$lib/api/types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import Icon from '$lib/components/Icon.svelte';
	import PasswordField from '$lib/components/auth/PasswordField.svelte';

	type View = 'loading' | 'signin' | 'setup' | 'reset';

	let view = $state<View>('loading');
	let context = $state<AppContext>('console');
	let isSet = $state(true);

	// Shared form state.
	let username = $state('');
	let password = $state('');
	let confirm = $state('');
	let stayLoggedIn = $state(false);
	let resetCode = $state('');
	let submitting = $state(false);
	let error = $state('');
	let banner = $state(''); // success notice on the signin view

	const canReset = $derived(isSet && context === 'windows');

	onMount(async () => {
		try {
			const status = await getCredentialsStatus();
			isSet = status.is_set;
			context = status.context;
			view = status.is_set ? 'signin' : 'setup';
		} catch {
			// Couldn't determine status — let the user try a normal sign-in.
			view = 'signin';
		}
		if (view === 'signin') username = getLastUsername();
	});

	/** Map a thrown ApiError to an inline message (401 = bad credentials/code). */
	function messageFor(e: unknown): string {
		if (isApiError(e) && e.status === 401) return 'Wrong username or password.';
		if (isApiError(e)) return e.detail;
		return 'Could not reach the server.';
	}

	async function handleSignin(event: SubmitEvent) {
		event.preventDefault();
		if (submitting) return;
		error = '';
		submitting = true;
		try {
			await login({ username, password, stay_logged_in: stayLoggedIn });
			goto('/tracked');
		} catch (e) {
			error = messageFor(e);
		} finally {
			submitting = false;
		}
	}

	async function handleSetup(event: SubmitEvent) {
		event.preventDefault();
		if (submitting) return;
		error = '';
		if (!username || !password) {
			error = 'Username and password are required.';
			return;
		}
		if (password !== confirm) {
			error = 'Passwords do not match.';
			return;
		}
		submitting = true;
		try {
			await setupCredentials({ username, password });
			// Auto-login straight into the dashboard with the just-set credentials.
			await login({ username, password, stay_logged_in: stayLoggedIn });
			goto('/tracked');
		} catch (e) {
			error = isApiError(e) ? e.detail : 'Could not reach the server.';
		} finally {
			submitting = false;
		}
	}

	/** Kick off the reset flow: request a code, then show the reset fields. */
	async function startReset() {
		error = '';
		banner = '';
		submitting = true;
		try {
			await requestPasswordReset();
			password = '';
			confirm = '';
			resetCode = '';
			view = 'reset';
		} catch (e) {
			error = isApiError(e) ? e.detail : 'Could not reach the server.';
		} finally {
			submitting = false;
		}
	}

	async function handleReset(event: SubmitEvent) {
		event.preventDefault();
		if (submitting) return;
		error = '';
		if (!resetCode || !password) {
			error = 'Reset code and new password are required.';
			return;
		}
		if (password !== confirm) {
			error = 'Passwords do not match.';
			return;
		}
		submitting = true;
		try {
			await resetPasswordWithCode(resetCode, password);
			password = '';
			confirm = '';
			resetCode = '';
			banner = 'Password reset. You can now sign in with your new password.';
			view = 'signin';
		} catch (e) {
			error = messageFor(e);
		} finally {
			submitting = false;
		}
	}

	function backToSignin() {
		error = '';
		password = '';
		confirm = '';
		view = 'signin';
		username = getLastUsername();
	}
</script>

<svelte:head><title>Sign in · Saberr</title></svelte:head>

<div class="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
	<div class="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
		<div class="mb-6 flex flex-col items-center gap-3 text-center">
			<img src="/logo-light.svg" alt="Saberr" class="h-24 w-24 dark:hidden" />
			<img src="/logo.svg" alt="Saberr" class="hidden h-24 w-24 dark:block" />
			<div>
				<h1 class="text-xl font-semibold tracking-tight">Saberr</h1>
				<p class="text-sm text-muted-foreground">
					{#if view === 'setup'}
						Set up your credentials
					{:else if view === 'reset'}
						Reset your password
					{:else}
						Sign in to continue
					{/if}
				</p>
			</div>
		</div>

		{#if view === 'loading'}
			<div class="flex justify-center py-6 text-muted-foreground">
				<Icon name="spinner" size={24} class="animate-spin" />
			</div>
		{:else if view === 'setup'}
			<form onsubmit={handleSetup} class="space-y-4">
				<div class="space-y-1.5">
					<label class="block text-sm font-medium" for="username">Username</label>
					<Input
						id="username"
						type="text"
						autocomplete="username"
						bind:value={username}
						class="h-10"
					/>
				</div>
				<PasswordField
					id="password"
					label="Password"
					autocomplete="new-password"
					showWeakHint
					bind:value={password}
				/>
				<PasswordField
					id="confirm"
					label="Confirm password"
					autocomplete="new-password"
					bind:value={confirm}
				/>
				{#if error}<p class="text-sm text-destructive">{error}</p>{/if}
				<Button type="submit" variant="affirmative" class="h-10 w-full" disabled={submitting}>
					{submitting ? 'Setting up…' : 'Create credentials'}
				</Button>
			</form>
		{:else if view === 'reset'}
			<form onsubmit={handleReset} class="space-y-4">
				<p class="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
					A reset code has been created and stored in a file inside the data directory (usually
					<code class="text-foreground">C:\ProgramData\Saberr</code>).
				</p>
				<div class="space-y-1.5">
					<label class="block text-sm font-medium" for="reset-code">Reset code</label>
					<Input
						id="reset-code"
						type="text"
						autocomplete="off"
						bind:value={resetCode}
						class="h-10"
					/>
				</div>
				<PasswordField
					id="new-password"
					label="New password"
					autocomplete="new-password"
					showWeakHint
					bind:value={password}
				/>
				<PasswordField
					id="confirm"
					label="Confirm new password"
					autocomplete="new-password"
					bind:value={confirm}
				/>
				{#if error}<p class="text-sm text-destructive">{error}</p>{/if}
				<Button type="submit" variant="affirmative" class="h-10 w-full" disabled={submitting}>
					{submitting ? 'Resetting…' : 'Reset password'}
				</Button>
				<button
					type="button"
					class="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
					onclick={backToSignin}
				>
					Back to sign in
				</button>
			</form>
		{:else}
			<form onsubmit={handleSignin} class="space-y-4">
				{#if banner}
					<p class="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{banner}</p>
				{/if}
				<div class="space-y-1.5">
					<label class="block text-sm font-medium" for="username">Username</label>
					<Input
						id="username"
						type="text"
						autocomplete="username"
						bind:value={username}
						class="h-10"
					/>
				</div>
				<PasswordField
					id="password"
					label="Password"
					autocomplete="current-password"
					bind:value={password}
				/>
				<label class="flex cursor-pointer items-center gap-2 text-sm">
					<input
						type="checkbox"
						bind:checked={stayLoggedIn}
						class="h-4 w-4 rounded border-input accent-brand"
					/>
					<span>Stay logged in</span>
				</label>
				{#if error}<p class="text-sm text-destructive">{error}</p>{/if}
				<Button type="submit" class="h-10 w-full" disabled={submitting}>
					{submitting ? 'Signing in…' : 'Sign in'}
				</Button>
				{#if canReset}
					<button
						type="button"
						class="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
						onclick={startReset}
						disabled={submitting}
					>
						Reset password
					</button>
				{/if}
			</form>
		{/if}
	</div>
</div>
