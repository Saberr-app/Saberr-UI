/* =============================================================================
 * SABERR NOTIFICATIONS API CALLS
 * -----------------------------------------------------------------------------
 * Paginated notification feed + read-state mutations. Lazy-loads on scroll
 * (end = a 0-item page); mutations are 204.
 * ========================================================================== */

import { apiFetch } from './client';
import type { NotificationListResponse, NotificationStatus, SortDirection } from './types';

export interface ListNotificationsParams {
	statuses?: NotificationStatus[];
	sortDirection?: SortDirection;
	offset?: number;
	limit?: number;
}

/** Fetch a page of notifications (repeated `statuses` params, e.g. UNREAD + READ). */
export function listNotifications(
	params: ListNotificationsParams = {}
): Promise<NotificationListResponse> {
	const { statuses = [], sortDirection = 'desc', offset = 0, limit = 25 } = params;
	const qs = new URLSearchParams();
	for (const s of statuses) qs.append('statuses', s);
	qs.set('sort_direction', sortDirection);
	qs.set('offset', String(offset));
	qs.set('limit', String(limit));
	return apiFetch<NotificationListResponse>(`/api/v1/notifications?${qs}`);
}

/** Mark a single notification read (204 on success). */
export async function markNotificationRead(id: number): Promise<void> {
	await apiFetch<void>(`/api/v1/notifications/${id}/read`, { method: 'PUT', unwrap: false });
}

/** Mark a single notification unread (204 on success). */
export async function markNotificationUnread(id: number): Promise<void> {
	await apiFetch<void>(`/api/v1/notifications/${id}/unread`, { method: 'PUT', unwrap: false });
}

/** Mark all read (204). The page calls this silently on entry so a transient failure doesn't toast. */
export async function markAllNotificationsRead(userInitiated = true): Promise<void> {
	await apiFetch<void>('/api/v1/notifications/read', {
		method: 'PUT',
		unwrap: false,
		userInitiated
	});
}
