/* =============================================================================
 * SABERR RSS — PROFILE SHORTCOMINGS — `ReleaseCriteriaProperty` → chip text. `version` is
 * never surfaced here (filtered out).
 * ========================================================================== */

import type { ReleaseCriteriaProperty } from '$lib/api/types';

const LABELS: Record<ReleaseCriteriaProperty, string> = {
	version: 'Version mismatch',
	release_group: 'Release group not preferred',
	resolution: 'Resolution not preferred',
	source: 'Source not preferred',
	encoding: 'Encoding not preferred',
	language_code: 'Language not preferred'
};

export function shortcomingLabels(props: ReleaseCriteriaProperty[]): string[] {
	return props.filter((p) => p !== 'version').map((p) => LABELS[p]);
}
