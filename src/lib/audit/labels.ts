/* =============================================================================
 * SABERR AUDIT LABEL FORMATTING — Category/Event enum values rendered "lowered, underscores→spaces,
 * title-cased", with a few acronyms restored.
 * ========================================================================== */

/** Words that should keep a specific casing instead of plain Title Case. */
const ACRONYMS: Record<string, string> = {
	tvdb: 'TVDB',
	rss: 'RSS',
	anilist: 'AniList',
	app: 'App',
	ip: 'IP'
};

/** "TORRENT_DOWNLOAD_FAILED" → "Torrent Download Failed"; "TVDB_..." stays "TVDB ...". */
export function humanizeEnum(value: string): string {
	return value
		.toLowerCase()
		.split('_')
		.map((word) => ACRONYMS[word] ?? (word ? word[0].toUpperCase() + word.slice(1) : word))
		.join(' ');
}

/** Sentence case: "TORRENT_DOWNLOAD_FAILED" → "Torrent download failed" (acronyms preserved). */
export function sentenceCaseEnum(value: string): string {
	const joined = value
		.toLowerCase()
		.split('_')
		.map((word) => ACRONYMS[word] ?? word)
		.join(' ');
	return joined ? joined[0].toUpperCase() + joined.slice(1) : joined;
}

/** Humanize an arbitrary snake_case data key into a Sentence-style label. */
export function humanizeKey(key: string): string {
	const spaced = key
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/_/g, ' ')
		.trim()
		.toLowerCase();
	const words = spaced.split(' ');
	return words
		.map(
			(word, i) =>
				ACRONYMS[word] ?? (i === 0 && word ? word[0].toUpperCase() + word.slice(1) : word)
		)
		.join(' ');
}
