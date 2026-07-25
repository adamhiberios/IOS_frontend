import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { type Socket, io } from 'socket.io-client';

import { AuthStore } from '@core/auth';
import { environment } from '@env/environment';

import { MockStore } from './mock.store';

/**
 * `MockSessionWs` — the practice-exam timer channel (Socket.IO namespace `/mock`,
 * `IOS_Backend/src/modules/mock-exam/mock-exam.gateway.ts`). Mirrors the exam WS
 * (`features/assessments/…/exam-session.ws.ts`) but the mock timer is **soft /
 * non-terminal**: at zero the server emits `time_up` and stops ticking — it never
 * auto-submits — and `POST …/extend` restarts the countdown.
 *
 * Server → store: `timer_tick` / `warning` → `MockStore.applyRemaining(seconds)`;
 * `time_up` → `applyRemaining(0)` (sets the advisory `timeUp` flag). Root-provided;
 * the runner page drives `connect(attemptId)` / `disconnect()` on its lifecycle.
 */

export type MockWsConnection = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed';

interface TimerTickPayload {
  readonly attemptId: string;
  readonly remainingSeconds: number;
}
interface JoinAck {
  readonly joined: boolean;
  readonly remainingSeconds: number;
}

/** No server message for this long while "open" → force a reconnect (2+ tick windows). */
const STALE_TIMEOUT_MS = 70_000;
const WATCHDOG_INTERVAL_MS = 10_000;
const RECONNECT_DELAY_MS = 1_000;
const RECONNECT_DELAY_MAX_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class MockSessionWs {
  private readonly store = inject(MockStore);
  private readonly auth = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);

  private socket: Socket | null = null;
  private attemptId: string | null = null;
  private lastServerMessageAt = 0;

  private readonly _connection = signal<MockWsConnection>('idle');
  readonly connection = this._connection.asReadonly();
  readonly isConnected = computed(() => this._connection() === 'open');

  constructor() {
    interval(WATCHDOG_INTERVAL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.checkStaleness());
    this.destroyRef.onDestroy(() => this.teardown());
  }

  /** Open the channel for an attempt and join its room. Idempotent per attempt. */
  connect(attemptId: string): void {
    if (this.socket && this.attemptId === attemptId) return;
    this.teardown();
    this.attemptId = attemptId;
    this._connection.set('connecting');
    this.lastServerMessageAt = Date.now();

    const socket = io(`${environment.wsBaseUrl}/mock`, {
      transports: ['websocket', 'polling'],
      auth: (cb: (data: object) => void) => cb({ token: this.auth.accessToken() ?? '' }),
      reconnection: true,
      reconnectionDelay: RECONNECT_DELAY_MS,
      reconnectionDelayMax: RECONNECT_DELAY_MAX_MS,
    });

    socket.on('connect', () => this.onConnect());
    socket.on('disconnect', (reason: string) => this.onDisconnect(reason));
    socket.on('connect_error', () => this._connection.set('reconnecting'));
    socket.io.on('reconnect_attempt', () => this._connection.set('reconnecting'));

    socket.on('timer_tick', (p: TimerTickPayload) => this.onRemaining(p.remainingSeconds));
    socket.on('warning', (p: TimerTickPayload) => this.onRemaining(p.remainingSeconds));
    socket.on('time_up', () => this.onRemaining(0));

    this.socket = socket;
  }

  /** Close the channel (submit / route exit). */
  disconnect(): void {
    this.teardown();
    this._connection.set('closed');
  }

  private onConnect(): void {
    this._connection.set('open');
    this.touch();
    const attemptId = this.attemptId;
    if (!attemptId) return;
    // A reconnect yields a new socket.id → (re-)join the room every time.
    this.socket?.emit('join_session', { attemptId }, (ack: JoinAck | undefined) => {
      if (ack?.joined) this.onRemaining(ack.remainingSeconds);
    });
  }

  private onDisconnect(reason: string): void {
    if (reason === 'io client disconnect') return;
    this._connection.set('reconnecting');
  }

  private onRemaining(remainingSeconds: number): void {
    this.touch();
    this.store.applyRemaining(remainingSeconds);
  }

  private touch(): void {
    this.lastServerMessageAt = Date.now();
  }

  private checkStaleness(): void {
    if (!this.socket || this._connection() !== 'open') return;
    if (Date.now() - this.lastServerMessageAt <= STALE_TIMEOUT_MS) return;
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
    this.attemptId = null;
  }
}
