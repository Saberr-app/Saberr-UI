/* =============================================================================
 * SABERR EVENT STREAM (SSE transport)
 * -----------------------------------------------------------------------------
 * Reusable fetch-based EventSource replacement for the backend's sparse status
 * streams (`/status/stream`, `/torrents/pull-status/stream`, …). Native
 * `EventSource` can't send `Authorization: Bearer`, so we read the
 * `text/event-stream` response body ourselves.
 *
 * Contract it expects: each event is one JSON object on a `data:` line; `ref` is
 * a monotonic integer (per connection) that's always
 * present; every other field appears only when it changed. The backend yields an
 * event every `freq` seconds (a bare `{ref}` heartbeat when nothing changed).
 *
 * Reliability, owned here so consumers only supply apply/resync logic:
 *   - `ref` gap (a missed event) -> `onResync()` (socket stays).
 *   - Watchdog: no frame within 3×freq -> presume the socket dead -> tear down +
 *     `onResync()` + reconnect. Survives backend downtime.
 *   - Unexpected loss while the server was reachable (it closed the stream / a BE
 *     exception / a non-gateway error): a 5s cooldown, then `onResync()` (reconcile
 *     via the non-stream API), then reconnect — so a server that keeps closing the
 *     stream doesn't get hammered with 1/sec reconnects.
 *   - Couldn't reach the server (fetch rejected, or a 502/503/504 gateway error):
 *     `onConnectError()` + a 5s reconnect (no resync — nothing's up to reconcile).
 *   - Connection established: `onConnect()`.
 *   - Hidden tab: keep the socket alive (anti-thrash) but go quiet — drain frames
 *     without side effects, then a single `onResync()` once visible again.
 *   - 401 -> `onAuthFail()` (default: redirect to /login).
 *
 * The consumer seeds its own initial data and calls `onResync()`-worthy refetches;
 * this class never fetches anything but the stream itself.
 *
 * Invariant: **one live socket at a time**, enforced by `epoch` (see `connect`). Two
 * sockets interleaving their `ref`s would read as a perpetual gap → `onResync` per frame.
 * ========================================================================== */

import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { apiUrl } from '$lib/config/api';
import { getToken } from '$lib/stores/auth';

/** Fixed cooldown before any reconnect/recover (anti-spam on a flapping server). */
const RECONNECT_COOLDOWN_MS = 5000;
/** Gateway statuses = the backend is unreachable behind a proxy → a connection failure. */
const GATEWAY_ERRORS = new Set([502, 503, 504]);

export interface EventStreamOptions<T extends { ref: number }> {
	/** Stream path WITHOUT query (e.g. `/api/v1/status/stream`). */
	path: string;
	/** Tick frequency (seconds); sent as `?freq=` and drives the 3×freq watchdog. */
	freq: number;
	/** Apply one tick's fields. Called only while visible (hidden ticks are deferred). */
	onMessage: (body: T) => void;
	/** Authoritative refetch — used on `ref` gap, watchdog, and visible recovery. */
	onResync: () => void | Promise<void>;
	/** Stream returned 401 (unusable session). Default: redirect to /login. */
	onAuthFail?: () => void;
	/** A stream connection was successfully established (use to clear a "lost" state). */
	onConnect?: () => void;
	/** Couldn't reach the server (fetch rejected, or a 502/503/504 gateway error). */
	onConnectError?: () => void;
	/**
	 * Extra query params, recomputed on every (re)connect — so a `restart()` after the
	 * watched set changes sends the new params (e.g. repeated `download_ids`). Arrays
	 * become repeated params. (We can't use a GET *body* — fetch forbids it.)
	 */
	query?: () => Record<string, string | number | Array<string | number>>;
}

export class EventStream<T extends { ref: number }> {
	private active = false;
	/** True while the socket is established and being read. */
	private connected = false;
	/** A tick arrived while hidden (side effects deferred) -> resync on visible. */
	private hiddenDirty = false;
	private controller: AbortController | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
	private watchdogTimer: ReturnType<typeof setTimeout> | undefined;
	/** Last `ref` on the current connection; null = awaiting the baseline. */
	private lastRef: number | null = null;
	/** Bumped each (re)connect; a loop/callback acts only while its captured epoch matches. */
	private epoch = 0;

	private readonly watchdogMs: number;

	constructor(private readonly opts: EventStreamOptions<T>) {
		this.watchdogMs = opts.freq * 3 * 1000;
	}

	/** Build the stream URL fresh each connect: `?freq=` plus any `query()` params. */
	private buildUrl(): string {
		const qs = new URLSearchParams();
		qs.set('freq', String(this.opts.freq));
		const extra = this.opts.query?.();
		if (extra) {
			for (const [k, v] of Object.entries(extra)) {
				if (Array.isArray(v)) for (const item of v) qs.append(k, String(item));
				else qs.set(k, String(v));
			}
		}
		return `${this.opts.path}?${qs}`;
	}

	/**
	 * Drop the current socket and immediately reconnect with freshly-computed `query()`
	 * params. Used when the watched set grows (the old connection is unmonitoring the
	 * new ids). No resync — a new socket starts a fresh `ref` baseline and the next
	 * ticks repopulate.
	 */
	restart(): void {
		if (!this.active || !browser) return;
		void this.connect(); // supersedes the current socket (epoch)
	}

	/** Open the stream. The consumer should seed its initial data separately. */
	start(): void {
		if (!browser || this.active) return;
		this.active = true;
		document.addEventListener('visibilitychange', this.onVisibility);
		void this.connect();
	}

	stop(): void {
		this.active = false;
		this.epoch++; // invalidate any in-flight loop
		this.connected = false;
		this.hiddenDirty = false;
		if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
		this.watchdogTimer = undefined;
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
		this.reconnectTimer = undefined;
		this.controller?.abort();
		this.controller = null;
		this.lastRef = null;
		if (browser) document.removeEventListener('visibilitychange', this.onVisibility);
	}

	private onVisibility = () => {
		if (!this.active) return;
		if (document.hidden) {
			// Keep the socket alive but suspend the watchdog, so a socket death while
			// hidden doesn't trigger a background resync. We heal on visible.
			if (this.watchdogTimer) {
				clearTimeout(this.watchdogTimer);
				this.watchdogTimer = undefined;
			}
			return;
		}
		// Became visible. A socket that died while hidden gets a full resync +
		// reconnect; a still-live one resumes its watchdog and resyncs once if any
		// ticks streamed past while hidden (their side effects were deferred).
		if (this.connected) {
			this.armWatchdog();
			if (this.hiddenDirty) void this.opts.onResync();
		} else {
			void this.recover();
		}
		this.hiddenDirty = false;
	};

	/** Open the stream and pump events until it closes, errors, or we stop. */
	private async connect(): Promise<void> {
		if (!this.active || !browser) return;

		// Supersede any prior/concurrent connection: new epoch, kill old socket, drop
		// pending reconnect. Every await below bails once `myEpoch !== this.epoch`.
		const myEpoch = ++this.epoch;
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = undefined;
		}
		this.controller?.abort();

		// A new socket = a new `ref` sequence; adopt the first event as baseline.
		this.lastRef = null;
		this.connected = false;
		const controller = new AbortController();
		this.controller = controller;

		// 1) Establish the connection. A rejected fetch or a gateway error means the
		//    server is unreachable → a connection failure (no point reconciling).
		let res: Response;
		try {
			const token = getToken();
			res = await fetch(apiUrl(this.buildUrl()), {
				headers: {
					Accept: 'text/event-stream',
					...(token ? { Authorization: `Bearer ${token}` } : {})
				},
				signal: controller.signal
			});
		} catch {
			if (myEpoch !== this.epoch || controller.signal.aborted) return;
			this.connected = false;
			this.opts.onConnectError?.();
			this.scheduleReconnect();
			return;
		}

		if (myEpoch !== this.epoch) return;
		if (res.status === 401) return this.onAuthFail();
		if (!res.ok || !res.body) {
			if (GATEWAY_ERRORS.has(res.status)) {
				this.opts.onConnectError?.(); // proxy can't reach the backend = unreachable
				this.scheduleReconnect();
			} else {
				this.scheduleRecover(); // reachable but the stream endpoint errored
			}
			return;
		}

		// 2) Connected — pump frames until the server closes the stream or it errors.
		this.connected = true;
		this.opts.onConnect?.();
		this.armWatchdog();
		try {
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buf = '';
			while (this.active && myEpoch === this.epoch) {
				const { value, done } = await reader.read();
				if (done) break; // server closed the stream
				if (myEpoch !== this.epoch) return;
				buf += decoder.decode(value, { stream: true });
				buf = buf.replace(/\r\n/g, '\n'); // normalize CRLF SSE framing
				let sep: number;
				while ((sep = buf.indexOf('\n\n')) !== -1) {
					const frame = buf.slice(0, sep);
					buf = buf.slice(sep + 2);
					this.armWatchdog(); // any frame (incl. heartbeats) proves liveness
					this.handleFrame(frame);
				}
			}
		} catch {
			if (myEpoch !== this.epoch || controller.signal.aborted) return;
			this.connected = false;
			this.scheduleRecover(); // mid-stream error after a good connection
			return;
		}
		// Reader ended (server closed the stream).
		if (myEpoch !== this.epoch) return;
		this.connected = false;
		if (this.active) this.scheduleRecover();
	}

	/** Parse a single SSE frame's `data:` lines and dispatch the tick. */
	private handleFrame(frame: string): void {
		const data = frame
			.split('\n')
			.filter((l) => l.startsWith('data:'))
			.map((l) => l.replace(/^data:\s?/, '')) // SSE strips one optional leading space
			.join('\n');
		if (!data) return; // comment/heartbeat line (e.g. `: ping`)
		let body: T;
		try {
			body = JSON.parse(data) as T;
		} catch {
			return; // ignore a malformed frame; the next tick (or watchdog) recovers
		}
		this.dispatch(body);
	}

	/** Handle `ref` continuity + hidden deferral, then hand fields to the consumer. */
	private dispatch(body: T): void {
		const gap = this.lastRef !== null && body.ref !== this.lastRef + 1;
		this.lastRef = body.ref;

		// While hidden, keep ONLY the socket alive: drain the frame (so it stays
		// healthy and `ref` stays coherent) but defer every side effect — fields and
		// gap resync — to a single resync once visible again.
		if (document.hidden) {
			this.hiddenDirty = true;
			return;
		}
		// Gap: missed events in transit -> resync (the socket itself is still healthy).
		if (gap) void this.opts.onResync();
		this.opts.onMessage(body);
	}

	/** Cooldown then a plain reconnect (no resync) — server was unreachable. */
	private scheduleReconnect(): void {
		// While hidden we leave a dead socket alone; the visibility handler reconnects.
		if (!this.active || document.hidden) return;
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
		this.reconnectTimer = setTimeout(() => void this.connect(), RECONNECT_COOLDOWN_MS);
	}

	/** Cooldown then resync-before-reconnect — the server was reachable but the stream
	 *  dropped (server-side close / BE exception); reconcile before re-opening. */
	private scheduleRecover(): void {
		if (!this.active || document.hidden) return;
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
		this.reconnectTimer = setTimeout(() => void this.recover(), RECONNECT_COOLDOWN_MS);
	}

	/** Full resync then a fresh socket — watchdog + visible-after-death. */
	private async recover(): Promise<void> {
		if (!this.active) return;
		await this.opts.onResync();
		if (!this.active) return; // stopped mid-resync
		void this.connect();
	}

	/** (Re)arm the dead-socket watchdog. No-op while hidden (suspended). */
	private armWatchdog(): void {
		if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
		if (!this.active || document.hidden) return;
		this.watchdogTimer = setTimeout(() => this.onWatchdog(), this.watchdogMs);
	}

	/** No frame within 3×freq -> the socket is presumed dead; tear down + recover. */
	private onWatchdog(): void {
		this.watchdogTimer = undefined;
		if (!this.active) return;
		this.connected = false;
		this.controller?.abort(); // unblock a silently-stuck reader
		void this.recover();
	}

	private onAuthFail(): void {
		this.connected = false;
		if (this.opts.onAuthFail) this.opts.onAuthFail();
		else if (browser) void goto('/login');
	}
}
