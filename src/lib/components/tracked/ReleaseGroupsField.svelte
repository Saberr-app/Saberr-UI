<script lang="ts">
	import type { TrackedAnimeReleaseGroupSettings } from '$lib/api/types';
	import { tick } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { Input } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import Icon from '$lib/components/Icon.svelte';
	import NumberStepper from '$lib/components/anime/NumberStepper.svelte';
	import CustomTitleHint from '$lib/components/tracked/CustomTitleHint.svelte';
	import InlineMarkup from '$lib/components/settings/InlineMarkup.svelte';
	import { sortAlpha } from '$lib/tracked/release-groups';

	// Enablement + order = `preferred` (the profile's release-group list); overrides (title + offset)
	// = `overrides`, one record per available group. Enabled rows sit on top in `preferred` order; a
	// "Disabled groups" separator floats above the rest (alpha). Checkboxes/reorder lock under default.
	let {
		overrides = $bindable(),
		preferred = $bindable(),
		globalPreferred,
		available,
		defaultProfile = false
	}: {
		/** Per-group overrides (title + offset) for every available group. */
		overrides: TrackedAnimeReleaseGroupSettings[];
		/** The per-anime CUSTOM enabled+ordered list (editable under custom; untouched under default). */
		preferred: string[];
		/** The global profile's enabled+ordered list — shown read-only under a default profile. */
		globalPreferred: string[];
		/** All available release group names. */
		available: string[];
		/** Release profile is the default → enabling/disabling + reordering are locked. */
		defaultProfile?: boolean;
	} = $props();

	// Group names whose (empty) custom-title/offset fields the user has revealed.
	const revealed = new SvelteSet<string>();

	// The active enabled+ordered list: the read-only global set under default, the editable
	// per-anime set under custom. Two independent states — toggling never mutates the other.
	const activePreferred = $derived(defaultProfile ? globalPreferred : preferred);

	const availableSet = $derived(new SvelteSet(available));
	const activeSet = $derived(new SvelteSet(activePreferred));
	// Enabled in preferred order (guard against a stale name not in available).
	const enabledList = $derived(activePreferred.filter((n) => availableSet.has(n)));
	const disabledList = $derived(sortAlpha(available.filter((n) => !activeSet.has(n))));
	const noneEnabled = $derived(enabledList.length === 0);

	// One combined, keyed list — enabled rows, a separator marker, then disabled rows. Rendering
	// enabled + disabled in a SINGLE {#each} (rather than two blocks) means toggling a group RELOCATES
	// its existing node instead of destroy/recreate, so focus survives and the dialog doesn't jump.
	type Row = { kind: 'group'; name: string; index: number | null } | { kind: 'sep' };
	const rows = $derived<Row[]>([
		...enabledList.map((name, index) => ({ kind: 'group', name, index }) as Row),
		...(disabledList.length > 0 ? [{ kind: 'sep' } as Row] : []),
		...disabledList.map((name) => ({ kind: 'group', name, index: null }) as Row)
	]);
	const rowKey = (r: Row) => (r.kind === 'sep' ? '__sep__' : r.name);

	const overrideFor = (name: string) => overrides.find((o) => o.release_group_name === name);
	const hasCustomTitle = (o?: TrackedAnimeReleaseGroupSettings) =>
		!!o?.override_match_against && o.override_match_against.trim().length > 0;
	// Fields show for an enabled group that has a value or was revealed.
	const expanded = (name: string) => hasCustomTitle(overrideFor(name)) || revealed.has(name);

	function setEnabled(name: string, checked: boolean) {
		if (checked) {
			if (!preferred.includes(name)) preferred = [...preferred, name]; // to bottom of enabled
		} else {
			preferred = preferred.filter((n) => n !== name);
			revealed.delete(name); // a disabled group hides its fields (values retained in `overrides`)
		}
	}

	// Reorder within the enabled list (custom only) — swap with the adjacent row.
	function move(i: number, dir: -1 | 1) {
		const j = i + dir;
		if (j < 0 || j >= preferred.length) return;
		const next = [...preferred];
		[next[i], next[j]] = [next[j], next[i]];
		preferred = next;
	}

	// Reveal the title/offset fields. The clicked link unmounts immediately, so focus its card first
	// (else focus falls to <body> and the dialog jumps to the top), then the now-rendered input.
	async function revealFields(e: MouseEvent, name: string) {
		const card = (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-group]');
		card?.focus({ preventScroll: true });
		revealed.add(name);
		await tick();
		card?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
	}

	// Remove the override: null the title + zero the offset, collapse back to "Set…". The clicked
	// link unmounts on collapse, so focus its card first (else focus falls to <body> → dialog jumps up).
	function removeOverride(e: MouseEvent, name: string) {
		(e.currentTarget as HTMLElement).closest<HTMLElement>('[data-group]')?.focus({
			preventScroll: true
		});
		const o = overrideFor(name);
		if (o) {
			o.override_match_against = null;
			o.episode_number_offset = 0;
		}
		revealed.delete(name);
	}
</script>

<div class="flex flex-col gap-3">
	{#if noneEnabled && available.length > 0}
		<p
			class="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning"
		>
			<Icon name="alert-triangle" size={15} class="shrink-0" />
			No release group is enabled, so nothing will be downloaded for this anime.
		</p>
	{/if}

	{#if available.length === 0}
		<p class="text-sm text-muted-foreground">No release groups are configured.</p>
	{/if}

	{#if defaultProfile && available.length > 0}
		<p class="rounded-md bg-muted/60 p-2.5 text-xs text-muted-foreground">
			<InlineMarkup
				text="Enabling/disabling and reordering groups are not available per-anime when using the default **Release profile**. Set it to Custom to change them here."
			/>
		</p>
	{/if}

	{#snippet groupRow(name: string, index: number | null)}
		{@const o = overrideFor(name)}
		{@const enabled = index !== null}
		{@const shown = enabled && expanded(name)}
		<div class="flex items-start gap-2">
			<span
				class="w-7 shrink-0 pt-3 text-right text-xs font-medium text-muted-foreground tabular-nums"
			>
				{#if enabled}#{index + 1}{/if}
			</span>
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div
				data-group
				tabindex={-1}
				class="flex flex-1 flex-col gap-3 rounded-md border border-border p-3 outline-none"
			>
				<div class="flex items-center gap-2">
					<label class="flex cursor-pointer items-center gap-2">
						<Checkbox
							checked={enabled}
							disabled={defaultProfile}
							onCheckedChange={(v) => setEnabled(name, v === true)}
						/>
						<span class="text-sm font-medium">{name}</span>
					</label>

					{#if enabled && !shown}
						<button
							type="button"
							onclick={(e) => revealFields(e, name)}
							class="text-xs text-info underline-offset-4 hover:underline"
						>
							Set custom title/offset
						</button>
					{:else if enabled && shown}
						<button
							type="button"
							onclick={(e) => removeOverride(e, name)}
							class="text-xs text-destructive underline-offset-4 hover:underline"
						>
							Remove custom title/offset
						</button>
					{/if}

					{#if enabled}
						<div class="ml-auto flex items-center">
							<button
								type="button"
								onclick={() => move(index, -1)}
								disabled={defaultProfile || index === 0}
								aria-label="Move up"
								class="grid size-7 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
							>
								<Icon name="chevron-down" size={16} class="rotate-180" />
							</button>
							<button
								type="button"
								onclick={() => move(index, 1)}
								disabled={defaultProfile || index === enabledList.length - 1}
								aria-label="Move down"
								class="grid size-7 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
							>
								<Icon name="chevron-down" size={16} />
							</button>
						</div>
					{/if}
				</div>

				{#if shown && o}
					<div class="grid gap-3 sm:grid-cols-2">
						<div class="grid gap-1.5">
							<Label class="text-xs text-muted-foreground">Custom title</Label>
							<Input
								value={o.override_match_against ?? ''}
								oninput={(e) => (o.override_match_against = e.currentTarget.value || null)}
							/>
						</div>
						<div class="grid gap-1.5">
							<Label class="text-xs text-muted-foreground">Episode number offset</Label>
							<NumberStepper
								value={o.episode_number_offset}
								min={-999}
								onChange={(n) => (o.episode_number_offset = n ?? 0)}
								ariaLabel="Episode number offset"
								class={hasCustomTitle(o) ? 'w-fit' : 'pointer-events-none w-fit opacity-50'}
							/>
						</div>
					</div>

					{#if hasCustomTitle(o)}
						<CustomTitleHint title={o.override_match_against} />
					{/if}
				{/if}
			</div>
		</div>
	{/snippet}

	{#each rows as row (rowKey(row))}
		{#if row.kind === 'sep'}
			<div class="flex items-center gap-2 px-1 py-0.5">
				<span class="h-px flex-1 bg-border"></span>
				<span class="text-xs text-muted-foreground">Disabled groups</span>
				<span class="h-px flex-1 bg-border"></span>
			</div>
		{:else}
			{@render groupRow(row.name, row.index)}
		{/if}
	{/each}
</div>
