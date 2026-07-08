/* =============================================================================
 * SABERR COUNTRY HELPERS — flag URL + human country name for a 2-letter code (names from
 * `Intl.DisplayNames`, falling back to the uppercased code).
 * ========================================================================== */

/** flagcdn flag image for a 2-letter country code (20×15). */
export function flagUrl(code: string | null | undefined): string | null {
	if (!code) return null;
	return `https://flagcdn.com/20x15/${code.toLowerCase()}.png`;
}

let regionNames: Intl.DisplayNames | null | undefined;

function getRegionNames(): Intl.DisplayNames | null {
	if (regionNames !== undefined) return regionNames;
	try {
		regionNames = new Intl.DisplayNames(undefined, { type: 'region' });
	} catch {
		regionNames = null;
	}
	return regionNames;
}

/** Human country name for a 2-letter code, falling back to the uppercased code. */
export function countryName(code: string | null | undefined): string {
	if (!code) return '';
	const upper = code.toUpperCase();
	try {
		return getRegionNames()?.of(upper) ?? upper;
	} catch {
		return upper;
	}
}
