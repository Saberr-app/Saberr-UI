/* =============================================================================
 * SABERR NOTIFICATION PRESENTATION — glyph by `code` + accent class by level
 * (the `.notif-*` classes in app.css tint surface/badge/chip).
 * ========================================================================== */

import type { IconName } from './icons';
import type { NotificationCode, NotificationLevel } from '$lib/api/types';

/** Glyph per notification code (falls back to the bell for anything unmapped). */
export const NOTIFICATION_ICON: Record<NotificationCode, IconName> = {
	DOWNLOAD_PROCESSING_PERMANENTLY_FAILED: 'downloads',
	UNCATEGORIZED_ERROR: 'close',
	SERVICE_DOWN: 'globe',
	UNCATEGORIZED_WARNING: 'notifications',
	GENERAL: 'notifications',
	LOGIN: 'user'
};

/** Accent class per level — sets `--notif-accent` for the surface/badge/chip mixes. */
export const NOTIFICATION_LEVEL_ACCENT: Record<NotificationLevel, string> = {
	INFO: 'notif-info',
	WARNING: 'notif-warning',
	ERROR: 'notif-error'
};
