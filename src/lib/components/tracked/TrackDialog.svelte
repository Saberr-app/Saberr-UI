<script lang="ts">
	import { tick, untrack } from 'svelte';
	import type { TrackedAnimeItem, UserEntry } from '$lib/api/types';
	import { TVDB_SEASON_TYPES } from '$lib/api/types';
	import { settings } from '$lib/stores/settings.svelte';
	import { tracked } from '$lib/stores/tracked.svelte';
	import {
		createTrackedAnime,
		findArchivedTrackedAnime,
		updateTrackedAnime
	} from '$lib/api/tracked';
	import { getAnime } from '$lib/api/anime';
	import { validatePath } from '$lib/api/settings';
	import { entryBroadcast } from '$lib/anilist/entry-broadcast';
	import { deleteTracked } from '$lib/tracked/tracking-actions';
	import { notifySuccess } from '$lib/api/notify';
	import { displayTitle, secondaryTitle } from '$lib/anilist/titles';
	import { formatLabel } from '$lib/anilist/enums';
	import { tvdbSeriesUrl } from '$lib/config/external';
	import { SAMPLE_TOKEN_VALUES, EPISODE_SAMPLE_TOKEN_VALUES } from '$lib/config/format-sample';
	import {
		createDraft,
		draftToCreate,
		draftToUpdate,
		editDraft,
		joinShowPath,
		paddingPreview,
		summaryFromItem,
		type TrackAnimeSummary,
		type TrackDraft
	} from '$lib/tracked/draft';
	import { cleanPathName, hasIllegalPathChars } from '$lib/tracked/path';
	import { focusFirstInvalid } from '$lib/utils/form';
	import { cn } from '$lib/utils';

	import * as Dialog from '$lib/components/ui/dialog';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import Icon from '$lib/components/Icon.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import SimpleSelect from '$lib/components/settings/SimpleSelect.svelte';
	import FormatInput, { hasUnknownToken } from '$lib/components/settings/FormatInput.svelte';
	import TestConnectionButton from '$lib/components/settings/TestConnectionButton.svelte';
	import StructuringBadge from '$lib/components/settings/StructuringBadge.svelte';
	import StructurePreviewPopover from '$lib/components/settings/StructurePreviewPopover.svelte';
	import NumberStepper from '$lib/components/anime/NumberStepper.svelte';
	import Foldable from './Foldable.svelte';
	import TrackProfileEditor from './TrackProfileEditor.svelte';
	import ReleaseGroupsField from './ReleaseGroupsField.svelte';
	import TitlePicker from './TitlePicker.svelte';
	import type { AnimeTitle } from '$lib/api/types';

	// Add/Edit tracking dialog. `summary` = start tracking; `item` = edit (full settings).
	// Autofills from settings on create; broadcasts the new tracked id so listings/detail update.
	let {
		open = $bindable(false),
		summary = null,
		item = null,
		onSaved,
		onDeleted
	}: {
		open?: boolean;
		summary?: TrackAnimeSummary | null;
		item?: TrackedAnimeItem | null;
		onSaved?: (item: TrackedAnimeItem) => void;
		/** Edit mode only — called after the tracked anime is deleted (e.g. to navigate away). */
		onDeleted?: (item: TrackedAnimeItem) => void;
	} = $props();

	// An explicit edit `item`, or an archived record we resolve on open (so a "Track"
	// click on an archived anime offers Unarchive instead of a duplicate create).
	let resolvedArchived = $state<TrackedAnimeItem | null>(null);
	let checking = $state(false);
	const isEdit = $derived(item != null);
	const effectiveItem = $derived<TrackedAnimeItem | null>(item ?? resolvedArchived);
	const archived = $derived(effectiveItem?.status === 'ARCHIVED');
	const head = $derived<TrackAnimeSummary | null>(
		effectiveItem ? summaryFromItem(effectiveItem) : summary
	);
	const title = $derived(
		archived && !isEdit ? 'Unarchive tracking' : isEdit ? 'Edit tracking' : 'Track anime'
	);

	let draft = $state<TrackDraft | null>(null);
	// JSON of the draft as first seeded — the baseline for the dirty check below.
	let baselineJson = $state<string | null>(null);
	let busy = $state(false);
	let confirmDelete = $state(false);
	let confirmDiscard = $state(false);
	// Flipped on the first save attempt: until then, invalid fields stay unmarked.
	let attempted = $state(false);
	// The scrollable dialog body, searched for the first invalid control on submit.
	let contentEl = $state<HTMLElement | null>(null);

	/** Seed the form and snapshot it as the unchanged baseline. */
	function setDraft(next: TrackDraft) {
		draft = next;
		baselineJson = JSON.stringify(next);
		attempted = false;
	}
	// Traveling-border glow on the "Track from episode" spinner when a create defaults it to a
	// non-1 episode (so the auto-picked start is noticed). Removed after ~2 laps.
	let glowFromEpisode = $state(false);

	// Seed the draft only when the dialog OPENS (false→true), reading settings via untrack so a
	// background GET /settings refresh can't re-run this + wipe edits. Create first probes for an archived record.
	let wasOpen = false;
	let lookupToken = 0;
	$effect(() => {
		if (open && !wasOpen) {
			if (item) {
				setDraft(untrack(() => editDraft(item, settings.current)));
				glowFromEpisode = false;
			} else if (summary) {
				void beginCreate(summary);
			}
		} else if (!open && wasOpen) {
			// Reset the archived lookup so a reopen re-checks.
			resolvedArchived = null;
			checking = false;
			lookupToken++;
		}
		wasOpen = open;
	});

	// Create flow: look up an archived record for this anilist id, then seed the
	// draft from it (Unarchive mode) or from settings defaults (plain create).
	async function beginCreate(s: TrackAnimeSummary) {
		const token = ++lookupToken;
		checking = true;
		draft = null;
		resolvedArchived = null;
		let found: TrackedAnimeItem | null = null;
		try {
			found = await findArchivedTrackedAnime(s.anilistId);
		} catch {
			found = null; // treat any failure as "not archived" → plain create
		}
		if (token !== lookupToken || !open) return; // closed or superseded
		if (found) {
			const archivedItem = found;
			resolvedArchived = archivedItem;
			setDraft(untrack(() => editDraft(archivedItem, settings.current)));
			glowFromEpisode = false;
		} else {
			const seeded = untrack(() => createDraft(s, settings.current));
			setDraft(seeded);
			glowFromEpisode = seeded.from_episode !== 1;
			if (glowFromEpisode) setTimeout(() => (glowFromEpisode = false), 2800);
		}
		checking = false;
	}

	const meta = $derived(settings.current.meta);

	// Episode-preview samples with `{show_name}` seeded from the live folder field. Empty folder ⇒ empty
	// string ⇒ the token renders as nothing (folder is required, so empty isn't a stable state).
	const episodeSamples = $derived({
		...EPISODE_SAMPLE_TOKEN_VALUES,
		show_name: draft?.show_folder_name.trim() ?? ''
	});

	const seasonType = $derived(draft?.tvdb_settings.tvdb_season_type ?? 'official');
	const SEASON_TYPE_LABELS: Record<(typeof TVDB_SEASON_TYPES)[number], string> = {
		official: 'Official',
		absolute: 'Absolute',
		dvd: 'DVD',
		alternate: 'Alternate',
		regional: 'Regional'
	};
	const seasonTypeOptions = TVDB_SEASON_TYPES.map((t) => ({
		value: t,
		label: SEASON_TYPE_LABELS[t]
	}));

	// Only the ACTIVE structuring mode's format fields are validated — the hidden group is filled
	// from defaults on save (resolveDraftForSave), so a field the user can't see never blocks them.
	const formatsInvalid = $derived.by(() => {
		if (!draft) return false;
		if (draft.tvdb_structure_enabled) {
			return (
				hasUnknownToken(
					draft.tvdb_settings.season_directory_name_format,
					meta.season_directory_formatting_tokens
				) ||
				hasUnknownToken(
					draft.tvdb_settings.episode_file_name_format,
					meta.full_episode_formatting_tokens
				) ||
				hasUnknownToken(
					draft.tvdb_settings.titleless_episode_file_name_format,
					meta.titleless_episode_formatting_tokens
				)
			);
		}
		return hasUnknownToken(
			draft.raw_settings.raw_episode_file_name_format,
			meta.raw_episode_formatting_tokens
		);
	});

	// The active mode's format fields are required (minLength=1).
	const formatsMissing = $derived(
		!!draft &&
			(draft.tvdb_structure_enabled
				? !draft.tvdb_settings.season_directory_name_format.trim() ||
					!draft.tvdb_settings.episode_file_name_format.trim() ||
					!draft.tvdb_settings.titleless_episode_file_name_format.trim()
				: !draft.raw_settings.raw_episode_file_name_format.trim())
	);

	const parentEmpty = $derived(!!draft && draft.show_parent_directory.trim().length === 0);
	const folderEmpty = $derived(!!draft && draft.show_folder_name.trim().length === 0);
	const folderIllegal = $derived(!!draft && hasIllegalPathChars(draft.show_folder_name));
	const fromEpisodeEmpty = $derived(!!draft && draft.from_episode == null);

	// Pure validity — doesn't disable Save (invalid clicks reveal errors via trySave); only submit-vs-reveal.
	const isValid = $derived(
		!!draft &&
			!formatsInvalid &&
			!formatsMissing &&
			!parentEmpty &&
			!folderEmpty &&
			!folderIllegal &&
			!fromEpisodeEmpty
	);

	// Has the form diverged from what it was seeded with?
	const dirty = $derived(
		!!draft && baselineJson != null && JSON.stringify($state.snapshot(draft)) !== baselineJson
	);

	// Anything worth saving: editing requires a real change; create/unarchive is itself the action.
	// Drives Save's enabled state + the discard-on-exit confirm (independent of validity).
	const hasChanges = $derived(!!draft && (isEdit ? dirty : true));

	// Joined preview path, with break opportunities after each slash so a long path wraps at slashes.
	const joinedPath = $derived(
		draft ? joinShowPath(draft.show_parent_directory, draft.show_folder_name) : ''
	);
	const pathSegments = $derived(joinedPath.split(/(?<=[\\/])/));

	// Edit/unarchive only: the show's full directory differs from the originally-saved one, so existing
	// files/imports won't be moved. Compared as the combined joined path (same calc as the preview).
	const pathChanged = $derived(
		!!draft &&
			effectiveItem != null &&
			joinedPath !==
				joinShowPath(effectiveItem.show_parent_directory, effectiveItem.show_folder_name)
	);

	// Fallback title list for the picker when the titles API fails — the anime's own titles.
	const titleFallback = $derived.by<AnimeTitle[]>(() => {
		if (!head) return [];
		const out: AnimeTitle[] = [];
		if (head.romaji_title)
			out.push({ source: 'ANILIST', title: head.romaji_title, language: 'Romaji' });
		if (head.english_title)
			out.push({ source: 'ANILIST', title: head.english_title, language: 'English' });
		if (head.native_title)
			out.push({ source: 'ANILIST', title: head.native_title, language: 'Native' });
		return out;
	});

	function cleanFolder() {
		if (draft) draft.show_folder_name = cleanPathName(draft.show_folder_name);
	}

	const seasonLabel = $derived(
		head?.season
			? `${head.season.charAt(0)}${head.season.slice(1).toLowerCase()}${head.seasonYear ? ' ' + head.seasonYear : ''}`
			: head?.seasonYear
				? String(head.seasonYear)
				: null
	);

	/** Re-broadcast the saved tracking so cached browse/list rows pick up the id. */
	function broadcast(saved: TrackedAnimeItem) {
		const ue = saved.user_entry;
		const entry: UserEntry | null = ue
			? {
					progress: ue.progress,
					score: ue.score,
					status: ue.status,
					repeat_count: ue.repeat_count,
					is_private: ue.is_private,
					started_at: ue.started_at,
					completed_at: ue.completed_at,
					notes: ue.notes
				}
			: null;
		entryBroadcast.emit({
			anilistId: saved.anilist_id,
			entry,
			trackedAnimeId: saved.id,
			trackedFromEpisode: saved.from_episode
		});
	}

	// A hidden (non-active) format field has a problem worth replacing with a default.
	const formatHasIssue = (value: string, tokens: Record<string, string>) =>
		value.trim() === '' || hasUnknownToken(value, tokens);

	// Fill the hidden (non-active) structuring group before sending: always from defaults on create;
	// on update only where a hidden field is empty/invalid (saved values otherwise kept).
	function resolveDraftForSave(creating: boolean): TrackDraft {
		const d = $state.snapshot(draft)!;
		const defaults = createDraft(head!, settings.current);
		if (d.tvdb_structure_enabled) {
			// AniList raw format is hidden.
			if (
				creating ||
				formatHasIssue(
					d.raw_settings.raw_episode_file_name_format,
					meta.raw_episode_formatting_tokens
				)
			) {
				d.raw_settings = defaults.raw_settings;
			}
		} else if (creating) {
			// TVDB group is hidden — default it wholesale.
			d.tvdb_settings = defaults.tvdb_settings;
		} else {
			// Keep the saved TVDB settings, defaulting only the problematic format fields.
			const t = d.tvdb_settings;
			const dt = defaults.tvdb_settings;
			if (formatHasIssue(t.season_directory_name_format, meta.season_directory_formatting_tokens))
				t.season_directory_name_format = dt.season_directory_name_format;
			if (formatHasIssue(t.episode_file_name_format, meta.full_episode_formatting_tokens))
				t.episode_file_name_format = dt.episode_file_name_format;
			if (
				formatHasIssue(
					t.titleless_episode_file_name_format,
					meta.titleless_episode_formatting_tokens
				)
			)
				t.titleless_episode_file_name_format = dt.titleless_episode_file_name_format;
		}
		return d;
	}

	async function save(unarchive = false) {
		if (!draft || !head) return;
		busy = true;
		try {
			if (effectiveItem != null) {
				const saved = await updateTrackedAnime(
					effectiveItem.id,
					draftToUpdate(
						resolveDraftForSave(false),
						settings.current.profile.preferred_release_groups,
						effectiveItem.release_group_settings,
						unarchive
					)
				);
				broadcast(saved);
				onSaved?.(saved);
				if (unarchive) {
					// It re-enters the active list; reload so stores that don't get onSaved catch up.
					// No force_freshness — we just wrote it, the backend is already current.
					tracked.load(false);
					notifySuccess('Tracking resumed');
				} else {
					notifySuccess('Tracking updated');
				}
			} else {
				// Create returns 204; learn the new tracked id from the anime, then broadcast so rows flip to "tracked".
				await createTrackedAnime(
					draftToCreate(
						head,
						resolveDraftForSave(true),
						settings.current.profile.preferred_release_groups
					)
				);
				// Pull the tracked list so the new item is in the cache right away (no force_freshness —
				// we just created it, the backend is already current).
				tracked.load(false);
				try {
					const fresh = await getAnime(head.anilistId, false);
					entryBroadcast.emit({
						anilistId: head.anilistId,
						trackedAnimeId: fresh.tracked_anime_id,
						trackedFromEpisode: draft.from_episode
					});
				} catch {
					/* the badge catches up on the next load */
				}
				notifySuccess('Now tracking this anime');
			}
			open = false;
		} finally {
			busy = false;
		}
	}

	// Implicit closes (X / click-outside / Escape) confirm first when there are
	// unsaved changes; explicit Cancel skips this.
	function attemptClose() {
		if (hasChanges) confirmDiscard = true;
		else open = false;
	}

	// Save entry point for every Save/Track/Unarchive button: an invalid form reveals errors
	// (expanding the structuring section if needed) and jumps to the first instead of submitting.
	async function trySave(unarchive = false) {
		if (busy) return;
		attempted = true;
		if (!isValid) {
			// A collapsed section may need a second pass (expand → render children) before the query hits.
			await tick();
			if (!focusFirstInvalid(contentEl)) {
				await tick();
				focusFirstInvalid(contentEl);
			}
			return;
		}
		await save(unarchive);
	}

	/** Edit mode — delete the tracked anime (broadcast clears caches), then close. */
	async function remove() {
		if (!item) return;
		await deleteTracked(item.id, item.anilist_id);
		onDeleted?.(item);
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		bind:ref={contentEl}
		class="flex max-h-[90dvh] flex-col gap-0 overflow-hidden sm:max-w-2xl"
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
			<Dialog.Title>{title}</Dialog.Title>
		</Dialog.Header>

		{#if checking}
			<div
				class="flex flex-1 items-center justify-center gap-2 py-12 text-sm text-muted-foreground"
			>
				<Icon name="spinner" size={18} class="animate-spin" />
				Checking…
			</div>
		{:else if draft && head}
			<!-- Body scrolls; the footer below stays pinned to the dialog's bottom edge. -->
			<div class="-mx-4 flex-1 overflow-y-auto p-2 px-4 pb-4">
				{#if archived}
					<!-- Archived notice -->
					<div
						class="mt-1 mb-4 flex items-start gap-2.5 rounded-lg border border-info/40 bg-info/10 p-3 text-info"
					>
						<Icon name="archive" size={16} class="mt-0.5 shrink-0" />
						<div class="min-w-0">
							<p class="text-sm font-medium">This tracked anime is archived</p>
							<p class="text-xs text-info/90">
								{isEdit ? '' : 'Unarchiving resumes tracking with the settings below.'}
							</p>
						</div>
					</div>
				{/if}
				<!-- Anime summary -->
				<div class="mt-1 mb-4 flex min-w-0 gap-3 rounded-lg border border-border bg-card/40 p-3">
					{#if head.cover}
						<img
							src={head.cover}
							alt=""
							class="h-20 w-14 shrink-0 rounded-md object-cover"
							loading="lazy"
						/>
					{/if}
					<div class="min-w-0 flex-1">
						<div class="truncate font-medium">{displayTitle(head)}</div>
						{#if secondaryTitle(head)}
							<div class="truncate text-sm text-muted-foreground">{secondaryTitle(head)}</div>
						{/if}
						<div class="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
							{#if head.format}<span>{formatLabel(head.format)}</span>{/if}
							{#if seasonLabel}<span>· {seasonLabel}</span>{/if}
							{#if head.episodes}<span>· {head.episodes} eps</span>{/if}
							<StructuringBadge
								type={draft.tvdb_structure_enabled ? 'tvdb' : 'anilist'}
								class="ml-auto h-4"
							/>
						</div>
					</div>
				</div>

				<div class="flex min-w-0 flex-col gap-5">
					<!-- Paths (each its own full-width row at every breakpoint) -->
					<div class="flex flex-col gap-3">
						<div class="grid gap-1.5">
							<Label for="track-parent" required>Show parent directory</Label>
							<Input
								id="track-parent"
								bind:value={draft.show_parent_directory}
								aria-invalid={attempted && parentEmpty ? 'true' : undefined}
							/>
							{#if attempted && parentEmpty}
								<p class="text-xs text-destructive">A parent directory is required.</p>
							{/if}
						</div>
						<div class="grid gap-1.5">
							<Label for="track-folder" required>Show folder name</Label>
							<div class="relative">
								<Input
									id="track-folder"
									class="pr-9"
									bind:value={draft.show_folder_name}
									aria-invalid={attempted && (folderEmpty || folderIllegal) ? 'true' : undefined}
								/>
								<TitlePicker
									anilistId={head.anilistId}
									fallback={titleFallback}
									onPick={(t) => (draft!.show_folder_name = cleanPathName(t))}
								/>
							</div>
							{#if attempted && folderEmpty}
								<p class="text-xs text-destructive">A folder name is required.</p>
							{:else if attempted && folderIllegal}
								<p class="text-xs text-destructive">
									These characters aren't valid in a folder name.
									<button type="button" onclick={cleanFolder} class="font-medium underline"
										>Clean it</button
									>
								</p>
							{/if}
						</div>
					</div>
					<div class="flex items-start gap-3">
						<p class="min-w-0 flex-1 font-mono text-xs break-words text-muted-foreground">
							{#each pathSegments as seg, i (i)}{seg}<wbr />{/each}
						</p>
						<TestConnectionButton
							variant="outline"
							label="Check"
							action={() => validatePath(joinedPath)}
						/>
					</div>
					{#if pathChanged}
						<p
							class="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning"
						>
							<Icon name="alert-triangle" size={15} class="shrink-0" />
							Saberr won't move any existing files or previous imports to the new location.
						</p>
					{/if}

					<Separator />

					<!-- Track from episode + Episode number padding -->
					<div class="flex flex-wrap justify-center gap-x-10 gap-y-5">
						<div class="flex flex-col items-center gap-1.5 text-center">
							<Label required>Track from episode</Label>
							<div class={cn('w-fit rounded-md', glowFromEpisode && 'animate-attention-border')}>
								<NumberStepper
									value={draft.from_episode}
									min={1}
									nullable
									invalid={attempted && fromEpisodeEmpty}
									onChange={(n) => (draft!.from_episode = n)}
									ariaLabel="Track from episode"
									class="w-fit"
									inputClass="w-16"
								/>
							</div>
							{#if attempted && fromEpisodeEmpty}
								<p class="max-w-56 text-xs text-destructive">Pick an episode to start from.</p>
							{:else}
								<p class="max-w-56 text-xs text-muted-foreground">
									Download and report missing episodes starting from this episode
								</p>
							{/if}
						</div>
						<div class="flex flex-col items-center gap-1.5 text-center">
							<Label>Episode number padding</Label>
							<NumberStepper
								value={draft.episode_number_padding}
								min={1}
								max={5}
								onChange={(n) => (draft!.episode_number_padding = n ?? 1)}
								ariaLabel="Episode number padding"
								class="w-fit"
							/>
							<p class="text-xs text-muted-foreground">
								{paddingPreview(draft.episode_number_padding)}
							</p>
						</div>
					</div>

					<!-- Section 1: Structuring -->
					<Foldable
						open={false}
						forceOpen={attempted && formatsInvalid}
						title="Structuring"
						description="How episodes are named and foldered on disk"
					>
						{#snippet aside()}
							<StructuringBadge type={draft!.tvdb_structure_enabled ? 'tvdb' : 'anilist'} />
						{/snippet}
						<RadioGroup.Root
							value={draft.tvdb_structure_enabled ? 'tvdb' : 'anilist'}
							onValueChange={(v) => (draft!.tvdb_structure_enabled = v === 'tvdb')}
							class="gap-3"
						>
							<div class="flex items-center gap-2">
								<RadioGroup.Item value="tvdb" id="track-struct-tvdb" />
								<Label for="track-struct-tvdb" class="cursor-pointer">TVDB Structuring</Label>
								<StructuringBadge type="tvdb" />
								<StructurePreviewPopover type="tvdb" />
							</div>
							<div class="flex items-center gap-2">
								<RadioGroup.Item value="anilist" id="track-struct-anilist" />
								<Label for="track-struct-anilist" class="cursor-pointer">AniList Structuring</Label>
								<StructuringBadge type="anilist" />
								<StructurePreviewPopover type="anilist" />
							</div>
						</RadioGroup.Root>

						<Separator class="my-4" />

						{#if draft.tvdb_structure_enabled}
							<div class="flex flex-col gap-4">
								<div class="grid gap-3 sm:grid-cols-2">
									<div class="grid gap-1.5">
										<Label>TVDB season type</Label>
										<SimpleSelect
											value={draft.tvdb_settings.tvdb_season_type}
											options={seasonTypeOptions}
											onValueChange={(v) =>
												(draft!.tvdb_settings.tvdb_season_type =
													v as (typeof TVDB_SEASON_TYPES)[number])}
										/>
									</div>
								</div>

								{#if seasonType !== 'official'}
									<p
										class="flex flex-col gap-1 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning"
									>
										<span class="flex items-center gap-2 font-medium">
											<Icon name="alert-triangle" size={15} class="shrink-0" />
											Make sure this season type is supported for this show.
										</span>
										<span class="text-warning/90">
											TVDB is often delayed with non-official episode entries, which can delay
											importing torrents into the show directory.
										</span>
										{#if head.tvdbId != null}
											<a
												href={`${tvdbSeriesUrl(head.tvdbId)}#seasons`}
												target="_blank"
												rel="noopener"
												class="inline-flex w-fit items-center gap-1 underline"
											>
												<Icon name="external-link" size={13} /> View this series on TVDB
											</a>
										{/if}
									</p>
								{/if}

								<div class="grid gap-3 sm:grid-cols-2">
									<div class="grid gap-1.5">
										<Label>Season number padding</Label>
										<NumberStepper
											value={draft.tvdb_settings.season_number_padding}
											min={1}
											max={4}
											onChange={(n) => (draft!.tvdb_settings.season_number_padding = n ?? 1)}
											ariaLabel="Season number padding"
											class="w-fit"
										/>
									</div>
									<div class="grid gap-1.5">
										<Label>Season directory number padding</Label>
										<NumberStepper
											value={draft.tvdb_settings.season_directory_number_padding}
											min={1}
											max={4}
											onChange={(n) =>
												(draft!.tvdb_settings.season_directory_number_padding = n ?? 1)}
											ariaLabel="Season directory number padding"
											class="w-fit"
										/>
									</div>
								</div>

								<div class="grid gap-1.5">
									<Label required>Season folder name formatting</Label>
									<FormatInput
										value={draft.tvdb_settings.season_directory_name_format}
										onChange={(v) => (draft!.tvdb_settings.season_directory_name_format = v)}
										tokens={meta.season_directory_formatting_tokens}
										required
										showError={attempted}
										samples={SAMPLE_TOKEN_VALUES}
									/>
								</div>
								<div class="grid gap-1.5">
									<Label required>Episode file name formatting</Label>
									<FormatInput
										value={draft.tvdb_settings.episode_file_name_format}
										onChange={(v) => (draft!.tvdb_settings.episode_file_name_format = v)}
										tokens={meta.full_episode_formatting_tokens}
										required
										showError={attempted}
										samples={episodeSamples}
									/>
								</div>
								<div class="grid gap-1.5">
									<Label required>Episode file name formatting without a title</Label>
									<FormatInput
										value={draft.tvdb_settings.titleless_episode_file_name_format}
										onChange={(v) => (draft!.tvdb_settings.titleless_episode_file_name_format = v)}
										tokens={meta.titleless_episode_formatting_tokens}
										required
										showError={attempted}
										samples={episodeSamples}
									/>
								</div>
							</div>
						{:else}
							<div class="grid gap-1.5">
								<Label required>Episode file name formatting</Label>
								<FormatInput
									value={draft.raw_settings.raw_episode_file_name_format}
									onChange={(v) => (draft!.raw_settings.raw_episode_file_name_format = v)}
									tokens={meta.raw_episode_formatting_tokens}
									required
									showError={attempted}
									samples={episodeSamples}
								/>
							</div>
						{/if}
					</Foldable>

					<!-- Section 2: Release profile -->
					<Foldable
						open={false}
						title="Release profile"
						description="Which torrent Saberr picks for each episode"
					>
						{#snippet aside()}
							<span
								class="rounded-full border px-2 py-0.5 text-xs {draft!.useDefaultProfile
									? 'border-border text-muted-foreground'
									: 'border-info/40 text-info'}"
							>
								{draft!.useDefaultProfile ? 'Default' : 'Custom'}
							</span>
						{/snippet}
						<RadioGroup.Root
							value={draft.useDefaultProfile ? 'default' : 'custom'}
							onValueChange={(v) => (draft!.useDefaultProfile = v === 'default')}
							class="mb-4 gap-3"
						>
							<div class="flex items-center gap-2">
								<RadioGroup.Item value="default" id="track-profile-default" />
								<Label for="track-profile-default" class="cursor-pointer">Use default profile</Label
								>
							</div>
							<div class="flex items-center gap-2">
								<RadioGroup.Item value="custom" id="track-profile-custom" />
								<Label for="track-profile-custom" class="cursor-pointer"
									>Custom for this anime</Label
								>
							</div>
						</RadioGroup.Root>

						{#if draft.useDefaultProfile}
							<p class="text-sm text-muted-foreground">
								This anime uses your global release profile. Switch to Custom to override it here.
							</p>
						{:else}
							<TrackProfileEditor bind:profile={draft.release_profile} />
						{/if}
					</Foldable>

					<!-- Section 3: Release groups -->
					<Foldable
						open={false}
						title="Release groups"
						description="Per-group matching and ordering"
					>
						<ReleaseGroupsField
							bind:overrides={draft.release_group_settings}
							bind:preferred={draft.release_profile.preferred_release_groups}
							globalPreferred={settings.current.profile.preferred_release_groups}
							available={settings.current.meta.available_release_groups}
							defaultProfile={draft.useDefaultProfile}
						/>
					</Foldable>
				</div>
			</div>

			<Dialog.Footer class="shrink-0">
				{#if isEdit}
					<Button
						type="button"
						variant="destructive"
						disabled={busy}
						onclick={() => (confirmDelete = true)}
						class="sm:mr-auto"
					>
						<Icon name="trash" size={15} />
						Delete
					</Button>
				{/if}
				<Button type="button" variant="outline" disabled={busy} onclick={() => (open = false)}>
					Cancel
				</Button>
				{#if archived}
					<!-- Edit of an archived item keeps a plain Save; Track-on-archived is unarchive only. -->
					{#if isEdit}
						<Button
							type="button"
							variant="outline"
							disabled={!hasChanges || busy}
							onclick={() => trySave(false)}
						>
							Save
						</Button>
					{/if}
					<Button type="button" variant="affirmative" disabled={busy} onclick={() => trySave(true)}>
						{#if busy}<Icon name="spinner" size={16} class="animate-spin" />{:else}<Icon
								name="archive"
								size={15}
							/>{/if}
						{isEdit ? 'Unarchive and save' : 'Unarchive'}
					</Button>
				{:else}
					<Button
						type="button"
						variant="affirmative"
						disabled={!hasChanges || busy}
						onclick={() => trySave(false)}
					>
						{#if busy}<Icon name="spinner" size={16} class="animate-spin" />{/if}
						{isEdit ? 'Save' : 'Track anime'}
					</Button>
				{/if}
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

{#if isEdit && head}
	<ConfirmDialog
		bind:open={confirmDelete}
		title="Delete tracked anime?"
		description={`"${displayTitle(head)}" will no longer be tracked by Saberr.`}
		confirmLabel="Delete"
		destructive
		onConfirm={remove}
	/>
{/if}

<ConfirmDialog
	bind:open={confirmDiscard}
	title={isEdit ? 'Discard changes?' : 'Discard tracking setup?'}
	description={isEdit
		? "Your changes to this tracked anime haven't been saved."
		: "This anime isn't tracked yet and your setup will be lost."}
	confirmLabel="Discard"
	destructive
	onConfirm={() => {
		open = false;
	}}
/>
