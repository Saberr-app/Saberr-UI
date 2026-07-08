import type { IconName } from './icons';

/* =============================================================================
 * SABERR NAVIGATION TREE — single source for the sidebar/drawer + route behavior.
 * ========================================================================== */

export interface NavSubItem {
	label: string;
	href: string;
	icon: IconName;
	/** One-line page subtitle (shown on the settings index and atop the page). */
	subtitle?: string;
}

/** A subpage, or a divider rendered between subpage groups in the sidebar accordion. */
export type NavSubEntry = NavSubItem | { separator: true };

export interface NavItem {
	label: string;
	icon: IconName;
	/** Section root, used for active-highlight + accordion expansion (e.g. "/list"). */
	base: string;
	/** Where clicking the main item lands (own content route, or the redirect target). */
	href: string;
	/** True = renders its own page; false = redirects to its first subpage. */
	ownPage: boolean;
	subItems?: NavSubEntry[];
}

export type NavEntry = NavItem | { separator: true };

export const isSeparator = (e: NavEntry | NavSubEntry): e is { separator: true } =>
	'separator' in e;

/** If `pathname` is a subpage, return its parent main item (for breadcrumbs); else null. */
export function findParentOf(pathname: string): NavItem | null {
	for (const entry of nav) {
		if (isSeparator(entry)) continue;
		if (entry.subItems?.some((s) => !isSeparator(s) && s.href === pathname)) return entry;
	}
	return null;
}

/** Return the sub-item matching `pathname` (for its subtitle), or null. */
export function findNavSubItem(pathname: string): NavSubItem | null {
	for (const entry of nav) {
		if (isSeparator(entry)) continue;
		const match = entry.subItems?.find(
			(s): s is NavSubItem => !isSeparator(s) && s.href === pathname
		);
		if (match) return match;
	}
	return null;
}

/** Return the main nav item whose section `pathname` falls under (own page or deep-link), or null. */
export function findNavItem(pathname: string): NavItem | null {
	for (const entry of nav) {
		if (isSeparator(entry)) continue;
		if (pathname === entry.base || pathname.startsWith(entry.base + '/')) return entry;
	}
	return null;
}

/**
 * Browser tab/window title for a route — single source, derived from the nav tree.
 * Subpages read as "Sub · Parent · Saberr"; main pages as "Page · Saberr". Dynamic pages
 * (e.g. a tracked-anime detail) still override this with their own `<title>`.
 */
export function pageTitle(pathname: string): string {
	const sub = findNavSubItem(pathname);
	if (sub) return `${sub.label} · ${findParentOf(pathname)?.label ?? 'Saberr'} · Saberr`;
	const item = findNavItem(pathname);
	return item ? `${item.label} · Saberr` : 'Saberr';
}

export const nav: NavEntry[] = [
	{
		label: 'Tracked Anime',
		icon: 'tracked',
		base: '/tracked',
		href: '/tracked',
		ownPage: true
	},
	{ label: 'Calendar', icon: 'calendar', base: '/calendar', href: '/calendar', ownPage: true },
	{ separator: true },
	{ label: 'Anime List', icon: 'list', base: '/list', href: '/list', ownPage: true },
	{ label: 'Browse', icon: 'browse', base: '/browse', href: '/browse', ownPage: true },
	{ separator: true },
	{ label: 'RSS', icon: 'rss', base: '/rss', href: '/rss', ownPage: true },
	{ label: 'Downloads', icon: 'downloads', base: '/downloads', href: '/downloads', ownPage: true },
	{ separator: true },
	{
		label: 'Notifications',
		icon: 'notifications',
		base: '/notifications',
		href: '/notifications',
		ownPage: true
	},
	{ label: 'Event logs', icon: 'audit', base: '/events', href: '/events', ownPage: true },
	{
		label: 'Settings',
		icon: 'settings',
		base: '/settings',
		href: '/settings',
		ownPage: true,
		subItems: [
			{
				label: 'General',
				href: '/settings/general',
				icon: 'general',
				subtitle: 'General Saberr settings'
			},
			{
				label: 'Release Profile',
				href: '/settings/profile',
				icon: 'profile',
				subtitle: 'Decide how Saberr should determine the best torrent of the same episode'
			},
			{
				label: 'Processing',
				href: '/settings/processing',
				icon: 'processing',
				subtitle: 'Set the default processing and importing settings for tracked anime'
			},
			{
				label: 'Mappings',
				href: '/settings/mappings',
				icon: 'mappings',
				subtitle: 'Anime relations and AniList/TVDB mappings.'
			},
			{ separator: true },
			{
				label: 'AniList Service',
				href: '/settings/anilist',
				icon: 'anilist',
				subtitle: 'Connect your AniList to manage your list and sync with tracked anime'
			},
			{
				label: 'qBit Service',
				href: '/settings/qbit',
				icon: 'qbit',
				subtitle: 'Connect your qBittorrent client to download torrents'
			},
			{
				label: 'RSS Service',
				href: '/settings/rss',
				icon: 'rss',
				subtitle: "Configure Nyaa's RSS scheduled task settings"
			},
			{
				label: 'Discord Notifications',
				href: '/settings/discord',
				icon: 'discord',
				subtitle: 'Send new-release and app notifications to Discord'
			},
			{ separator: true },
			{
				label: 'Tasks',
				href: '/settings/tasks',
				icon: 'tasks',
				subtitle: "Run and monitor Saberr's background tasks"
			},
			{ label: 'System', href: '/settings/system', icon: 'system' },
			{ label: 'About', href: '/settings/about', icon: 'about' }
		]
	}
];
