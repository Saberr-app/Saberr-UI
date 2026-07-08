/* =============================================================================
 * SABERR PATH-NAME SANITIZING — the show folder becomes a real on-disk directory, so chars
 * illegal in paths are swapped for look-alike unicode (mirrors the backend's `clean_path_name`).
 * The UI flags illegal chars + offers a one-tap "Clean it".
 * ========================================================================== */

/** Characters that are illegal in a path segment (drives the inline warning). */
const ILLEGAL_PATH_CHARS = /[:/\\?*"<>|]/;

export const hasIllegalPathChars = (name: string): boolean => ILLEGAL_PATH_CHARS.test(name);

/** Replace illegal path characters with unicode look-alikes (matches the backend). */
export function cleanPathName(name: string): string {
	let p = name;
	p = p.replaceAll(':', '꞉');
	p = p.replaceAll('/', '∕');
	p = p.replaceAll('\\', '⑊');
	p = p.replaceAll('?', '︖');
	p = p.replaceAll('*', '⁎');
	// Straight quotes alternate between opening/closing curly quotes.
	const quotes = ['“', '”'];
	let qi = 0;
	while (p.includes('"')) {
		p = p.replace('"', quotes[qi]);
		qi = 1 - qi;
	}
	p = p.replaceAll('<', '‹');
	p = p.replaceAll('>', '›');
	p = p.replaceAll('|', '⏐');
	p = p.replaceAll('  ', ' ');
	return p.trim();
}
