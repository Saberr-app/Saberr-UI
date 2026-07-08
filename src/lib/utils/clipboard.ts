/* =============================================================================
 * SABERR CLIPBOARD — async Clipboard API (needs a secure context), falling back to
 * hidden-textarea + execCommand for plain-HTTP LAN access and older/iOS browsers.
 * ========================================================================== */

function legacyCopy(text: string): boolean {
	try {
		const ta = document.createElement('textarea');
		ta.value = text;
		ta.setAttribute('readonly', '');
		ta.style.position = 'fixed';
		ta.style.top = '-9999px';
		ta.style.opacity = '0';
		document.body.appendChild(ta);

		// iOS Safari needs an editable element + an explicit selection range.
		const isIOS = /ipad|iphone|ipod/i.test(navigator.userAgent);
		if (isIOS) {
			ta.contentEditable = 'true';
			const range = document.createRange();
			range.selectNodeContents(ta);
			const sel = window.getSelection();
			sel?.removeAllRanges();
			sel?.addRange(range);
		}
		ta.select();
		ta.setSelectionRange(0, text.length);

		const ok = document.execCommand('copy');
		document.body.removeChild(ta);
		return ok;
	} catch {
		return false;
	}
}

/** Copy `text` to the clipboard. Resolves true on success. */
export async function copyText(text: string): Promise<boolean> {
	if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch {
			// fall through to legacy
		}
	}
	return legacyCopy(text);
}
