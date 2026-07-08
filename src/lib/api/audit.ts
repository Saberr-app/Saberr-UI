/* =============================================================================
 * SABERR AUDIT LOGS API CALLS
 * -----------------------------------------------------------------------------
 * Filtered, paginated audit-log feed. Multi-token filters are repeated params;
 * created_after/before are UTC ISO. Lazy-loads on scroll (end = a 0-row page).
 * ========================================================================== */

import { apiFetch } from './client';
import type { AuditLogCategory, AuditLogCode, AuditLogListResponse, SortDirection } from './types';

export interface ListAuditLogsParams {
	categories?: AuditLogCategory[];
	codes?: AuditLogCode[];
	textQuery?: string | null;
	/** UTC ISO datetime. */
	createdAfter?: string | null;
	/** UTC ISO datetime. */
	createdBefore?: string | null;
	sortDirection?: SortDirection;
	offset?: number;
	limit?: number;
}

/** Fetch a page of audit logs matching the given filters. */
export function listAuditLogs(params: ListAuditLogsParams = {}): Promise<AuditLogListResponse> {
	const {
		categories = [],
		codes = [],
		textQuery,
		createdAfter,
		createdBefore,
		sortDirection = 'desc',
		offset = 0,
		limit = 50
	} = params;

	const qs = new URLSearchParams();
	for (const c of categories) qs.append('categories', c);
	for (const c of codes) qs.append('codes', c);
	if (textQuery) qs.set('text_query', textQuery);
	if (createdAfter) qs.set('created_after', createdAfter);
	if (createdBefore) qs.set('created_before', createdBefore);
	qs.set('sort_direction', sortDirection);
	qs.set('offset', String(offset));
	qs.set('limit', String(limit));

	return apiFetch<AuditLogListResponse>(`/api/v1/audit-logs?${qs}`);
}
