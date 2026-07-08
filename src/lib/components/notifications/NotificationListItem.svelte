<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import InlineMarkup from '$lib/components/settings/InlineMarkup.svelte';
	import RelativeTime from '$lib/components/RelativeTime.svelte';
	import { NOTIFICATION_ICON, NOTIFICATION_LEVEL_ACCENT } from '$lib/config/notifications';
	import { notificationExtras } from '$lib/notifications/identifier';
	import type { NotificationItem } from '$lib/api/types';

	interface Props {
		notification: NotificationItem;
		/** True while this item is the deep-linked target (briefly highlighted). */
		highlighted?: boolean;
		/** Clicking anywhere on the card marks it visually read (already read on the backend). */
		onread: (id: number) => void;
	}

	let { notification, highlighted = false, onread }: Props = $props();

	// UNREAD keeps the tinted surface; READ drops it (transparent).
	const isUnread = $derived(notification.status === 'UNREAD');
	const accent = $derived(NOTIFICATION_LEVEL_ACCENT[notification.level]);
	const extras = $derived(notificationExtras(notification));

	function markRead() {
		if (isUnread) onread(notification.id);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			markRead();
		}
	}
</script>

<div
	id={`notification-${notification.id}`}
	role="button"
	tabindex="0"
	onclick={markRead}
	onkeydown={onKeydown}
	class="{accent} flex gap-3 rounded-xl border p-4 text-left transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-info/60 {isUnread
		? 'notif-surface cursor-pointer'
		: ''} {highlighted ? 'ring-2 ring-info' : ''}"
>
	<span class="notif-badge flex size-9 shrink-0 items-center justify-center rounded-lg">
		<Icon name={NOTIFICATION_ICON[notification.code]} size={18} />
	</span>

	<div class="min-w-0 flex-1">
		<p class="text-sm break-words"><InlineMarkup text={notification.text} /></p>

		{#if extras.subtext}
			<p class="mt-1 text-sm break-words text-muted-foreground">{extras.subtext}</p>
		{/if}

		{#if extras.tags.length > 0}
			<div class="mt-2 flex flex-wrap gap-1.5">
				{#each extras.tags as tag (tag)}
					<span class="notif-chip rounded-md px-2 py-0.5 text-xs font-medium text-foreground">
						{tag}
					</span>
				{/each}
			</div>
		{/if}

		{#if extras.links.length > 0}
			<div class="mt-2 flex flex-wrap gap-3">
				{#each extras.links as link (link.href)}
					<a href={link.href} class="text-xs font-medium text-info hover:underline">
						{link.label} ›
					</a>
				{/each}
			</div>
		{/if}

		<RelativeTime
			iso={notification.effective_at}
			scope="notifications"
			class="mt-2 block w-fit text-xs text-muted-foreground"
		/>
	</div>
</div>
