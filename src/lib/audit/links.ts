/* =============================================================================
 * SABERR AUDIT LINK BUILDERS — deep-links from the expanded view into the app. Link/id fields are
 * shown as buttons here (never as plain data rows).
 * ========================================================================== */

export interface AuditLink {
	label: string;
	href: string;
}

/** `magnet_hash` opens the torrent on the RSS feed (no get-by-hash for downloads). */
export function magnetLink(hash: string): AuditLink {
	return { label: 'Open torrent', href: `/rss?magnet_hash=${hash}` };
}

export function downloadLink(id: string | number): AuditLink {
	return { label: 'Go to download', href: `/downloads?id=${id}` };
}

export function trackedAnimeLink(id: string | number): AuditLink {
	return { label: 'Go to tracked anime', href: `/tracked/${id}` };
}

export function browseLink(anilistId: string | number): AuditLink {
	return { label: 'View in browse', href: `/browse?anilist_id=${anilistId}` };
}
