/* =============================================================================
 * SABERR FIELD VALIDATION — pure validators; each returns an error string or null.
 * ========================================================================== */

/** A URL that must carry an http(s) scheme. Empty/null is allowed (optional field). */
export function validateHttpUrl(
	value: string | null,
	opts?: { httpsOnly?: boolean }
): string | null {
	if (!value) return null;
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return 'Enter a valid URL.';
	}
	if (opts?.httpsOnly) {
		if (url.protocol !== 'https:') return 'URL must start with https://';
	} else if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		return 'URL must start with http:// or https://';
	}
	return null;
}

/** AniList username: max 20 chars, alphanumerics plus dashes/underscores. Optional. */
export function validateAnilistUsername(value: string | null): string | null {
	if (!value) return null;
	if (value.length > 20) return 'Must be 20 characters or fewer.';
	if (!/^[A-Za-z0-9_-]+$/.test(value)) {
		return 'Only letters, numbers, dashes and underscores are allowed.';
	}
	return null;
}

/** A Discord webhook username: max 80 chars and can't contain "discord"/"clyde"
 *  (Discord's webhook-name rule; any other characters are allowed). Optional. */
export function validateDiscordWebhookUsername(value: string | null): string | null {
	if (!value) return null;
	if (value.length > 80) return 'Must be 80 characters or fewer.';
	if (/clyde|discord/i.test(value)) return 'Cannot contain “clyde” or “discord”.';
	return null;
}

/** A Discord snowflake ID: numeric string. Optional. */
export function validateSnowflake(value: string | null): string | null {
	if (!value) return null;
	if (!/^\d+$/.test(value)) return 'Must be a numeric Discord ID.';
	return null;
}

/** A positive integer with an optional minimum. */
export function validatePositiveInt(value: number | null, min = 1): string | null {
	if (value === null || Number.isNaN(value)) return 'Enter a number.';
	if (!Number.isInteger(value)) return 'Must be a whole number.';
	if (value < min) return `Must be at least ${min}.`;
	return null;
}

/** A password is "weak" (a soft hint, never a hard block) when nonempty but under 6 chars. */
export function isWeakPassword(value: string): boolean {
	return value.length > 0 && value.length < 6;
}
