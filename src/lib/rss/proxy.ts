/* =============================================================================
 * RSS PROXY — the `rss_proxy_config` URL (`protocol://[user[:pass]@]host:port`)
 * split into editable form fields and put back together, plus its validators.
 * ========================================================================== */

export const PROXY_PROTOCOLS = ['http', 'socks5', 'socks4'] as const;
export type ProxyProtocol = (typeof PROXY_PROTOCOLS)[number];
/** The radio group's value: the three protocols plus the "no proxy" choice. */
export type ProxySelection = 'disabled' | ProxyProtocol;

export const PROXY_LABELS: Record<ProxyProtocol, string> = {
	http: 'HTTP',
	socks5: 'SOCKS5',
	socks4: 'SOCKS4'
};

export interface ProxyDraft {
	protocol: ProxySelection;
	host: string;
	/** Kept as text so a half-typed port doesn't fight the input. */
	port: string;
	username: string;
	password: string;
}

export interface ProxyErrors {
	host: string | null;
	port: string | null;
	username: string | null;
	password: string | null;
}

export function emptyProxyDraft(): ProxyDraft {
	return { protocol: 'disabled', host: '', port: '', username: '', password: '' };
}

const safeDecode = (value: string) => {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
};

/** Split a stored config into form fields. Anything unparseable falls back to "no proxy". */
export function parseProxyConfig(config: string | null): ProxyDraft {
	const draft = emptyProxyDraft();
	if (!config) return draft;

	let url: URL;
	try {
		url = new URL(config);
	} catch {
		return draft;
	}
	const protocol = PROXY_PROTOCOLS.find((p) => p === url.protocol.replace(/:$/, '').toLowerCase());
	if (!protocol) return draft;

	draft.protocol = protocol;
	// IPv6 hosts keep their brackets so they round-trip through `composeProxyConfig` unchanged.
	draft.host = url.hostname;
	draft.port = url.port;
	draft.username = safeDecode(url.username);
	draft.password = safeDecode(url.password);
	return draft;
}

/** Build the config URL, or null when there's no proxy to describe. */
export function composeProxyConfig(draft: ProxyDraft): string | null {
	if (draft.protocol === 'disabled') return null;
	const host = draft.host.trim();
	const port = draft.port.trim();
	if (!host || !port) return null;

	const username = draft.username.trim();
	const { password } = draft;
	const credentials =
		username || password
			? `${encodeURIComponent(username)}${password ? `:${encodeURIComponent(password)}` : ''}@`
			: '';
	return `${draft.protocol}://${credentials}${host}:${port}`;
}

export function proxyErrors(draft: ProxyDraft): ProxyErrors {
	const errors: ProxyErrors = { host: null, port: null, username: null, password: null };
	if (draft.protocol === 'disabled') return errors;

	const host = draft.host.trim();
	if (!host) errors.host = 'Required.';
	else if (/[\s/@]/.test(host) || (host.includes(':') && !host.startsWith('[')))
		errors.host = 'Enter the host or IP only — no scheme, port or credentials.';

	const port = draft.port.trim();
	if (!port) errors.port = 'Required.';
	else if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)
		errors.port = 'Enter a port between 1 and 65535.';

	const username = draft.username.trim();
	if (draft.password && !username) errors.username = 'Required when a password is set.';
	// SOCKS4 authenticates on a user id alone; the others need the pair.
	else if (username && !draft.password && draft.protocol !== 'socks4')
		errors.password = 'Required when a username is set.';

	return errors;
}

export const hasProxyError = (errors: ProxyErrors): boolean =>
	Object.values(errors).some((e) => e !== null);
