/* =============================================================================
 * SABERR FORM HELPERS — the "save never disabled; reveal errors on submit" pattern
 * (aria-invalid gated on a submit flag; `focusFirstInvalid` jumps to the first).
 * ========================================================================== */

/** Empty/whitespace → null (backend rejects "" on nullable minLength=1); else unchanged, untrimmed. */
export function blankToNull(value: string | null | undefined): string | null {
	return value == null || value.trim() === '' ? null : value;
}

/** Deep structural compare that treats blank/whitespace-only strings as null — so an emptied
 *  optional field reads as *unchanged* (matching `blankToNull`, which is applied on save). Use this
 *  for settings-page dirtiness instead of a raw `JSON.stringify` compare (which sees `"" ≠ null`). */
export function settingsChanged(a: unknown, b: unknown): boolean {
	return JSON.stringify(nullifyBlanks(a)) !== JSON.stringify(nullifyBlanks(b));
}

function nullifyBlanks(value: unknown): unknown {
	if (typeof value === 'string') return value.trim() === '' ? null : value;
	if (Array.isArray(value)) return value.map(nullifyBlanks);
	if (value !== null && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const key of Object.keys(value as Record<string, unknown>)) {
			out[key] = nullifyBlanks((value as Record<string, unknown>)[key]);
		}
		return out;
	}
	return value;
}

/** Scroll the first invalid control in `container` into view and focus it. */
export function focusFirstInvalid(container: HTMLElement | null | undefined): boolean {
	const el = container?.querySelector<HTMLElement>('[aria-invalid="true"]');
	if (!el) return false;
	el.scrollIntoView({ block: 'center', behavior: 'smooth' });
	el.focus({ preventScroll: true });
	return true;
}
