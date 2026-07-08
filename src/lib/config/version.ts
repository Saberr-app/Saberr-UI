/* =============================================================================
 * SABERR VERSION — UI version + the semver comparator (see status store).
 * ========================================================================== */

/** UI version, baked from package.json `version` via Vite `define` — bump it there. */
export const UI_VERSION = __UI_VERSION__;

type Parsed = {
	release: [number, number, number];
	pre: string[]; // pre-release identifiers; [] = a final release
};

/** Tolerant parse: drops `+build`, defaults missing parts to 0, never throws. */
const parse = (v: string): Parsed => {
	const [core, ...preParts] = v.replace(/\+.*$/, '').split('-');
	const nums = core.split('.');
	return {
		release: [parseInt(nums[0], 10) || 0, parseInt(nums[1], 10) || 0, parseInt(nums[2], 10) || 0],
		pre: preParts.join('-').split('.').filter(Boolean) // hyphens are legal inside a pre-release
	};
};

/** Numeric identifiers rank below alphanumeric; else compare numerically / by ASCII. */
const cmpIdentifier = (a: string, b: string): number => {
	const an = /^\d+$/.test(a);
	const bn = /^\d+$/.test(b);
	if (an && bn) return parseInt(a, 10) - parseInt(b, 10);
	if (an !== bn) return an ? -1 : 1;
	return a < b ? -1 : a > b ? 1 : 0;
};

/** Full semver 2.0.0 precedence. `>0` if `a` outranks `b`, `<0` if lower, `0` if equal. */
export const cmpVersion = (a: string, b: string): number => {
	const pa = parse(a);
	const pb = parse(b);

	for (let i = 0; i < 3; i++) {
		const d = pa.release[i] - pb.release[i];
		if (d !== 0) return d;
	}

	// Equal cores: a pre-release ranks below its own release.
	if (pa.pre.length === 0 || pb.pre.length === 0) return pa.pre.length ? -1 : pb.pre.length ? 1 : 0;

	for (let i = 0; i < Math.min(pa.pre.length, pb.pre.length); i++) {
		const d = cmpIdentifier(pa.pre[i], pb.pre[i]);
		if (d !== 0) return d;
	}
	return pa.pre.length - pb.pre.length; // all shared identifiers equal: more wins
};
