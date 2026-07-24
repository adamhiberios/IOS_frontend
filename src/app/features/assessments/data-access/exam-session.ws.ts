import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { type Socket, io } from 'socket.io-client';

import { AuthStore } from '@core/auth';
import { environment } from '@env/environment';

import { ExamSessionStore } from './exam-session.store';

/**
 * `ExamSessionWs` — the live exam channel. **Route-scoped** (provided at
 * `/run/:sessionId` alongside `ExamSessionStore`; torn down on route exit).
 *
 * Read `/docs/08-exam-engine.md` §6 before touching this. Note the spec is
 * aspirational — the live backend (`IOS_Backend/src/modules/exam/exam.gateway.ts`)
 * is **Socket.IO**, not a raw WebSocket, so this reconciles as follows:
 *
 *  • Transport: Socket.IO namespace `/exam` on `environment.wsBaseUrl`, handshake
 *    `auth: { token }`. There is NO app-level ping/pong — engine.io runs its own
 *    heartbeat; Socket.IO's built-in reconnection replaces the spec's manual retry.
 *  • Server → client: `timer_tick { remainingSeconds }` (~30 s), `warning
 *    { remainingSeconds, threshold }` (600 s, 300 s), `session_expired`.
 *  • Client → server: `join_session { sessionId }` (ack `{ joined,
 *    remainingSeconds }`), re-emitted on every (re)connect since a reconnect is a
 *    new socket that must re-join its room.
 *  • Spec's "two missed pongs > 70 s → reconnect" maps to a **staleness watchdog**:
 *    no server message for > 70 s → force a reconnect (the tick cadence is 30 s,
 *    so > 2 windows of silence means the channel is dead even if the transport
 *    still looks up).
 *
 * It drives the timer by pushing authoritative readings into `ExamSessionStore`
 * (`applyServerTick` / `markExpired`) and exposes `serverTick` (with a receipt
 * timestamp for smooth local interpolation), `connection`, and `lastWarning` for
 * the runner's timer, connection indicator, and a11y announcer (Slice 5).
 */

/** Socket lifecycle as surfaced to the connection indicator. */
export type WsConnection = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed';

/** Last authoritative tick + the wall-clock time it arrived (interpolation anchor). */
export interface ServerTick {
  readonly remainingSeconds: number;
  /** `Date.now()` at receipt — the timer interpolates down from here between ticks. */
  readonly receivedAt: number;
}

/** A `warning` threshold crossing (10-minute / 5-minute marks) for a11y announcements. */
export interface ExamWarning {
  readonly remainingSeconds: number;
  readonly threshold: number;
}

// ── Wire payloads (verbatim from exam.gateway.ts) ────────────────────────────
interface TimerTickPayload {
  readonly sessionId: string;
  readonly remainingSeconds: number;
}
interface WarningPayload {
  readonly sessionId: string;
  readonly remainingSeconds: number;
  readonly threshold: number;
}
interface JoinAck {
  readonly joined: boolean;
  readonly remainingSeconds: number;
}

/** No server message for this long → force a reconnect (> two 30 s tick windows). */
const STALE_TIMEOUT_MS = 70_000;
/** How often the staleness watchdog checks. */
const WATCHDOG_INTERVAL_MS = 10_000;
/** Socket.IO reconnection backoff bounds (spec §6.2: exponential, capped at 30 s). */
const RECONNECT_DELAY_MS = 1_000;
const RECONNECT_DELAY_MAX_MS = 30_000;

@Injectable()
export class ExamSessionWs {
  private readonly store = inject(ExamSessionStore);
  private readonly auth = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);

  private socket: Socket | null = null;
  private sessionId: string | null = null;
  private lastServerMessageAt = 0;

  private readonly _connection = signal<WsConnection>('idle');
  private readonly _serverTick = signal<ServerTick | null>(null);
  private readonly _lastWarning = signal<ExamWarning | null>(null);

  readonly connection = this._connection.asReadonly();
  readonly serverTick = this._serverTick.asReadonly();
  readonly lastWarning = this._lastWarning.asReadonly();
  readonly isConnected = computed(() => this._connection() === 'open');

  constructor() {
    // Watchdog: while the socket believes it is up but no message has arrived in
    // > 70 s, the channel is stale — cycle the connection to force a fresh join.
    interval(WATCHDOG_INTERVAL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.checkStaleness());

    this.destroyRef.onDestroy(() => this.teardown());
  }

  /** Open the channel for a session and join its room. Idempotent per session. */
  connect(sessionId: string): void {
    if (this.socket && this.sessionId === sessionId) return;
    this.teardown();
    this.sessionId = sessionId;
    this._connection.set('connecting');
    this.lastServerMessageAt = Date.now();

    const socket = io(`${environment.wsBaseUrl}/exam`, {
      transports: ['websocket', 'polling'],
      // Function form so the CURRENT (possibly rotated) access token is sent on
      // every (re)connect. Token lives in memory only — never logged.
      auth: (cb: (data: object) => void) => cb({ token: this.auth.accessToken() ?? '' }),
      reconnection: true,
      reconnectionDelay: RECONNECT_DELAY_MS,
      reconnectionDelayMax: RECONNECT_DELAY_MAX_MS,
      // Infinite attempts (Socket.IO default) — the route lifetime is the cap.
    });

    socket.on('connect', () => this.onConnect());
    socket.on('disconnect', (reason: string) => this.onDisconnect(reason));
    socket.on('connect_error', () => this._connection.set('reconnecting'));
    socket.io.on('reconnect_attempt', () => this._connection.set('reconnecting'));

    socket.on('timer_tick', (p: TimerTickPayload) => this.onTick(p));
    socket.on('warning', (p: WarningPayload) => this.onWarning(p));
    socket.on('session_expired', () => this.onExpired());

    this.socket = socket;
  }

  /** Close the channel (route exit / submit). */
  disconnect(): void {
    this.teardown();
    this._connection.set('closed');
  }

  // ── Socket handlers ────────────────────────────────────────────────────────

  private onConnect(): void {
    this._connection.set('open');
    this.touch();
    // A reconnect yields a new socket.id, so (re-)join the session room every time.
    const sessionId = this.sessionId;
    if (!sessionId) return;
    this.socket?.emit('join_session', { sessionId }, (ack: JoinAck | undefined) => {
      if (ack?.joined) this.applyTick(ack.remainingSeconds);
    });
  }

  private onDisconnect(reason: string): void {
    // 'io client disconnect' is our own teardown() — leave the state as set.
    if (reason === 'io client disconnect') return;
    this._connection.set('reconnecting');
  }

  private onTick(payload: TimerTickPayload): void {
    this.touch();
    this.applyTick(payload.remainingSeconds);
  }

  private onWarning(payload: WarningPayload): void {
    this.touch();
    this._lastWarning.set({
      remainingSeconds: payload.remainingSeconds,
      threshold: payload.threshold,
    });
    this.store.applyServerTick(payload.remainingSeconds);
  }

  private onExpired(): void {
    this.touch();
    this.store.applyServerTick(0);
    this.store.markExpired();
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private applyTick(remainingSeconds: number): void {
    this._serverTick.set({ remainingSeconds, receivedAt: Date.now() });
    this.store.applyServerTick(remainingSeconds);
  }

  private touch(): void {
    this.lastServerMessageAt = Date.now();
  }

  private checkStaleness(): void {
    if (!this.socket || this._connection() !== 'open') return;
    if (Date.now() - this.lastServerMessageAt <= STALE_TIMEOUT_MS) return;
    // Stale despite an "open" transport — force a reconnect + re-join.
    this._connection.set('reconnecting');
    this.lastServerMessageAt = Date.now();
    this.socket.disconnect().connect();
  }

  private teardown(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
