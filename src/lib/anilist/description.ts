/* =============================================================================
 * SABERR ANIME DESCRIPTION SANITIZER — AniList descriptions carry light HTML; we re-emit a
 * fixed allow-list of tags (keeping inner text) so the output is safe for `{@html}`.
 * ========================================================================== */

const ALLOWED = new Set(['BR', 'I', 'B', 'STRONG', 'EM', 'P', 'A']);

const escapeText = (s: string): string =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeAttr = (s: string): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function cleanChildren(parent: Node): string {
	let html = '';
	parent.childNodes.forEach((node) => {
		if (node.nodeType === Node.TEXT_NODE) {
			html += escapeText(node.textContent ?? '');
			return;
		}
		if (node.nodeType !== Node.ELEMENT_NODE) return;

		const el = node as Element;
		const tag = el.tagName;
		if (!ALLOWED.has(tag)) {
			// Unknown tag: drop it but keep its inner content.
			html += cleanChildren(el);
			return;
		}
		if (tag === 'BR') {
			html += '<br>';
		} else if (tag === 'A') {
			const href = el.getAttribute('href') ?? '';
			const safe = /^https?:\/\//i.test(href) ? href : '';
			const inner = cleanChildren(el);
			html += safe
				? `<a href="${escapeAttr(safe)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
				: inner;
		} else {
			const name = tag.toLowerCase();
			html += `<${name}>${cleanChildren(el)}</${name}>`;
		}
	});
	return html;
}

/** Sanitize an AniList description into a safe HTML subset for `{@html}`. */
export function safeDescriptionHtml(raw: string | null | undefined): string {
	if (!raw) return '';
	if (typeof document === 'undefined') return raw.replace(/<[^>]*>/g, '');
	const doc = new DOMParser().parseFromString(raw, 'text/html');
	return cleanChildren(doc.body).trim();
}

/** Plain-text description (tags stripped, entities decoded) for clamped card use. */
export function descriptionText(raw: string | null | undefined): string {
	if (!raw) return '';
	if (typeof document === 'undefined') {
		return raw
			.replace(/<[^>]*>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	}
	const doc = new DOMParser().parseFromString(raw, 'text/html');
	return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}
