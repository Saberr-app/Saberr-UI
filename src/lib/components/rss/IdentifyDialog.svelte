<script lang="ts">
	/* Identify an unrecognized torrent: pick a tracked anime + episode number(s), review/edit the
	   parsed Specs (autofilled explicit→fuzzy), optionally flag a part or batch. A Check button looks
	   up an existing download, then the action becomes Download / "Download anyway". */
	import type {
		Encoding,
		Resolution,
		TorrentDownloadRequest,
		TrackedAnimeItem,
		VideoSource
	} from '$lib/api/types';
	import { ENCODINGS, RESOLUTIONS, SOURCES } from '$lib/api/types';
	import { listTrackedAnime, getTrackedAnimeEpisodeDetails } from '$lib/api/tracked';
	import { downloadTorrent } from '$lib/api/torrents';
	import { notifyError, notifySuccess } from '$lib/api/notify';
	import { rss } from '$lib/stores/rss.svelte';
	import { rssMenu } from '$lib/stores/rss-menu.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import NumberStepper from '$lib/components/anime/NumberStepper.svelte';
	import CustomTitleHint from '$lib/components/tracked/CustomTitleHint.svelte';
	import TrackedAnimePicker from '$lib/components/tracked/TrackedAnimePicker.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { cn } from '$lib/utils';

	const item = $derived(rssMenu.identifyItem);
	const sourceOptions: VideoSource[] = [...SOURCES, 'Other'];

	let trackedList = $state<TrackedAnimeItem[]>([]);
	let loadingList = $state(false);
	let trackedId = $state<number | null>(null);
	let episode = $state(1);
	let mode = $state<'single' | 'part' | 'multi'>('single');
	let part = $state(1);
	let ceiling = $state(2);
	let rangeTo = $state(2);

	// Specs (autofilled explicit→fuzzy, user-editable).
	let releaseGroup = $state('');
	let resolution = $state<Resolution | ''>('');
	let encoding = $state<Encoding | ''>('');
	let source = $state<VideoSource>('Other');
	let languageCode = $state('');
	let version = $state(1);
	let isRepack = $state(false);
	let specsOpen = $state(false);

	// Custom detection title — pins this torrent's explicit title so future releases from the same group auto-match.
	let overrideEnabled = $state(false);
	let overrideTitle = $state('');
	let overrideOffset = $state(0);
	let offsetTouched = $state(false);
	let overrideOpen = $state(true);

	let checking = $state(false);
	let checkedDone = $state(false);
	let existingDownload = $state(false);
	let discardFuture = $state(false);
	let submitting = $state(false);

	const exA = $derived(item?.rss_torrent.explicit_resolved_attributes ?? null);
	const fzA = $derived(item?.rss_torrent.fuzzy_resolved_attributes ?? null);

	// Override offered only for an explicit title whose explicit group is recognized, once a target is chosen.
	const explicitGroup = $derived(exA?.release_group ?? null);
	const groupRecognized = $derived(
		explicitGroup != null && settings.current.meta.available_release_groups.includes(explicitGroup)
	);
	const showOverride = $derived(exA?.title != null && groupRecognized && trackedId != null);

	// A field is "fuzzy-sourced" when explicit lacked it, fuzzy had it, and the user hasn't edited it.
	function isFuzzy(
		curr: string,
		key: 'release_group' | 'resolution' | 'encoding' | 'source' | 'language_code'
	): boolean {
		const e = exA?.[key];
		const f = fzA?.[key];
		return e == null && f != null && curr === String(f);
	}

	const missingRequired = $derived(!releaseGroup.trim() || resolution === '' || encoding === '');
	const specsFromFuzzy = $derived(
		isFuzzy(releaseGroup, 'release_group') ||
			isFuzzy(resolution, 'resolution') ||
			isFuzzy(encoding, 'encoding') ||
			isFuzzy(source, 'source') ||
			isFuzzy(languageCode, 'language_code')
	);

	// Seed everything from the torrent's resolved attrs when the dialog opens.
	let seededFor: string | null = null;
	$effect(() => {
		const t = item;
		if (!t) {
			seededFor = null;
			return;
		}
		if (seededFor === t.rss_torrent.magnet_hash) return;
		seededFor = t.rss_torrent.magnet_hash;
		const ex = t.rss_torrent.explicit_resolved_attributes;
		const fz = t.rss_torrent.fuzzy_resolved_attributes;
		const pick = <T,>(a: T | null | undefined, b: T | null | undefined): T | null =>
			a != null ? a : (b ?? null);

		episode = pick(ex?.episode_number, fz?.episode_number) ?? 1;
		mode = 'single';
		part = 1;
		ceiling = 2;
		rangeTo = episode + 1;
		trackedId = null;

		releaseGroup = pick(ex?.release_group, fz?.release_group) ?? '';
		resolution = pick(ex?.resolution, fz?.resolution) ?? '';
		encoding = pick(ex?.encoding, fz?.encoding) ?? '';
		source = pick(ex?.source, fz?.source) ?? 'Other';
		languageCode = pick(ex?.language_code, fz?.language_code) ?? '';
		version = pick(ex?.version_number, fz?.version_number) ?? 1;
		isRepack = pick(ex?.repack_indicator, fz?.repack_indicator) ?? false;

		overrideEnabled = false;
		overrideTitle = ex?.title ?? '';
		overrideOffset = 0;
		offsetTouched = false;
		overrideOpen = true;

		specsOpen = missingRequired || specsFromFuzzy;
		checkedDone = false;
		existingDownload = false;
		discardFuture = false;
		loadList();
	});

	// Live offset = resolved − entered episode, until the user edits it; only when an explicit episode exists.
	$effect(() => {
		if (offsetTouched) return;
		const resolved = exA?.episode_number;
		if (resolved == null) return;
		overrideOffset = resolved - episode;
	});

	// Any change to the target/specs invalidates a prior Check.
	$effect(() => {
		void trackedId;
		void episode;
		void mode;
		void part;
		void ceiling;
		void rangeTo;
		void releaseGroup;
		void resolution;
		void encoding;
		void source;
		void languageCode;
		void version;
		void isRepack;
		checkedDone = false;
	});

	async function loadList() {
		if (trackedList.length > 0) return;
		loadingList = true;
		try {
			const res = await listTrackedAnime('ACTIVE', false, false);
			trackedList = res.tracked_anime;
		} catch {
			notifyError('Could not load tracked anime');
		} finally {
			loadingList = false;
		}
	}

	const episodeNumbers = $derived.by(() => {
		if (mode === 'multi') {
			const from = episode;
			const to = Math.max(rangeTo, from);
			return Array.from({ length: to - from + 1 }, (_, i) => from + i);
		}
		return [episode];
	});

	function toggleMode(m: 'part' | 'multi') {
		mode = mode === m ? 'single' : m;
	}

	function buildRequest(): TorrentDownloadRequest | null {
		if (item == null || trackedId == null || resolution === '' || encoding === '') return null;
		return {
			magnet_hash: item.rss_torrent.magnet_hash,
			tracked_anime_id: trackedId,
			episode_numbers: episodeNumbers,
			episode_part: mode === 'part' ? part : 0,
			episode_part_ceiling: mode === 'part' ? ceiling : 0,
			release_group: releaseGroup.trim(),
			// Empty ⇒ "und" (undetermined) so the backend gets an explicit language code.
			language_code: languageCode.trim() || 'und',
			resolution,
			source,
			encoding,
			version,
			is_repack: isRepack,
			rss_xml: item.rss_torrent.rss_xml,
			discard_future_torrents: existingDownload && discardFuture,
			release_group_override_settings:
				showOverride && overrideEnabled && overrideTitle.trim()
					? { override_match_against: overrideTitle.trim(), episode_number_offset: overrideOffset }
					: null
		};
	}

	const canSubmit = $derived(trackedId != null && !missingRequired);

	async function check() {
		if (trackedId == null) return;
		checking = true;
		try {
			const d = await getTrackedAnimeEpisodeDetails(trackedId, episodeNumbers[0]);
			existingDownload = d.download_id != null;
			checkedDone = true;
		} catch {
			notifyError('Could not check the episode');
		} finally {
			checking = false;
		}
	}

	async function submit() {
		const req = buildRequest();
		if (req == null) return;
		submitting = true;
		try {
			const res = await downloadTorrent(req);
			rss.patchByHash(res);
			notifySuccess('Download started');
			rssMenu.closeIdentify();
		} catch {
			/* apiFetch already toasted */
		} finally {
			submitting = false;
		}
	}

	function onOpenChange(open: boolean) {
		if (!open) rssMenu.closeIdentify();
	}

	const fieldBase =
		'h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-foreground/15';
	function fieldClass(curr: string, key: Parameters<typeof isFuzzy>[1], required = false): string {
		if (required && !String(curr).trim())
			return cn(fieldBase, 'border-destructive/60 focus:ring-destructive/20');
		if (isFuzzy(curr, key)) return cn(fieldBase, 'border-fuzzy/60');
		return cn(fieldBase, 'border-input');
	}
</script>

<Dialog.Root open={item != null} {onOpenChange}>
	<Dialog.Content class="max-h-[88vh] overflow-y-auto sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Identify torrent</Dialog.Title>
			<Dialog.Description class="font-mono text-xs break-all">
				{item?.rss_torrent.title}
			</Dialog.Description>
		</Dialog.Header>

		{#if item}
			<div class="flex flex-col gap-4">
				<!-- Tracked anime -->
				<div class="flex flex-col gap-1.5">
					<span class="text-sm font-medium">Tracked anime</span>
					<TrackedAnimePicker items={trackedList} bind:value={trackedId} loading={loadingList} />
				</div>

				<!-- Episode + mode -->
				<div class="flex flex-col gap-2">
					<div class="flex items-end gap-3">
						<label class="flex flex-col gap-1.5">
							<span class="text-sm font-medium"
								>{mode === 'multi' ? 'From episode' : 'Episode'}</span
							>
							<input
								type="number"
								min="0"
								bind:value={episode}
								class={cn(fieldBase, 'w-24 border-input')}
							/>
						</label>
						{#if mode === 'multi'}
							<label class="flex flex-col gap-1.5">
								<span class="text-sm font-medium">To episode</span>
								<input
									type="number"
									min="0"
									bind:value={rangeTo}
									class={cn(fieldBase, 'w-24 border-input')}
								/>
							</label>
						{/if}
						{#if mode === 'part'}
							<label class="flex flex-col gap-1.5">
								<span class="text-sm font-medium">Part</span>
								<input
									type="number"
									min="0"
									bind:value={part}
									class={cn(fieldBase, 'w-20 border-input')}
								/>
							</label>
							<label class="flex flex-col gap-1.5">
								<span class="text-sm font-medium">of</span>
								<input
									type="number"
									min="0"
									bind:value={ceiling}
									class={cn(fieldBase, 'w-20 border-input')}
								/>
							</label>
						{/if}
					</div>

					<div class="flex flex-wrap gap-4">
						<label class="flex items-center gap-2 text-sm">
							<Checkbox checked={mode === 'part'} onCheckedChange={() => toggleMode('part')} />
							Part of an episode
						</label>
						<label class="flex items-center gap-2 text-sm">
							<Checkbox checked={mode === 'multi'} onCheckedChange={() => toggleMode('multi')} />
							Multiple episodes
						</label>
					</div>

					{#if mode === 'multi'}
						<div
							class="flex items-start gap-2 rounded-lg border border-warning/35 bg-warning/10 p-2.5 text-xs text-warning"
						>
							<Icon name="alert-triangle" size={14} class="mt-0.5 shrink-0" />
							<span>
								Please note that batch torrents are <span class="font-semibold"
									>not supported yet</span
								>. Only one video file will be imported and treated as multiple episodes.
							</span>
						</div>
					{/if}
				</div>

				<!-- Specs (collapsible) -->
				<div
					class={cn(
						'rounded-lg border',
						missingRequired ? 'border-destructive/40' : specsFromFuzzy ? 'border-fuzzy/40' : ''
					)}
				>
					<button
						type="button"
						aria-expanded={specsOpen}
						onclick={() => (specsOpen = !specsOpen)}
						class={cn(
							'flex w-full items-center gap-2 px-3 py-2 text-sm font-medium',
							missingRequired
								? 'text-destructive'
								: specsFromFuzzy
									? 'text-fuzzy'
									: 'text-foreground'
						)}
					>
						<Icon
							name="chevron-right"
							size={14}
							class={cn('transition-transform', specsOpen && 'rotate-90')}
						/>
						Specs
						<span class="ml-auto text-xs font-normal">
							{#if missingRequired}
								Missing required
							{:else if specsFromFuzzy}
								From fuzzy parsing
							{/if}
						</span>
					</button>

					{#if specsOpen}
						<div class="grid grid-cols-2 gap-3 p-3 pt-1">
							<label class="col-span-2 flex flex-col gap-1.5">
								<span class="text-xs font-medium text-muted-foreground">Release group *</span>
								<input
									type="text"
									bind:value={releaseGroup}
									readonly={explicitGroup != null}
									class={cn(
										fieldClass(releaseGroup, 'release_group', true),
										explicitGroup != null && 'cursor-not-allowed opacity-70'
									)}
								/>
							</label>
							<label class="flex flex-col gap-1.5">
								<span class="text-xs font-medium text-muted-foreground">Resolution *</span>
								<select bind:value={resolution} class={fieldClass(resolution, 'resolution', true)}>
									<option value="" disabled>—</option>
									{#each RESOLUTIONS as r (r)}<option value={r}>{r}</option>{/each}
								</select>
							</label>
							<label class="flex flex-col gap-1.5">
								<span class="text-xs font-medium text-muted-foreground">Encoding *</span>
								<select bind:value={encoding} class={fieldClass(encoding, 'encoding', true)}>
									<option value="" disabled>—</option>
									{#each ENCODINGS as e (e)}<option value={e}>{e}</option>{/each}
								</select>
							</label>
							<label class="flex flex-col gap-1.5">
								<span class="text-xs font-medium text-muted-foreground">Source</span>
								<select bind:value={source} class={fieldClass(source, 'source')}>
									{#each sourceOptions as s (s)}<option value={s}>{s}</option>{/each}
								</select>
							</label>
							<label class="flex flex-col gap-1.5">
								<span class="text-xs font-medium text-muted-foreground">Language code</span>
								<input
									type="text"
									placeholder="e.g. JP"
									bind:value={languageCode}
									class={fieldClass(languageCode, 'language_code')}
								/>
							</label>
							<label class="flex flex-col gap-1.5">
								<span class="text-xs font-medium text-muted-foreground">Version</span>
								<input
									type="number"
									min="1"
									bind:value={version}
									class={cn(fieldBase, 'border-input')}
								/>
							</label>
							<label class="col-span-2 flex items-center gap-2 text-sm">
								<Checkbox bind:checked={isRepack} /> Repack
							</label>
						</div>
					{/if}
				</div>

				<!-- Custom detection title (only for an explicit title + recognized group) -->
				{#if showOverride}
					<div class="rounded-lg border">
						<button
							type="button"
							aria-expanded={overrideOpen}
							onclick={() => (overrideOpen = !overrideOpen)}
							class="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium"
						>
							<Icon
								name="chevron-right"
								size={14}
								class={cn('transition-transform', overrideOpen && 'rotate-90')}
							/>
							Custom detection title
						</button>

						{#if overrideOpen}
							<div class="flex flex-col gap-3 p-3 pt-1">
								<label class="flex items-start gap-2 text-sm">
									<Checkbox bind:checked={overrideEnabled} class="mt-0.5" />
									<span>
										Match torrents with this title in the future to this anime for releases from
										<span class="font-medium">{explicitGroup}</span>
									</span>
								</label>

								{#if overrideEnabled}
									<div class="grid gap-3 sm:grid-cols-2">
										<div class="grid gap-1.5">
											<Label class="text-xs text-muted-foreground">Custom title</Label>
											<Input bind:value={overrideTitle} />
										</div>
										<div class="grid gap-1.5">
											<Label class="text-xs text-muted-foreground">Episode number offset</Label>
											<NumberStepper
												value={overrideOffset}
												min={-999}
												onChange={(n) => {
													overrideOffset = n ?? 0;
													offsetTouched = true;
												}}
												ariaLabel="Episode number offset"
												class="w-fit"
											/>
										</div>
									</div>
									<CustomTitleHint title={overrideTitle} />
								{/if}
							</div>
						{/if}
					</div>
				{/if}

				{#if checkedDone && existingDownload}
					<div class="rounded-lg border border-warning/35 bg-warning/10 p-3 text-sm">
						<p class="text-warning">This episode already has a download — it will be replaced.</p>
						<label class="mt-2 flex items-center gap-2 text-foreground">
							<Checkbox bind:checked={discardFuture} />
							Discard future torrents for this episode
						</label>
					</div>
				{/if}
			</div>
		{/if}

		<Dialog.Footer>
			<Button variant="outline" onclick={() => rssMenu.closeIdentify()}>Cancel</Button>
			{#if !checkedDone}
				<Button variant="affirmative" disabled={!canSubmit || checking} onclick={check}>
					{#if checking}<Icon name="spinner" size={15} class="animate-spin" />{/if}
					Check
				</Button>
			{:else}
				<Button variant="affirmative" disabled={!canSubmit || submitting} onclick={submit}>
					{#if submitting}<Icon name="spinner" size={15} class="animate-spin" />{/if}
					{existingDownload ? 'Download anyway' : 'Download'}
				</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
