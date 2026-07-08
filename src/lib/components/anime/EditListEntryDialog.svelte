<script lang="ts">
	import type {
		AnilistAnimeStatus,
		AnilistAnimeUserStatus,
		UserAnimeUpdateRequest,
		UserEntry
	} from '$lib/api/types';
	import { ANILIST_USER_STATUSES } from '$lib/api/types';
	import { ANILIST_STATUS_LABELS } from '$lib/anilist/entry';
	import {
		defaultStatusForAiring,
		emptyEntryRequest,
		entryToRequest,
		removeEntry,
		saveEntry
	} from '$lib/anilist/entry-actions';
	import { emptyFuzzyDate, isFuzzyEmpty, todayFuzzyDate } from '$lib/anilist/dates';
	import { currentScoreFormat } from '$lib/anilist/score';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import SimpleSelect from '$lib/components/settings/SimpleSelect.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import ScoreInput from './ScoreInput.svelte';
	import NumberStepper from './NumberStepper.svelte';
	import FuzzyDateInput from './FuzzyDateInput.svelte';

	let {
		open = $bindable(false),
		anilistId,
		title,
		episodes,
		airingStatus,
		entry
	}: {
		open?: boolean;
		anilistId: number;
		title: string;
		episodes: number | null;
		airingStatus: AnilistAnimeStatus;
		/** Existing entry, or null when adding. */
		entry: UserEntry | null;
	} = $props();

	const isNew = $derived(entry == null);
	const scoreFormat = currentScoreFormat();

	const statusOptions = ANILIST_USER_STATUSES.map((s) => ({
		value: s,
		label: ANILIST_STATUS_LABELS[s]
	}));

	function initial(): UserAnimeUpdateRequest {
		if (entry) return entryToRequest(entry);
		const status = defaultStatusForAiring(airingStatus);
		const req = emptyEntryRequest(status);
		if (status === 'CURRENT') req.started_at = todayFuzzyDate();
		return req;
	}

	let draft = $state<UserAnimeUpdateRequest>(initial());
	// JSON of the draft as first seeded — the baseline for the dirty check below.
	let baselineJson = $state<string | null>(null);
	let busy = $state(false);
	let confirmRemove = $state(false);
	let confirmDiscard = $state(false);

	// Tracks an auto-complete the dialog applied so dropping progress back can undo
	// exactly what it set (status + the auto-filled date) — not a user's own values.
	let auto: { prevStatus: AnilistAnimeUserStatus; setDate: boolean } | null = null;

	// Re-seed the draft whenever the dialog opens (or its target changes).
	$effect(() => {
		if (open) {
			const seed = initial();
			draft = seed;
			baselineJson = JSON.stringify(seed);
			auto = null;
		}
	});

	// Has the form diverged from what it was seeded with?
	const dirty = $derived(
		baselineJson != null && JSON.stringify($state.snapshot(draft)) !== baselineJson
	);
	// Drives the discard-on-exit confirm: editing needs a real change; adding is itself the action.
	const hasChanges = $derived(isNew || dirty);

	// Implicit closes (X / click-outside / Escape) confirm first when there are unsaved
	// changes; the explicit Cancel button skips this.
	function attemptClose() {
		if (hasChanges) confirmDiscard = true;
		else open = false;
	}

	function setProgress(n: number) {
		const wasMax = episodes != null && draft.progress >= episodes;
		const isMax = episodes != null && n >= episodes;
		draft.progress = n;

		if (isMax && !wasMax) {
			// Crossing up to the episode count → auto-complete (remember what we set).
			auto = { prevStatus: draft.status, setDate: isFuzzyEmpty(draft.completed_at) };
			draft.status = 'COMPLETED';
			if (auto.setDate) draft.completed_at = todayFuzzyDate();
		} else if (!isMax && wasMax && auto) {
			// Dropping back below → revert the auto status + clear the date we filled.
			if (draft.status === 'COMPLETED') draft.status = auto.prevStatus;
			if (auto.setDate) draft.completed_at = emptyFuzzyDate();
			auto = null;
		}
	}

	function setStatus(v: AnilistAnimeUserStatus) {
		draft.status = v;
		auto = null; // a manual status pick severs the progress auto-link
		if (v === 'COMPLETED') {
			if (episodes != null) draft.progress = episodes;
			if (isFuzzyEmpty(draft.completed_at)) draft.completed_at = todayFuzzyDate();
		}
	}

	async function save() {
		busy = true;
		const res = await saveEntry(anilistId, draft, isNew ? 'Added to list' : 'List updated');
		busy = false;
		if (res) open = false;
	}

	async function remove() {
		await removeEntry(anilistId);
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
		showCloseButton={false}
		onInteractOutside={(e) => {
			e.preventDefault();
			attemptClose();
		}}
		onEscapeKeydown={(e) => {
			e.preventDefault();
			attemptClose();
		}}
	>
		<Button
			variant="ghost"
			size="icon-sm"
			class="absolute top-2 right-2"
			aria-label="Close"
			onclick={attemptClose}
		>
			<Icon name="close" size={16} />
		</Button>
		<Dialog.Header>
			<Dialog.Title>{isNew ? 'Add to list' : 'Edit list entry'}</Dialog.Title>
			<Dialog.Description class="line-clamp-1">{title}</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-5 py-1">
			<div class="grid gap-1.5">
				<Label>Status</Label>
				<SimpleSelect
					value={draft.status}
					options={statusOptions}
					onValueChange={(v) => setStatus(v as AnilistAnimeUserStatus)}
					valueClass="text-field-value"
				/>
			</div>

			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
				<div class="grid gap-1.5">
					<Label>Progress</Label>
					<div class="flex items-center gap-2">
						<NumberStepper
							value={draft.progress}
							min={0}
							max={episodes}
							onChange={(n) => setProgress(n ?? 0)}
							ariaLabel="Progress"
							class="text-field-value"
						/>
						<span class="text-sm text-muted-foreground">/ {episodes ?? '?'}</span>
					</div>
				</div>
				<div class="grid gap-1.5">
					<Label>Score</Label>
					<ScoreInput
						bind:score={draft.score}
						format={scoreFormat}
						numberClass="text-field-value"
					/>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
				<div class="grid gap-1.5">
					<Label>Rewatches</Label>
					<div class="flex">
						<NumberStepper
							value={draft.repeat_count}
							min={0}
							onChange={(n) => (draft.repeat_count = n ?? 0)}
							ariaLabel="Rewatch count"
							class="text-field-value"
						/>
					</div>
				</div>
				<div class="grid gap-1.5">
					<Label>Visibility</Label>
					<label class="flex h-9 w-fit cursor-pointer items-center gap-2 rounded-md text-sm">
						<Checkbox
							bind:checked={draft.is_private}
							class="data-checked:border-field-value data-checked:bg-field-value data-checked:text-field-value-foreground dark:data-checked:bg-field-value"
						/>
						<Icon name="lock" size={14} class="text-muted-foreground" />
						Private
					</label>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
				<div class="grid gap-1.5">
					<div class="flex items-center justify-between">
						<Label>Started</Label>
						<button
							type="button"
							class="text-xs text-muted-foreground hover:text-foreground"
							onclick={() => (draft.started_at = todayFuzzyDate())}
						>
							Today
						</button>
					</div>
					<FuzzyDateInput bind:value={draft.started_at} valueClass="text-field-value" />
				</div>
				<div class="grid gap-1.5">
					<div class="flex items-center justify-between">
						<Label>Completed</Label>
						<button
							type="button"
							class="text-xs text-muted-foreground hover:text-foreground"
							onclick={() => (draft.completed_at = todayFuzzyDate())}
						>
							Today
						</button>
					</div>
					<FuzzyDateInput bind:value={draft.completed_at} valueClass="text-field-value" />
				</div>
			</div>

			<div class="grid gap-1.5">
				<Label for="entry-notes">Notes</Label>
				<textarea
					id="entry-notes"
					rows="3"
					class="min-h-16 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-field-value outline-none focus-visible:ring-3 focus-visible:ring-foreground/15"
					value={draft.notes ?? ''}
					oninput={(e) => (draft.notes = e.currentTarget.value || null)}
				></textarea>
			</div>
		</div>

		<Dialog.Footer class="sm:justify-between">
			{#if !isNew}
				<Button
					type="button"
					variant="destructive"
					disabled={busy}
					onclick={() => (confirmRemove = true)}
				>
					<Icon name="trash" size={15} />
					Remove
				</Button>
			{:else}
				<span></span>
			{/if}
			<div class="flex gap-2">
				<Button type="button" variant="outline" disabled={busy} onclick={() => (open = false)}>
					Cancel
				</Button>
				<Button type="button" variant="affirmative" disabled={busy} onclick={save}>
					{#if busy}<Icon name="spinner" size={16} class="animate-spin" />{/if}
					Save
				</Button>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<ConfirmDialog
	bind:open={confirmRemove}
	title="Remove from list?"
	description={`"${title}" will be removed from your AniList list.`}
	confirmLabel="Remove"
	destructive
	onConfirm={remove}
/>

<ConfirmDialog
	bind:open={confirmDiscard}
	title={isNew ? 'Discard new entry?' : 'Discard changes?'}
	description={isNew
		? "This anime isn't on your list yet and your entry will be lost."
		: "Your changes to this list entry haven't been saved."}
	confirmLabel="Discard"
	destructive
	onConfirm={() => {
		open = false;
	}}
/>
