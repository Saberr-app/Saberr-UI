<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { getBackups, createBackup, restoreBackup, deleteBackup } from '$lib/api/system';
	import { notifySuccess } from '$lib/api/notify';
	import { formatBytes } from '$lib/utils/number';
	import { formatAbsolute } from '$lib/utils/time';
	import { cn } from '$lib/utils';
	import type { BackupItem } from '$lib/api/types';

	let backups = $state<BackupItem[] | null>(null);
	let loadFailed = $state(false);
	let creating = $state(false);

	// Both confirm flows share one target-filename each; opening sets it, the dialog reads it.
	let restoreOpen = $state(false);
	let restoreTarget = $state<BackupItem | null>(null);
	let deleteOpen = $state(false);
	let deleteTarget = $state<BackupItem | null>(null);

	onMount(load);

	async function load() {
		try {
			const res = await getBackups();
			backups = res.backups;
			loadFailed = false;
		} catch {
			loadFailed = true;
		}
	}

	// Newest first — the backend returns them unordered.
	const sorted = $derived(
		backups ? [...backups].sort((a, b) => b.created_at.localeCompare(a.created_at)) : []
	);

	async function create() {
		creating = true;
		try {
			const item = await createBackup();
			backups = [item, ...(backups ?? []).filter((b) => b.filename !== item.filename)];
			notifySuccess('Backup created.');
		} finally {
			creating = false;
		}
	}

	async function confirmRestore() {
		if (!restoreTarget) return;
		await restoreBackup(restoreTarget.filename);
		notifySuccess('Restore scheduled for the next restart. A fresh backup is being created.');
		void load(); // pick up the just-created safety backup
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		const { filename } = deleteTarget;
		await deleteBackup(filename);
		backups = (backups ?? []).filter((b) => b.filename !== filename);
		notifySuccess('Backup deleted.');
	}
</script>

<section class="flex flex-col gap-3">
	<div class="flex items-center justify-between gap-3">
		<h2 class="flex items-center gap-2 text-sm font-semibold">
			<Icon name="archive" size={16} class="text-muted-foreground" />
			Backups
		</h2>
		<Button variant="outline" size="sm" disabled={creating} onclick={create}>
			{#if creating}<Icon name="spinner" size={15} class="animate-spin" />{:else}<Icon
					name="plus"
					size={15}
				/>{/if}
			Create backup
		</Button>
	</div>

	{#if loadFailed}
		<p class="text-sm text-muted-foreground">Couldn't load backups.</p>
	{:else if !backups}
		<p class="text-sm text-muted-foreground">Loading…</p>
	{:else if sorted.length === 0}
		<p class="text-sm text-muted-foreground">No backups yet.</p>
	{:else}
		<div class="overflow-hidden rounded-lg border border-border">
			{#each sorted as backup, i (backup.filename)}
				<div
					class={cn('flex items-center gap-4 bg-card px-4 py-3', i > 0 && 'border-t border-border')}
				>
					<div class="flex min-w-0 flex-1 flex-col gap-0.5">
						<span class="truncate text-sm font-medium" title={backup.filename}>
							{backup.filename}
						</span>
						<span class="truncate font-mono text-xs text-muted-foreground" title={backup.location}>
							{backup.location}
						</span>
					</div>
					<span class="hidden shrink-0 font-mono text-xs text-muted-foreground sm:inline">
						{backup.app_version}
					</span>
					<span class="shrink-0 text-xs text-muted-foreground tabular-nums">
						{formatBytes(backup.size)}
					</span>
					<span class="hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:inline">
						{formatAbsolute(backup.created_at)}
					</span>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger
							title="Actions"
							class="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							<Icon name="more-horizontal" size={16} />
							<span class="sr-only">Actions</span>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end" class="w-52">
							{#if backup.can_restore}
								<DropdownMenu.Item
									onSelect={() => {
										restoreTarget = backup;
										restoreOpen = true;
									}}
								>
									<Icon name="archive-restore" size={15} /> Restore
								</DropdownMenu.Item>
							{/if}
							<DropdownMenu.Item
								class="text-destructive data-highlighted:text-destructive"
								onSelect={() => {
									deleteTarget = backup;
									deleteOpen = true;
								}}
							>
								<Icon name="trash" size={15} /> Delete
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			{/each}
		</div>
	{/if}
</section>

{#snippet restoreDescription()}
	Backup will be restored on the next app restart (must be done within 3 hours to take effect). A
	new backup with the current data will be created now.
	<br /><br />
	<strong class="font-medium text-foreground">
		Be sure to manually backup your data as well, just in case.
	</strong>
{/snippet}

<ConfirmDialog
	bind:open={restoreOpen}
	title="Restore this backup?"
	descriptionSnippet={restoreDescription}
	confirmLabel="Restore"
	onConfirm={confirmRestore}
/>

<ConfirmDialog
	bind:open={deleteOpen}
	title="Delete this backup?"
	description={deleteTarget ? `“${deleteTarget.filename}” will be permanently deleted.` : undefined}
	confirmLabel="Delete"
	destructive
	onConfirm={confirmDelete}
/>
