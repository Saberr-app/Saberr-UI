/* =============================================================================
 * SABERR SERVICE → PAGE INDICATOR MAPPING
 * -----------------------------------------------------------------------------
 * Maps backend service health onto sidebar indicators. Rules:
 *   - Auth Issue            -> red
 *   - qbit Down / Not Configured -> red (qbit is uniquely strict)
 *   - any other unhealthy level  -> orange
 *   - healthy                -> no indicator
 * Each service maps to the settings subpage that owns its config; the Settings
 * main item shows the most severe indicator across all services.
 * ========================================================================== */

import type { ServiceCode, ServiceStatus } from '$lib/api/types';

export type Severity = 'red' | 'orange';

/** Which settings subpage each service's indicator lives on. */
export const SERVICE_PAGE: Record<ServiceCode, string> = {
	qbit: '/settings/qbit',
	anilist: '/settings/anilist',
	tvdb: '/settings/processing',
	rss: '/settings/rss',
	notifications_discord_webhook: '/settings/discord'
};

/** The Discord webhook service(s) — an unconfigured one gets no sidebar dot. */
const DISCORD_SERVICES: ServiceCode[] = ['notifications_discord_webhook'];

/** Severity for a single service's SIDEBAR DOT, or null when no dot should show. */
export function severityFor(code: ServiceCode, svc: ServiceStatus | undefined): Severity | null {
	if (!svc || svc.healthy) return null;
	// An unconfigured Discord webhook is expected/optional — no menu indicator.
	if (DISCORD_SERVICES.includes(code) && svc.error_level === 'Not Configured') return null;
	if (svc.error_level === 'Auth Issue') return 'red';
	if (code === 'qbit' && (svc.error_level === 'Down' || svc.error_level === 'Not Configured')) {
		return 'red';
	}
	return 'orange';
}

/** Tone for the settings-page status box — always returns a tone (green=healthy), never suppresses. */
export function statusTone(code: ServiceCode, svc: ServiceStatus | undefined): 'green' | Severity {
	if (!svc || svc.healthy) return 'green';
	if (svc.error_level === 'Auth Issue') return 'red';
	if (code === 'qbit' && (svc.error_level === 'Down' || svc.error_level === 'Not Configured')) {
		return 'red';
	}
	return 'orange';
}

/** The more severe of two (red beats orange beats none). */
export function worse(a: Severity | null, b: Severity | null): Severity | null {
	if (a === 'red' || b === 'red') return 'red';
	if (a === 'orange' || b === 'orange') return 'orange';
	return null;
}

type ServicesMap = Partial<Record<ServiceCode, ServiceStatus>>;

/** Most severe indicator among all services that map to `href`. */
export function severityForPage(services: ServicesMap | undefined, href: string): Severity | null {
	if (!services) return null;
	let result: Severity | null = null;
	for (const code of Object.keys(services) as ServiceCode[]) {
		if (SERVICE_PAGE[code] !== href) continue;
		result = worse(result, severityFor(code, services[code]));
	}
	return result;
}

/** Most severe indicator across every service (for the Settings main item). */
export function severityOverall(services: ServicesMap | undefined): Severity | null {
	if (!services) return null;
	let result: Severity | null = null;
	for (const code of Object.keys(services) as ServiceCode[]) {
		result = worse(result, severityFor(code, services[code]));
	}
	return result;
}
