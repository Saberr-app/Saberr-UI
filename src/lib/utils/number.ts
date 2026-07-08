/* =============================================================================
 * SABERR NUMBER FORMATTING
 * ========================================================================== */

const trim = (s: string): string => s.replace(/\.0$/, '');

/**
 * Abbreviate a count: <1k plain, 1k–9.9k with 1 decimal ("9.5K"), 10k–999k as
 * whole K ("234K"), ≥1M with 1 decimal M ("1.2M").
 */
export function abbreviateCount(n: number | null | undefined): string {
	if (n == null) return '—';
	if (n < 1000) return String(n);
	if (n < 10_000) return `${trim((n / 1000).toFixed(1))}K`;
	if (n < 1_000_000) return `${Math.round(n / 1000)}K`;
	return `${trim((n / 1_000_000).toFixed(1))}M`;
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

/** Human-readable byte size (binary, 1024-based): `formatBytes(1536)` → "1.5 KB". */
export function formatBytes(bytes: number | null | undefined): string {
	if (bytes == null) return '—';
	if (bytes < 1024) return `${bytes} B`;
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${trim(value.toFixed(1))} ${BYTE_UNITS[unit]}`;
}
