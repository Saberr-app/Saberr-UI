/* =============================================================================
 * SABERR NOTIFICATION IDENTIFIER → TAGS + LINKS — a notification's `identifier` is an object/list/
 * null; only codes that care are handled statically. Tags render inline; links as "Go to … ›".
 * ========================================================================== */

import { SERVICE_PAGE } from '$lib/config/service-indicators';
import { TORRENT_DOWNLOAD_STATUS_LABELS } from '$lib/api/types';
import type { NotificationItem, ServiceCode, TorrentDownloadStatus } from '$lib/api/types';

export interface NotificationExtras {
	/** Optional line shown between the notification text and the tags. */
	subtext: string | null;
	tags: string[];
	links: { label: string; href: string }[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function str(value: unknown): string | null {
	return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Resolve a notification's identifier into display tags + clickable links. */
export function notificationExtras(n: NotificationItem): NotificationExtras {
	const extras: NotificationExtras = { subtext: null, tags: [], links: [] };
	const id = asRecord(n.identifier);
	if (!id) return extras;

	switch (n.code) {
		case 'LOGIN': {
			const ip = str(id.ip_address);
			if (ip) extras.tags.push(`IP ${ip}`);
			const country = str(id.country);
			if (country) extras.tags.push(country);
			const browser = str(id.browser);
			if (browser) extras.tags.push(browser);
			break;
		}
		case 'DOWNLOAD_PROCESSING_PERMANENTLY_FAILED': {
			const status = str(id.status);
			if (status && status in TORRENT_DOWNLOAD_STATUS_LABELS) {
				extras.tags.push(TORRENT_DOWNLOAD_STATUS_LABELS[status as TorrentDownloadStatus]);
			}
			const downloadId = id.torrent_download_id;
			if (downloadId != null) {
				extras.links.push({
					label: 'Go to download',
					href: `/downloads?id=${downloadId}`
				});
			}
			break;
		}
		case 'SERVICE_DOWN': {
			extras.subtext = str(id.reason);
			const code = str(id.service_code);
			if (code && code in SERVICE_PAGE) {
				extras.links.push({ label: 'Go to service', href: SERVICE_PAGE[code as ServiceCode] });
			}
			break;
		}
	}

	return extras;
}
