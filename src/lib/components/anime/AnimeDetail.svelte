<script lang="ts">
	import { mode } from 'mode-watcher';
	import { SvelteSet } from 'svelte/reactivity';
	import { browse } from '$lib/stores/browse.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { displayTitle, secondaryTitle } from '$lib/anilist/titles';
	import { seasonYearLabel, sourceLabel } from '$lib/anilist/enums';
	import { formatFuzzyDate } from '$lib/anilist/dates';
	import { flagUrl, countryName } from '$lib/anilist/country';
	import { safeDescriptionHtml } from '$lib/anilist/description';
	import type { MutationContext } from '$lib/anilist/entry-actions';
	import { incrementProgress } from '$lib/anilist/entry-actions';
	import {
		anilistAnimeUrl,
		malAnimeUrl,
		tvdbSeriesUrl,
		externalLinkLabel,
		ANILIST_LOGO,
		MAL_LOGO,
		TVDB_LOGO
	} from '$lib/config/external';
	import { coverImage, primaryStudio } from '$lib/anilist/media';
	import { resolveBackendUrl } from '$lib/config/api';
	import Icon from '$lib/components/Icon.svelte';
	import { Button } from '$lib/components/ui/button';
	import AnimePoster from './AnimePoster.svelte';
	import FormatBadge from './FormatBadge.svelte';
	import AiringBadge from './AiringBadge.svelte';
	import StatusBadge from './StatusBadge.svelte';
	import AnimeScore from './AnimeScore.svelte';
	import ScoreDisplay from './ScoreDisplay.svelte';
	import Popularity from './Popularity.svelte';
	import ProgressControl from './ProgressControl.svelte';
	import NextEpisode from './NextEpisode.svelte';
	import AnimeActionsMenu from './AnimeActionsMenu.svelte';
	import EditListEntryDialog from './EditListEntryDialog.svelte';
	import TrackDialog from '$lib/components/tracked/TrackDialog.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { getTrackedAnime } from '$lib/api/tracked';
	import { summaryFromAnime, type TrackAnimeSummary } from '$lib/tracked/draft';
	import type { TrackedAnimeItem } from '$lib/api/types';
	import TagChip from './TagChip.svelte';
	import TrailerEmbed from './TrailerEmbed.svelte';
	import ScrollRow from './ScrollRow.svelte';
	import ExtraCard from './ExtraCard.svelte';
	import CharacterCard from './CharacterCard.svelte';
	import {
		relationTitle,
		relationTypeLabel,
		relationLink,
		extraFormatLabel,
		sortRelations,
		sortCharacters
	} from '$lib/anilist/extras';

	let { anilistId, backHref = '/browse' }: { anilistId: number; backHref?: string } = $props();

	// Cache-first: render a loaded anime instantly, fetch when missing; extras load best-effort alongside.
	$effect(() => {
		void browse.ensureAnime(anilistId);
		void browse.ensureExtras(anilistId);
	});
	async function refresh() {
		// Force-refresh the anime first, then extras (which carry relation list-statuses).
		await browse.ensureAnime(anilistId, true);
		await browse.ensureExtras(anilistId, true);
	}

	const item = $derived(browse.cachedAnime(anilistId));
	const loading = $derived(!item && browse.animeLoading);
	const extras = $derived(browse.cachedExtras(anilistId));
	const sortedRelations = $derived(extras ? sortRelations(extras.relations) : []);
	const sortedCharacters = $derived(extras ? sortCharacters(extras.characters) : []);
	let showCast = $state(false);

	const title = $derived(item ? displayTitle(item) : '');
	const secondary = $derived(item ? secondaryTitle(item) : null);
	const cover = $derived(item ? coverImage(item) : null);
	const banner = $derived(resolveBackendUrl(item?.banner_image));
	const onList = $derived(item?.user_entry != null);

	const mctx = $derived<MutationContext | null>(
		item
			? {
					anilistId: item.id,
					episodes: item.episodes,
					airingStatus: item.status,
					entry: item.user_entry
				}
			: null
	);
	const titles = $derived({
		english: item?.english_title ?? null,
		romaji: item?.romaji_title ?? null,
		native: item?.native_title ?? null
	});

	// The two titles other than the user's preferred language, shown as detail rows.
	const cleanTitle = (s: string | null | undefined) => (s && s.trim().length > 0 ? s : null);
	const otherTitles = $derived.by<{ label: string; value: string | null }[]>(() => {
		if (!item) return [];
		const pref = settings.current.general.anilist_preferred_title_language;
		return [
			{ lang: 'English', label: 'English title', value: cleanTitle(item.english_title) },
			{ lang: 'Romaji', label: 'Romaji title', value: cleanTitle(item.romaji_title) },
			{ lang: 'Native', label: 'Native title', value: cleanTitle(item.native_title) }
		]
			.filter((t) => t.lang !== pref)
			.map(({ label, value }) => ({ label, value }));
	});

	// Tags sorted by rank desc; spoiler = either spoiler flag.
	const sortedTags = $derived(item ? [...item.tags].sort((a, b) => b.rank - a.rank) : []);
	const hasSpoilerTags = $derived(
		sortedTags.some((t) => t.is_media_spoiler || t.is_general_spoiler)
	);
	// Spoiler reveal state lives here (not per-chip) so "Hide spoilers" re-hides everything at once.
	let revealAllSpoilers = $state(false);
	const revealedTags = new SvelteSet<string>();
	const anySpoilerShown = $derived(revealAllSpoilers || revealedTags.size > 0);
	function toggleSpoilers() {
		if (anySpoilerShown) {
			revealAllSpoilers = false;
			revealedTags.clear();
		} else {
			revealAllSpoilers = true;
		}
	}

	const primary = $derived(item ? primaryStudio(item.studios) : null);
	const producers = $derived(item ? item.studios.filter((s) => !s.is_primary) : []);
	// "Aired" range: start – end, with the end left blank when not yet known.
	const airedRange = $derived.by(() => {
		if (!item) return null;
		const s = formatFuzzyDate(item.start_date);
		const e = formatFuzzyDate(item.end_date);
		if (!s && !e) return null;
		return `${s ?? '?'} – ${e ?? ''}`;
	});

	const tvdbLogo = $derived(mode.current === 'dark' ? TVDB_LOGO.dark : TVDB_LOGO.light);

	let editOpen = $state(false);

	// Tracking: not tracked → create dialog; tracked → a popover ("Go to tracked page" + "Edit tracking").
	let trackOpen = $state(false);
	let trackPopoverOpen = $state(false);
	let trackingItem = $state<TrackedAnimeItem | null>(null);
	let trackingSummary = $state<TrackAnimeSummary | null>(null);
	let loadingTracking = $state(false);

	function startTracking() {
		if (!item) return;
		trackingItem = null;
		trackingSummary = summaryFromAnime(item);
		trackOpen = true;
	}
	async function editTracking() {
		if (item?.tracked_anime_id == null) return;
		loadingTracking = true;
		try {
			trackingItem = await getTrackedAnime(item.tracked_anime_id, false, false);
			trackingSummary = null;
			trackPopoverOpen = false;
			trackOpen = true;
		} finally {
			loadingTracking = false;
		}
	}
	const durationLabel = (m: number | null) => (m != null ? `${m} min` : null);
</script>

<!-- Breadcrumb + refresh -->
<div class="mb-4 flex items-center gap-2 text-sm">
	<a
		href={backHref}
		class="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
	>
		<Icon name="browse" size={15} />
		Browse
	</a>
	<Icon name="chevron-right" size={14} class="text-muted-foreground/60" />
	<span class="truncate font-medium">{title || `#${anilistId}`}</span>
	{#if item}
		<button
			type="button"
			onclick={refresh}
			class="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
			disabled={browse.animeLoading}
		>
			<Icon name="refresh" size={13} class={browse.animeLoading ? 'animate-spin' : ''} />
			Refresh
		</button>
	{/if}
</div>

{#if loading}
	<div class="space-y-4">
		<div class="h-44 w-full animate-pulse rounded-xl bg-muted sm:h-60 lg:h-80"></div>
		<div class="flex gap-4">
			<div class="aspect-[2/3] w-32 animate-pulse rounded-xl bg-muted sm:w-40"></div>
			<div class="flex-1 space-y-3 py-2">
				<div class="h-7 w-2/3 animate-pulse rounded bg-muted"></div>
				<div class="h-4 w-1/3 animate-pulse rounded bg-muted"></div>
				<div class="h-20 w-full animate-pulse rounded bg-muted"></div>
			</div>
		</div>
	</div>
{:else if !item}
	<div
		class="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center text-muted-foreground"
	>
		<Icon name="browse" size={32} class="opacity-40" />
		<p>Couldn't load this anime.</p>
		<Button href={backHref} variant="outline" size="sm">Back to Browse</Button>
	</div>
{:else}
	<article class="detail space-y-6">
		<!-- Hero: cinematic banner with the cover floating over the scrim -->
		<header class="reveal relative">
			<div class="relative h-44 w-full overflow-hidden rounded-t-xl sm:h-60 lg:h-80">
				{#if banner}
					<img src={banner} alt="" class="h-full w-full object-cover" loading="eager" />
				{:else if cover}
					<img
						src={cover}
						alt=""
						class="h-full w-full scale-110 object-cover blur-2xl brightness-75"
					/>
				{:else}
					<div class="h-full w-full bg-gradient-to-br from-muted to-card"></div>
				{/if}
				<div
					class="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/10"
				></div>
			</div>

			<div
				class="relative -mt-20 flex flex-col gap-4 px-1 sm:-mt-28 sm:flex-row sm:items-end sm:px-5"
			>
				<AnimePoster
					src={cover}
					alt={title}
					isAdult={item.is_adult}
					class="aspect-[2/3] w-28 shrink-0 rounded-xl shadow-xl ring-1 ring-border sm:w-40"
				/>
				<div class="min-w-0 flex-1 pb-1">
					<h1 class="text-xl leading-tight font-bold text-balance sm:text-2xl lg:text-3xl">
						{title}
					</h1>
					{#if secondary}
						<p class="mt-1 truncate text-sm text-muted-foreground">{secondary}</p>
					{/if}
					<div class="mt-3 flex flex-wrap items-center gap-2">
						{#if item.format}<FormatBadge format={item.format} />{/if}
						<AiringBadge status={item.status} />
						{#if item.season || item.season_year}
							<span class="text-sm text-muted-foreground">
								{seasonYearLabel(item.season, item.season_year)}
							</span>
						{/if}
						{#if item.is_adult}
							<span
								class="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400"
							>
								18+
							</span>
						{/if}
						<AnimeScore score={item.mean_score} size={16} class="text-sm" />
						{#if item.popularity != null}
							<Popularity count={item.popularity} iconSide="left" class="text-sm" />
						{/if}
					</div>
				</div>
			</div>
		</header>

		<!-- Action row -->
		<div class="reveal flex flex-wrap items-center gap-2" style="animation-delay:60ms">
			<Button
				type="button"
				variant={onList ? 'outline' : 'affirmative'}
				onclick={() => (editOpen = true)}
			>
				<Icon name={onList ? 'edit' : 'plus'} size={16} />
				{onList ? 'Edit list entry' : 'Add to list'}
			</Button>
			{#if item.tracked_anime_id != null}
				<Popover.Root bind:open={trackPopoverOpen}>
					<Popover.Trigger
						class="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium transition hover:bg-muted"
					>
						<Icon name="tracked" size={16} />
						Tracking
						<Icon name="chevron-down" size={14} class="text-muted-foreground" />
					</Popover.Trigger>
					<Popover.Content class="w-52 p-1" align="start">
						<a
							href={`/tracked/${item.tracked_anime_id}`}
							class="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted"
						>
							<Icon name="external-link" size={15} />
							Go to tracked page
						</a>
						<button
							type="button"
							onclick={editTracking}
							disabled={loadingTracking}
							class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted disabled:opacity-60"
						>
							<Icon
								name={loadingTracking ? 'spinner' : 'edit'}
								size={15}
								class={loadingTracking ? 'animate-spin' : ''}
							/>
							Edit tracking
						</button>
					</Popover.Content>
				</Popover.Root>
				<Button
					href={`/rss?q=${encodeURIComponent(item.romaji_title ?? item.english_title ?? '')}`}
					variant="outline"
					title="Search for torrents"
				>
					<Icon name="rss" size={16} />
					Torrents
				</Button>
			{:else}
				<Button type="button" variant="outline" onclick={startTracking}>
					<Icon name="tracked" size={16} />
					Track
				</Button>
			{/if}

			<div class="ml-auto flex items-center gap-1.5">
				<a
					href={anilistAnimeUrl(item.id)}
					target="_blank"
					rel="noopener noreferrer"
					title="Open in AniList"
					class="inline-flex h-9 items-center rounded-md border border-border bg-card px-2.5 transition hover:bg-muted"
				>
					<img src={ANILIST_LOGO} alt="AniList" class="h-4 w-auto" />
				</a>
				{#if item.idMal != null}
					<a
						href={malAnimeUrl(item.idMal)}
						target="_blank"
						rel="noopener noreferrer"
						title="Open in MyAnimeList"
						class="inline-flex h-9 items-center rounded-md border border-border bg-card px-2.5 transition hover:bg-muted"
					>
						<img src={MAL_LOGO} alt="MyAnimeList" class="h-4 w-auto" />
					</a>
				{/if}
				{#if item.tvdb_series_id != null}
					<a
						href={tvdbSeriesUrl(item.tvdb_series_id)}
						target="_blank"
						rel="noopener noreferrer"
						title="Open in TheTVDB"
						class="inline-flex h-9 items-center rounded-md border border-border bg-card px-2.5 transition hover:bg-muted"
					>
						<img src={tvdbLogo} alt="TheTVDB" class="h-4 w-auto" />
					</a>
				{/if}
				{#if mctx}
					<AnimeActionsMenu
						ctx={mctx}
						idMal={item.idMal}
						{title}
						{titles}
						onEdit={() => (editOpen = true)}
						triggerClass="size-9 border border-border bg-card"
						bare
					/>
				{/if}
			</div>
		</div>

		<!-- Body: two columns on desktop; a custom interleaved order on phone -->
		<div class="flex flex-col gap-6 lg:grid lg:grid-cols-3 lg:items-start">
			<!-- Main column (synopsis · genres · tags · relations · characters · staff) -->
			<div class="contents lg:col-span-2 lg:flex lg:flex-col lg:gap-6">
				{#if item.description}
					<section class="reveal order-1 lg:order-none" style="animation-delay:120ms">
						<h2 class="mb-2 text-sm font-semibold text-muted-foreground">Synopsis</h2>
						<div class="description text-sm leading-relaxed">
							<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized by safeDescriptionHtml (fixed allow-list) -->
							{@html safeDescriptionHtml(item.description)}
						</div>
					</section>
				{/if}

				{#if item.genres.length > 0}
					<section class="reveal order-2 lg:order-none" style="animation-delay:160ms">
						<h2 class="mb-2 text-sm font-semibold text-muted-foreground">Genres</h2>
						<div class="flex flex-wrap gap-1.5">
							{#each item.genres as g (g)}
								<span
									class="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium"
								>
									{g}
								</span>
							{/each}
						</div>
					</section>
				{/if}

				{#if sortedTags.length > 0}
					<section class="reveal order-4 lg:order-none" style="animation-delay:200ms">
						<div class="mb-2 flex items-center gap-3">
							<h2 class="text-sm font-semibold text-muted-foreground">Tags</h2>
							{#if hasSpoilerTags}
								<button
									type="button"
									onclick={toggleSpoilers}
									class="text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
								>
									{anySpoilerShown ? 'Hide spoilers' : 'View spoilers'}
								</button>
							{/if}
						</div>
						<div class="flex flex-wrap gap-2">
							{#each sortedTags as tag (tag.name)}
								<TagChip
									name={tag.name}
									rank={tag.rank}
									spoiler={tag.is_media_spoiler || tag.is_general_spoiler}
									revealed={revealAllSpoilers || revealedTags.has(tag.name)}
									onReveal={() => revealedTags.add(tag.name)}
								/>
							{/each}
						</div>
					</section>
				{/if}

				{#if extras && sortedRelations.length > 0}
					<section class="reveal order-8 lg:order-none">
						<h2 class="mb-2 text-sm font-semibold text-muted-foreground">Relations</h2>
						<ScrollRow>
							{#each sortedRelations as r, i (`${r.id}-${i}`)}
								{@const link = relationLink(r)}
								<ExtraCard
									image={r.image_url}
									title={relationTitle(r)}
									attribute={relationTypeLabel(r.relation_type)}
									topTag={extraFormatLabel(r.format)}
									status={r.list_status}
									href={link.href}
									external={link.external}
								/>
							{/each}
						</ScrollRow>
					</section>
				{/if}

				{#if extras && extras.characters.length > 0}
					<section class="reveal order-9 lg:order-none">
						<h2 class="mb-2 text-sm font-semibold text-muted-foreground">Characters</h2>
						<ScrollRow>
							{#each sortedCharacters as c, i (`${c.site_url}-${i}`)}
								<CharacterCard character={c} {showCast} />
							{/each}
						</ScrollRow>
						<button
							type="button"
							onclick={() => (showCast = !showCast)}
							class="mt-2 w-full rounded-lg border border-border bg-card py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
						>
							{showCast ? 'Hide cast' : 'Show cast'}
						</button>
					</section>
				{/if}

				{#if extras && extras.staff.length > 0}
					<section class="reveal order-10 lg:order-none">
						<h2 class="mb-2 text-sm font-semibold text-muted-foreground">Staff</h2>
						<ScrollRow>
							{#each extras.staff as s, i (`${s.site_url}-${i}`)}
								<ExtraCard
									image={s.image_url}
									title={s.name}
									attribute={s.role}
									href={s.site_url}
									external
								/>
							{/each}
						</ScrollRow>
					</section>
				{/if}
			</div>

			<!-- Aside (your list · details · trailer · producers · links) -->
			<div class="contents lg:flex lg:flex-col lg:gap-6">
				{#if onList && item.user_entry && mctx}
					{@const entry = item.user_entry}
					<section
						class="reveal order-first rounded-xl border border-border bg-card p-4 lg:order-none"
						style="animation-delay:100ms"
					>
						<div class="mb-3 flex items-center justify-between">
							<h2 class="text-sm font-semibold">Your list</h2>
							<button
								type="button"
								onclick={() => (editOpen = true)}
								class="text-xs text-muted-foreground hover:text-foreground"
							>
								Edit
							</button>
						</div>
						<div class="space-y-2.5 text-sm">
							<div class="flex items-center justify-between gap-3">
								<span class="text-muted-foreground">Status</span>
								<StatusBadge status={entry.status} />
							</div>
							<div class="flex items-center justify-between gap-3">
								<span class="text-muted-foreground">Progress</span>
								<ProgressControl
									progress={entry.progress}
									episodes={item.episodes}
									onIncrement={() => incrementProgress(mctx)}
								/>
							</div>
							<div class="flex items-center justify-between gap-3">
								<span class="text-muted-foreground">Your score</span>
								<ScoreDisplay score={entry.score} size={15} />
							</div>
							{#if entry.repeat_count > 0}
								<div class="flex items-center justify-between gap-3">
									<span class="text-muted-foreground">Rewatches</span>
									<span class="font-medium">{entry.repeat_count}</span>
								</div>
							{/if}
							{#if formatFuzzyDate(entry.started_at)}
								<div class="flex items-center justify-between gap-3">
									<span class="text-muted-foreground">Started</span>
									<span class="font-medium">{formatFuzzyDate(entry.started_at)}</span>
								</div>
							{/if}
							{#if formatFuzzyDate(entry.completed_at)}
								<div class="flex items-center justify-between gap-3">
									<span class="text-muted-foreground">Completed</span>
									<span class="font-medium">{formatFuzzyDate(entry.completed_at)}</span>
								</div>
							{/if}
						</div>
					</section>
				{/if}

				<!-- Details / stats -->
				<section
					class="reveal order-3 rounded-xl border border-border bg-card p-4 lg:order-none"
					style="animation-delay:140ms"
				>
					<h2 class="mb-3 text-sm font-semibold">Details</h2>
					<dl class="divide-y divide-border/60 text-sm">
						{#snippet stat(label: string, value: string | null)}
							<div class="flex items-center justify-between gap-3 py-2">
								<dt class="text-muted-foreground">{label}</dt>
								<dd class="text-right font-medium">{value ?? '—'}</dd>
							</div>
						{/snippet}

						{#if item.next_airing_episode}
							<div class="flex items-center justify-between gap-3 py-2">
								<dt class="text-muted-foreground">Next episode</dt>
								<dd><NextEpisode next={item.next_airing_episode} /></dd>
							</div>
						{/if}
						{@render stat('Episodes', item.episodes != null ? String(item.episodes) : null)}
						{@render stat('Duration', durationLabel(item.duration))}

						<div class="flex items-center justify-between gap-3 py-2">
							<dt class="text-muted-foreground">Format</dt>
							<dd class="font-medium">
								{#if item.format}<FormatBadge format={item.format} size="xs" />{:else}—{/if}
							</dd>
						</div>
						{@render stat('Source', item.source ? sourceLabel(item.source) : null)}
						{@render stat(
							'Season',
							item.season || item.season_year
								? seasonYearLabel(item.season, item.season_year)
								: null
						)}
						{@render stat('Aired', airedRange)}

						{#if primary}
							<div class="flex items-center justify-between gap-3 py-2">
								<dt class="text-muted-foreground">Studio</dt>
								<dd class="text-right font-medium">
									<a
										href={primary.site_url}
										target="_blank"
										rel="noopener noreferrer"
										class="hover:underline">{primary.name}</a
									>
								</dd>
							</div>
						{/if}

						<div class="flex items-center justify-between gap-3 py-2">
							<dt class="text-muted-foreground">Popularity</dt>
							<dd>
								{#if item.popularity != null}
									<Popularity
										count={item.popularity}
										iconSide="right"
										class="font-medium text-foreground"
									/>
								{:else}
									<span class="font-medium">—</span>
								{/if}
							</dd>
						</div>
						<div class="flex items-center justify-between gap-3 py-2">
							<dt class="text-muted-foreground">Mean score</dt>
							<dd><AnimeScore score={item.mean_score} size={14} class="text-sm" /></dd>
						</div>
						<div class="flex items-center justify-between gap-3 py-2">
							<dt class="text-muted-foreground">Average score</dt>
							<dd><AnimeScore score={item.average_score} size={14} class="text-sm" /></dd>
						</div>

						{#each otherTitles as t (t.label)}
							{@render stat(t.label, t.value)}
						{/each}

						{#if item.synonyms.length > 0}
							<div class="flex items-start justify-between gap-3 py-2">
								<dt class="shrink-0 text-muted-foreground">Synonyms</dt>
								<dd class="flex flex-col items-end text-right font-medium">
									{#each item.synonyms as syn, i (`${syn}-${i}`)}
										<span>{syn}</span>
									{/each}
								</dd>
							</div>
						{/if}

						{#if item.country_of_origin}
							<div class="flex items-center justify-between gap-3 py-2">
								<dt class="text-muted-foreground">Country</dt>
								<dd class="inline-flex items-center gap-1.5 font-medium">
									{#if flagUrl(item.country_of_origin)}
										<img
											src={flagUrl(item.country_of_origin)}
											alt=""
											class="h-3 w-auto rounded-[1px]"
										/>
									{/if}
									{countryName(item.country_of_origin)}
								</dd>
							</div>
						{/if}
					</dl>
				</section>

				{#if item.trailer_url}
					<section class="reveal order-5 lg:order-none" style="animation-delay:240ms">
						<h2 class="mb-2 text-sm font-semibold text-muted-foreground">Trailer</h2>
						<TrailerEmbed url={item.trailer_url} />
					</section>
				{/if}

				{#if producers.length > 0}
					<section
						class="reveal order-6 rounded-xl border border-border bg-card p-4 lg:order-none"
						style="animation-delay:180ms"
					>
						<h2 class="mb-2 text-sm font-semibold">Producers</h2>
						<div class="flex flex-wrap gap-1.5">
							{#each producers as studio, i (`${studio.name}-${i}`)}
								<a
									href={studio.site_url}
									target="_blank"
									rel="noopener noreferrer"
									class="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium transition hover:bg-muted"
								>
									{studio.name}
								</a>
							{/each}
						</div>
					</section>
				{/if}

				{#if item.external_links.length > 0}
					<section
						class="reveal order-7 rounded-xl border border-border bg-card p-4 lg:order-none"
						style="animation-delay:220ms"
					>
						<h2 class="mb-2 text-sm font-semibold">External links</h2>
						<div class="flex flex-wrap gap-1.5">
							{#each item.external_links as link, i (`${link.url}-${i}`)}
								<a
									href={link.url}
									target="_blank"
									rel="noopener noreferrer"
									class="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium transition hover:bg-muted"
								>
									{externalLinkLabel(link)}
									<Icon name="external-link" size={12} class="text-muted-foreground" />
								</a>
							{/each}
						</div>
					</section>
				{/if}
			</div>
		</div>
	</article>

	{#if item}
		<EditListEntryDialog
			bind:open={editOpen}
			anilistId={item.id}
			{title}
			episodes={item.episodes}
			airingStatus={item.status}
			entry={item.user_entry}
		/>
		<TrackDialog bind:open={trackOpen} summary={trackingSummary} item={trackingItem} />
	{/if}
{/if}

<style>
	.reveal {
		animation: detail-rise 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	@keyframes detail-rise {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.reveal {
			animation: none;
		}
	}
	/* AniList description links inherit the brand-friendly accent. */
	.description :global(a) {
		color: var(--info);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
