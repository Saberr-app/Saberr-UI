/* Render release notes to safe HTML for `{@html}`: `marked` parses, `cleanChildren` sanitizes
 * via the tag allow-list. ⚠️ `breaks: true` is load-bearing — GitHub renders a soft newline as
 * `<br>`; without it release notes collapse to run-on lines. */

import { marked } from 'marked';

const ALLOWED = new Set([
	'BR',
	'P',
	'A',
	'B',
	'STRONG',
	'I',
	'EM',
	'DEL',
	'CODE',
	'PRE',
	'UL',
	'OL',
	'LI',
	'BLOCKQUOTE',
	'HR',
	'IMG',
	'H1',
	'H2',
	'H3',
	'H4',
	'H5',
	'H6'
]);

const escapeText = (s: string): string =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeAttr = (s: string): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

const isHttp = (url: string): boolean => /^https?:\/\//i.test(url);

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
		} else if (tag === 'HR') {
			html += '<hr>';
		} else if (tag === 'IMG') {
			const src = el.getAttribute('src') ?? '';
			if (isHttp(src)) {
				const alt = escapeAttr(el.getAttribute('alt') ?? '');
				html += `<img src="${escapeAttr(src)}" alt="${alt}" loading="lazy">`;
			}
		} else if (tag === 'A') {
			const href = el.getAttribute('href') ?? '';
			const inner = cleanChildren(el);
			html += isHttp(href)
				? `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
				: inner;
		} else {
			const name = tag.toLowerCase();
			html += `<${name}>${cleanChildren(el)}</${name}>`;
		}
	});
	return html;
}

/** Render markdown into a safe HTML subset for `{@html}`. */
export function renderMarkdown(raw: string | null | undefined): string {
	if (!raw) return '';
	const html = marked.parse(raw, { async: false, gfm: true, breaks: true });
	if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '');
	const doc = new DOMParser().parseFromString(html, 'text/html');
	return cleanChildren(doc.body).trim();
}
