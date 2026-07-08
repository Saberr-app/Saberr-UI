/* =============================================================================
 * SABERR EXTERNAL LINKS — URL templates + brand logos (TVDB logo is theme-swapped).
 * ========================================================================== */

export const anilistAnimeUrl = (id: number): string => `https://anilist.co/anime/${id}`;
export const anilistMangaUrl = (id: number): string => `https://anilist.co/manga/${id}`;
export const malAnimeUrl = (idMal: number): string => `https://myanimelist.net/anime/${idMal}`;
export const tvdbSeriesUrl = (tvdbId: number): string =>
	`https://thetvdb.com/?tab=series&id=${tvdbId}`;

export const ANILIST_LOGO = '/img/anilist.png';
export const MAL_LOGO = '/img/mal.png';
export const TVDB_LOGO = { light: '/img/tvdb-light.png', dark: '/img/tvdb-dark.png' };

export const studioUrl = (siteUrl: string): string => siteUrl;

/** Second-level domain from a URL (twitter.com → "twitter"); '' if unparseable. */
export function domainFromUrl(url: string): string {
	try {
		const host = new URL(url).hostname.replace(/^www\./, '');
		const first = host.split('.')[0] ?? '';
		return first;
	} catch {
		return '';
	}
}

/** Display label for an external link: its `site`, else the derived domain. */
export function externalLinkLabel(link: { site: string | null; url: string }): string {
	if (link.site && link.site.trim()) return link.site;
	const domain = domainFromUrl(link.url);
	return domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : link.url;
}
