<script lang="ts">
	/* Add/edit a single AniList→TVDB mapping override. One dialog for both; the working `draft`
	   is (re)seeded whenever it opens. Save gated on `draftValid`; 422s surface via the client toast. */
	import * as Dialog from '$lib/components/ui/dialog';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import Icon from '$lib/components/Icon.svelte';
	import NumberStepper from '$lib/components/anime/NumberStepper.svelte';
	import ToEpisodeStepper from './ToEpisodeStepper.svelte';
	import EntitySearchField from './EntitySearchField.svelte';
	import GranularityField from './GranularityField.svelte';
	import type { MappingOverrideItem, MappingOverrideMode } from '$lib/api/types';
	import type { EntityPick, OverrideDraft } from '$lib/mappings/overrides';
	import {
		blankDraft,
		draftFromItem,
		draftValid,
		openEndedMismatch,
		rangesConsistentWithGranularity,
		granularityRangeHint,
		syncedTos,
		toRequest
	} from '$lib/mappings/overrides';
	import { createMappingOverride, updateMappingOverride } from '$lib/api/mappings';
	import { mappings } from '$lib/stores/mappings.svelte';
	import { notifySuccess } from '$lib/api/notify';

	let {
		open = $bindable(false),
		editing = null
	}: { open?: boolean; editing?: MappingOverrideItem | null } = $props();

	let draft = $state<OverrideDraft>(blankDraft());
	let saving = $state(false);

	// Reseed each time the dialog opens (fresh blank for add, item's values for edit).
	$effect(() => {
		if (open) {
			draft = editing ? draftFromItem(editing) : blankDraft();
			saving = false;
		}
	});

	const valid = $derived(draftValid(draft));
	const toMismatch = $derived(openEndedMismatch(draft));
	// Both sides bounded but their counts don't match the granularity.
	const rangeMismatch = $derived(!toMismatch && !rangesConsistentWithGranularity(draft));

	function pickAnime(pick: EntityPick | null) {
		draft.anilistPick = pick;
	}
	function pickTvdb(pick: EntityPick | null) {
		draft.tvdbPick = pick;
	}

	// After any range/granularity edit, re-derive BOTH `to` fields from the edited side so the two
	// ranges always agree with the granularity (the mismatch warning then never fires).
	function resync(anchor: 'anilist' | 'tvdb') {
		const s = syncedTos(draft, anchor);
		draft.anilist_episode_number_to = s.anilist;
		draft.tvdb_episode_number_to = s.tvdb;
	}

	async function save() {
		if (!valid || saving) return;
		saving = true;
		try {
			const body = toRequest(draft);
			const item = editing
				? await updateMappingOverride(editing.id, body)
				: await createMappingOverride(body);
			mappings.upsert(item);
			notifySuccess(editing ? 'Mapping override updated.' : 'Mapping override added.');
			open = false;
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[90dvh] gap-0 overflow-y-auto sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{editing ? 'Edit mapping override' : 'Add mapping override'}</Dialog.Title>
		</Dialog.Header>

		<div class="flex min-w-0 flex-col gap-4 py-4">
			<!-- AniList anime -->
			<div>
				<EntitySearchField
					kind="anime"
					label="AniList anime"
					value={draft.anilistPick}
					onSelect={pickAnime}
				/>
				<div class="mt-3 flex flex-wrap gap-4">
					<div class="flex flex-col gap-1.5">
						<Label class="text-xs text-muted-foreground">From episode</Label>
						<NumberStepper
							value={draft.anilist_episode_number_from}
							min={1}
							onChange={(n) => {
								draft.anilist_episode_number_from = n;
								resync('anilist');
							}}
							ariaLabel="AniList from episode"
							class="w-fit"
						/>
					</div>
					<div class="flex flex-col gap-1.5">
						<Label class="text-xs text-muted-foreground">To episode</Label>
						<ToEpisodeStepper
							value={draft.anilist_episode_number_to}
							onChange={(n) => {
								draft.anilist_episode_number_to = n;
								resync('anilist');
							}}
							ariaLabel="AniList to episode"
						/>
					</div>
				</div>
			</div>

			<Separator />

			<!-- TVDB series -->
			<div>
				<EntitySearchField
					kind="tvdb"
					label="TVDB series"
					value={draft.tvdbPick}
					onSelect={pickTvdb}
				/>
				<div class="mt-3 flex flex-wrap gap-4">
					<div class="flex flex-col gap-1.5">
						<Label class="text-xs text-muted-foreground">Season</Label>
						<NumberStepper
							value={draft.tvdb_season_number}
							min={0}
							onChange={(n) => (draft.tvdb_season_number = n ?? 0)}
							ariaLabel="TVDB season number"
							class="w-fit"
						/>
					</div>
					<!-- From/To stay glued as one wrap unit → Season drops alone on narrow screens. -->
					<div class="flex gap-4">
						<div class="flex flex-col gap-1.5">
							<Label class="text-xs text-muted-foreground">From episode</Label>
							<NumberStepper
								value={draft.tvdb_episode_number_from}
								min={1}
								onChange={(n) => {
									draft.tvdb_episode_number_from = n;
									resync('tvdb');
								}}
								ariaLabel="TVDB from episode"
								class="w-fit"
							/>
						</div>
						<div class="flex flex-col gap-1.5">
							<Label class="text-xs text-muted-foreground">To episode</Label>
							<ToEpisodeStepper
								value={draft.tvdb_episode_number_to}
								onChange={(n) => {
									draft.tvdb_episode_number_to = n;
									resync('tvdb');
								}}
								ariaLabel="TVDB to episode"
							/>
						</div>
					</div>
				</div>
				{#if toMismatch}
					<p class="mt-2 flex items-center gap-1.5 text-[13px] text-warning">
						<Icon name="alert-triangle" size={13} class="shrink-0" />
						Set a "to episode" on both sides, or leave both open-ended.
					</p>
				{/if}
			</div>

			<Separator />

			<!-- Granularity -->
			<div class="flex flex-col gap-2">
				<Label class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
					Granularity
				</Label>
				<GranularityField
					value={draft.granularity}
					onChange={(n) => {
						draft.granularity = n;
						resync('anilist');
					}}
				/>
				{#if rangeMismatch}
					<p class="flex items-center gap-1.5 text-[13px] text-warning">
						<Icon name="alert-triangle" size={13} class="shrink-0" />
						{granularityRangeHint(draft.granularity)}
					</p>
				{/if}
			</div>

			<Separator />

			<!-- Mode -->
			<div class="flex flex-col gap-3">
				<Label class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
					Mode
				</Label>
				<RadioGroup.Root
					value={draft.mode}
					onValueChange={(v) => (draft.mode = v as MappingOverrideMode)}
					class="gap-2.5"
				>
					<div class="flex items-center gap-2">
						<RadioGroup.Item value="IF_MISSING" id="mode-if-missing" />
						<Label for="mode-if-missing" class="cursor-pointer text-sm"
							>Override only if missing</Label
						>
					</div>
					<div class="flex items-center gap-2">
						<RadioGroup.Item value="ALWAYS" id="mode-always" />
						<Label for="mode-always" class="cursor-pointer text-sm">Always override</Label>
					</div>
				</RadioGroup.Root>

				{#if draft.mode === 'ALWAYS'}
					<div
						class="flex gap-2.5 rounded-lg border border-warning/40 bg-warning/10 p-3 text-[13px] leading-relaxed"
					>
						<Icon name="alert-triangle" size={16} class="mt-0.5 shrink-0 text-warning" />
						<p>
							It's strongly <strong class="font-semibold">not recommended</strong> to use this
							option. If AniBridge mappings are missing something (especially for an anime that has
							just begun airing) then it's likely to appear soon, and we shouldn't override their
							mapping. Only use this if their mappings are wrong, and even then it's better to
							<a
								href="https://github.com/anibridge/anibridge-mappings/issues/new"
								target="_blank"
								rel="noreferrer"
								class="text-info hover:underline">file an issue</a
							>
							or open a PR to fix this on their end.
						</p>
					</div>
				{/if}
			</div>
		</div>

		<Dialog.Footer>
			<Button type="button" variant="outline" disabled={saving} onclick={() => (open = false)}>
				Cancel
			</Button>
			<Button type="button" variant="affirmative" disabled={!valid || saving} onclick={save}>
				{#if saving}<Icon name="spinner" size={16} class="animate-spin" />{/if}
				Save
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
