<script lang="ts">
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { updateMappings } from '$lib/api/settings';
	import { notifySuccess } from '$lib/api/notify';

	let { class: className = '' }: { class?: string } = $props();

	const id = $props.id();
	const enabled = $derived(settings.current.mappings.hot_mapping_overrides_enabled);

	let saving = $state(false);
	let confirmOpen = $state(false);

	async function save(value: boolean) {
		saving = true;
		try {
			const updated = await updateMappings({ hot_mapping_overrides_enabled: value });
			settings.patch('mappings', updated);
			notifySuccess(value ? 'Overrides applied' : 'Overrides removed');
		} catch {
			// apiFetch already toasted the failure.
		} finally {
			saving = false;
		}
	}

	function toggle(value: boolean) {
		if (value) void save(true);
		else confirmOpen = true;
	}
</script>

<div class={className}>
	<div class="flex items-center justify-between gap-3">
		<Label for={id} class="cursor-pointer text-sm font-medium">Enable hot mapping overrides</Label>
		<Switch {id} bind:checked={() => enabled, toggle} disabled={saving} />
	</div>
	<p class="mt-1.5 text-xs text-muted-foreground">
		<a
			href="https://github.com/Saberr-app/SaberrHotMappings"
			target="_blank"
			rel="noreferrer"
			class="text-info hover:underline">Hot mapping overrides</a
		> are custom overrides from Saberr for currently airing anime.
	</p>
</div>

<ConfirmDialog
	bind:open={confirmOpen}
	title="Disable hot mapping overrides?"
	description="Disabling hot mappings could leave you with gaps in AniList/TVDB mappings, which might prevent importing episodes for some shows whose AniBridge mapping is missing or incorrect."
	confirmLabel="Disable"
	destructive
	onConfirm={() => save(false)}
/>
