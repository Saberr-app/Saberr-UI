/* =============================================================================
 * SABERR GLOBAL-SEARCH PAGE INDEX
 * -----------------------------------------------------------------------------
 * Front-end half of the header search box. Pages + settings subpages are DERIVED from
 * `nav.ts`; HAND-MAINTAINED here: `EXTRA_SUBPAGES` (Anime List tabs + Browse views) and
 * `SETTINGS_TEXT` (per-page section/field labels — keep in sync when one is renamed/added).
 * Ranking priority (lower = stronger): page > subpage > subtitle > section > field.
 * ========================================================================== */

import { nav, isSeparator, type NavItem } from './nav';
import type { IconName } from './icons';

export type MatchKind = 'page' | 'subpage' | 'subtitle' | 'section' | 'field';

/** Match strength by source. Lower sorts first. */
export const KIND_PRIORITY: Record<MatchKind, number> = {
	page: 0,
	subpage: 1,
	subtitle: 2,
	section: 3,
	field: 4
};

export interface SearchTerm {
	text: string;
	kind: MatchKind;
}

/** One navigable search target (a page or a subpage), with its searchable terms. */
export interface SearchEntry {
	/** Stable unique key (the href is enough — every target has a distinct one). */
	id: string;
	pageLabel: string;
	pageIcon: IconName;
	/** Present when this entry is a subpage (rendered as Page › Subpage). */
	subLabel?: string;
	subIcon?: IconName;
	href: string;
	/** Settings targets don't trigger the anime API auto-fire. */
	isSettings: boolean;
	terms: SearchTerm[];
}

/* --- Hand-maintained: subpages nav.ts doesn't model ------------------------- */

interface ExtraSub {
	pageLabel: string;
	pageIcon: IconName;
	subLabel: string;
	subIcon: IconName;
	href: string;
}

const EXTRA_SUBPAGES: ExtraSub[] = [
	// Anime List tabs (mirror `LIST_TABS` in userlist.svelte.ts).
	{
		pageLabel: 'Anime List',
		pageIcon: 'list',
		subLabel: 'Watching',
		subIcon: 'watching',
		href: '/list'
	},
	{
		pageLabel: 'Anime List',
		pageIcon: 'list',
		subLabel: 'Completed',
		subIcon: 'completed',
		href: '/list?tab=completed'
	},
	{
		pageLabel: 'Anime List',
		pageIcon: 'list',
		subLabel: 'Plan to watch',
		subIcon: 'planned',
		href: '/list?tab=planned'
	},
	{
		pageLabel: 'Anime List',
		pageIcon: 'list',
		subLabel: 'On hold',
		subIcon: 'hold',
		href: '/list?tab=hold'
	},
	{
		pageLabel: 'Anime List',
		pageIcon: 'list',
		subLabel: 'Dropped',
		subIcon: 'dropped',
		href: '/list?tab=dropped'
	},
	// Browse views (mirror the `tabs` in browse/+page.svelte).
	{
		pageLabel: 'Browse',
		pageIcon: 'browse',
		subLabel: 'Season View',
		subIcon: 'view-card',
		href: '/browse'
	},
	{
		pageLabel: 'Browse',
		pageIcon: 'browse',
		subLabel: 'Search',
		subIcon: 'search',
		href: '/browse?tab=search'
	}
];

/* --- Hand-maintained: settings section titles + field names ----------------- *
 * Keyed by settings href. Mirror the user-facing labels in each settings page;
 * the subpage label + subtitle already come from nav.ts, so only add the rest.   */

const SETTINGS_TEXT: Record<string, { sections?: string[]; fields?: string[] }> = {
	'/settings/general': {
		fields: ['Timezone', 'Preferred Anime title display language', 'Published URL']
	},
	'/settings/profile': {
		fields: [
			'Preferred release groups',
			'Preferred encodings',
			'Preferred resolutions',
			'Preferred languages',
			'Preferred sources',
			'Allow upgrades based on preferences or versions',
			"Priority of a torrent's attributes"
		]
	},
	'/settings/qbit': {
		sections: ['Service Setup', 'Torrent Settings', 'Torrent tags'],
		fields: [
			'Host',
			'Username',
			'Password',
			'Downloads directory',
			'Organize downloads into anime directories',
			'qBit category for torrents sent by Saberr',
			'Add the release group',
			'Add the video encoding',
			'Add the video resolution',
			'Add the language code',
			'Add the related anime title'
		]
	},
	'/settings/rss': {
		fields: ['RSS Consumer', 'Auto-download torrents', 'RSS check frequency', 'Filters', 'Category']
	},
	'/settings/processing': {
		sections: ['Episode structuring'],
		fields: [
			'Parent directory for shows',
			'Show folder name formatting (Autofill)',
			'Season folder name formatting',
			'Episode file name formatting'
		]
	},
	'/settings/mappings': {
		sections: ['Stats', 'Mapping overrides'],
		fields: [
			'Relations / offsets',
			'AniList ↔ TVDB mappings',
			'Refresh mappings',
			'AniList anime',
			'TVDB series',
			'Season',
			'From episode',
			'To episode',
			'Granularity',
			'Override only if missing',
			'Always override'
		]
	},
	'/settings/discord': {
		sections: ['Webhook Setup', 'Customization', 'Notifications'],
		fields: [
			'Webhook username',
			'Webhook avatar',
			'Discord webhook URL',
			'Discord user ID',
			'Notify on new login',
			'Notify on episode imported',
			'Notify on episode upgraded',
			'Notify on download/import failed'
		]
	},
	'/settings/system': {
		fields: ['App version', 'Web app version', 'Uptime', 'External services', 'Storage']
	},
	'/settings/about': {
		fields: ['Links', 'Attributions']
	}
};

/* --- Build the flat index --------------------------------------------------- */

function settingsTerms(href: string): SearchTerm[] {
	const text = SETTINGS_TEXT[href];
	if (!text) return [];
	return [
		...(text.sections ?? []).map((t): SearchTerm => ({ text: t, kind: 'section' })),
		...(text.fields ?? []).map((t): SearchTerm => ({ text: t, kind: 'field' }))
	];
}

function buildIndex(): SearchEntry[] {
	const entries: SearchEntry[] = [];

	for (const entry of nav) {
		if (isSeparator(entry)) continue;
		const item: NavItem = entry;
		const isSettings = item.base === '/settings';

		// The top-level page itself.
		entries.push({
			id: item.href,
			pageLabel: item.label,
			pageIcon: item.icon,
			href: item.href,
			isSettings,
			terms: [{ text: item.label, kind: 'page' }]
		});

		// Settings subpages (the only nav items with subItems).
		for (const sub of item.subItems ?? []) {
			if (isSeparator(sub)) continue;
			const terms: SearchTerm[] = [{ text: sub.label, kind: 'subpage' }];
			if (sub.subtitle) terms.push({ text: sub.subtitle, kind: 'subtitle' });
			terms.push(...settingsTerms(sub.href));
			entries.push({
				id: sub.href,
				pageLabel: item.label,
				pageIcon: item.icon,
				subLabel: sub.label,
				subIcon: sub.icon,
				href: sub.href,
				isSettings: true,
				terms
			});
		}
	}

	// Subpages nav.ts doesn't model (list tabs, browse views).
	for (const sub of EXTRA_SUBPAGES) {
		entries.push({
			id: sub.href,
			pageLabel: sub.pageLabel,
			pageIcon: sub.pageIcon,
			subLabel: sub.subLabel,
			subIcon: sub.subIcon,
			href: sub.href,
			isSettings: false,
			terms: [{ text: sub.subLabel, kind: 'subpage' }]
		});
	}

	return entries;
}

export const SEARCH_INDEX: SearchEntry[] = buildIndex();
