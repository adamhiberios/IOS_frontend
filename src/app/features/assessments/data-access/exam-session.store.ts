import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, firstValueFrom, fromEvent, merge } from 'rxjs';

import { problemDetailMessage } from '@core/http';

import { ExamApi } from './exam.api';
import { EXAM_DRAFT_STORE } from './exam-draft.store';
import {
  type AnswerOp,
  type AnswerValue,
  type ExamQuestion,
  type ExamScoreResult,
  type ExamSessionStart,
  type SessionStatus,
  type SyncStatus,
} from './exam.model';

/** Debounce window before a burst of answer changes is flushed to the server. */
const FLUSH_DEBOUNCE_MS = 1_000;

/** Extra context the runner carries from the ready page into a fresh start. */
export interface StartContext {
  readonly examTitle?: string;
  readonly certId?: string;
  readonly examId?: string;
}

/**
 * `ExamSessionStore` — the single writer of exam-session state and the sole
 * orchestrator of the answer sync queue. **Route-scoped** (provided in the
 * `/run/:sessionId` route, Slice 5); Angular destroys it — and its
 * subscriptions/timers — on route exit. Read `/docs/08-exam-engine.md` and the
 * reconciliation note in `exam.model.ts` before changing anything here (highest-
 * stakes surface, CLAUDE §10 — architect review required before the runner ships).
 *
 * ── How it maps to the live backend (differs from spec §5) ───────────────────
 *  • Answers sync as ONE bulk `POST …/autosave` of the whole answers map
 *    (last-write-wins), debounced ~1 s — not a per-answer op stream.
 *  • `clientSeq` never leaves the browser; it orders/dedupes IndexedDB draft
 *    rows and is a pure per-session monotonic counter (no clock, so no §9 skew).
 *  • Reload-resume reads the question snapshot from IndexedDB (BE-I-23) because
 *    `GET /exam/sessions/:id` returns no questions; the server call refreshes the
 *    authoritative answer baseline + remaining time when online.
 *  • The live countdown feed (`applyServerTick`) is driven by the Socket.IO WS in
 *    Slice 4; this store just holds the last authoritative `remainingSeconds`.
 */
@Injectable()
export class ExamSessionStore {
  private readonly api = inject(ExamApi);
  private readonly draftDb = inject(EXAM_DRAFT_STORE);
  private readonly destroyRef = inject(DestroyRef);

  // ── State (private writers) ────────────────────────────────────────────────
  private readonly _sessionId = signal<string | null>(null);
  private readonly _certId = signal<string | null>(null);
  private readonly _examTitle = signal<string | null>(null);
  private readonly _questions = signal<readonly ExamQuestion[]>([]);
  private readonly _answers = signal<Record<string, AnswerValue>>({});
  private readonly _pendingOps = signal<readonly AnswerOp[]>([]);
  private readonly _sessionStatus = signal<SessionStatus>('idle');
  private readonly _syncStatus = signal<SyncStatus>('idle');
  private readonly _remainingSeconds = signal<number>(0);
  private readonly _expiresAt = signal<string | null>(null);
  private readonly _score = signal<ExamScoreResult | null>(null);
  private readonly _error = signal<string | null>(null);
  /** True when a local IndexedDB write failed — answers still go to the server. */
  private readonly _draftError = signal<boolean>(false);

  // ── Readonly views ─────────────────────────────────────────────────────────
  readonly sessionId = this._sessionId.asReadonly();
  readonly certId = this._certId.asReadonly();
  readonly examTitle = this._examTitle.asReadonly();
  readonly questions = this._questions.asReadonly();
  readonly answers = this._answers.asReadonly();
  readonly sessionStatus = this._sessionStatus.asReadonly();
  readonly syncStatus = this._syncStatus.asReadonly();
  readonly remainingSeconds = this._remainingSeconds.asReadonly();
  readonly expiresAt = this._expiresAt.asReadonly();
  readonly score = this._score.asReadonly();
  readonly error = this._error.asReadonly();
  readonly draftError = this._draftError.asReadonly();

  // ── Derived ────────────────────────────────────────────────────────────────
  readonly answeredCount = computed(() => Object.keys(this._answers()).length);
  readonly hasPending = computed(() => this._pendingOps().length > 0);
  readonly progress = computed(() => {
    const total = this._questions().length;
    const answered = this.answeredCount();
    return { answered, total, pct: total === 0 ? 0 : Math.round((answered / total) * 100) };
  });

  /**
   * Submit is allowed only when the session is live/being reviewed, the queue is
   * drained, and the last flush is confirmed synced (spec §4). The submit payload
   * is self-complete (the whole answers map), but this gate guarantees the server
   * already holds the latest answers before the student commits.
   */
  readonly canSubmit = computed(
    () =>
      (this._sessionStatus() === 'in-exam' || this._sessionStatus() === 'reviewing') &&
      !this.hasPending() &&
      this._syncStatus() === 'synced',
  );

  // ── Internals ──────────────────────────────────────────────────────────────
  /** Pure per-session monotonic answer counter (frontend-only; see model). */
  private seq = 0;
  private readonly flushTrigger = new Subject<void>();

  constructor() {
    // Debounced flush on answer bursts; immediate flush when the tab comes back
    // online (so a reconnect drains the queue — spec §8 step 4).
    const online$ =
      typeof window === 'undefined' ? new Subject<Event>() : fromEvent(window, 'online');
    merge(this.flushTrigger.pipe(debounceTime(FLUSH_DEBOUNCE_MS)), online$)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.flushQueue());
  }

  // ── Lifecycle: fresh start vs. reload-resume ───────────────────────────────

  /**
   * Seed the store from a fresh `POST /start` result (carried in via router nav
   * state) and persist the session snapshot for reload survival.
   */
  async hydrateFromStart(start: ExamSessionStart, ctx: StartContext = {}): Promise<void> {
    this.resetState();
    this._sessionId.set(start.sessionId);
    this._certId.set(ctx.certId ?? null);
    this._examTitle.set(ctx.examTitle ?? null);
    this._questions.set(start.questions);
    this._remainingSeconds.set(start.durationSeconds);
    this._expiresAt.set(start.expiresAt);
    this._sessionStatus.set('in-exam');
    this._syncStatus.set('synced');

    try {
      await this.draftDb.putSessionMeta({
        sessionId: start.sessionId,
        examId: ctx.examId,
        examTitle: ctx.examTitle,
        certId: ctx.certId,
        durationSeconds: start.durationSeconds,
        expiresAt: start.expiresAt,
        questions: start.questions,
      });
    } catch {
      // Non-fatal: the exam runs from memory; only reload-resume is at risk.
      this._draftError.set(true);
    }
  }

  /**
   * Rehydrate an existing session after a tab reload. Questions come from the
   * IndexedDB snapshot (the server does not return them); answers/time/status
   * come from the server when reachable, overlaid with local pending drafts.
   */
  async resume(sessionId: string): Promise<void> {
    this.resetState();
    this._sessionStatus.set('starting');
    this._sessionId.set(sessionId);

    // The three reads share no data dependency (only `sessionId`) — run them
    // concurrently so the two IndexedDB reads overlap the dominant network call.
    const [meta, server, pending] = await Promise.all([
      this.draftDb.loadSessionMeta(sessionId).catch(() => null),
      firstValueFrom(this.api.getSession(sessionId)).catch((err: unknown) => {
        // Offline or transient — fall back to the local snapshot. A hard failure
        // with no snapshot is handled below.
        if (err instanceof HttpErrorResponse && err.status !== 0) {
          this._error.set(problemDetailMessage(err));
        }
        return null;
      }),
      this.draftDb.loadPending(sessionId).catch(() => [] as AnswerOp[]),
    ]);

    const questions = meta?.questions ?? [];
    if (questions.length === 0) {
      // Nothing to draw the exam with (no snapshot, and the server never sends
      // questions). Unrecoverable — surface a clear terminal error.
      this._sessionStatus.set('error');
      this._error.set(this._error() ?? 'This exam session could not be restored on this device.');
      return;
    }
    this._questions.set(questions);
    this._certId.set(meta?.certId ?? null);
    this._examTitle.set(meta?.examTitle ?? null);
    this._expiresAt.set(meta?.expiresAt ?? null);

    // Server baseline overlaid by local pending drafts (local wins — spec §5.5).
    const merged: Record<string, AnswerValue> = { ...(server?.answers ?? {}) };
    for (const op of pending) merged[op.questionId] = op.value;
    this._answers.set(merged);
    this._pendingOps.set(pending);
    // Continue the monotonic counter above any loaded draft seq.
    this.seq = pending.reduce((max, op) => Math.max(max, op.clientSeq), 0);

    this._remainingSeconds.set(server?.remainingSeconds ?? this.estimateRemaining(meta?.expiresAt));

    switch (server?.status) {
      case 'submitted':
      case 'auto_submitted':
        this._sessionStatus.set('submitted');
        break;
      case 'expired':
        this._sessionStatus.set('expired');
        break;
      default:
        this._sessionStatus.set('in-exam');
    }

    if (pending.length > 0) {
      this._syncStatus.set('queued');
      this.flushTrigger.next();
    } else {
      this._syncStatus.set('synced');
    }
  }

  // ── Answering ──────────────────────────────────────────────────────────────

  /**
   * Record an answer: optimistic UI update → durable IndexedDB write → enqueue →
   * debounced bulk flush. Typing/selecting never blocks on the network.
   */
  async setAnswer(questionId: string, value: AnswerValue): Promise<void> {
    if (this._sessionStatus() !== 'in-exam' && this._sessionStatus() !== 'reviewing') return;

    this._answers.update((a) => ({ ...a, [questionId]: value }));

    const op: AnswerOp = {
      sessionId: this._sessionId() ?? '',
      questionId,
      value,
      clientSeq: ++this.seq,
    };

    try {
      await this.draftDb.put(op);
    } catch {
      // IndexedDB failed (quota/permission) — surface a non-blocking warning but
      // keep syncing to the server in real time (spec §9).
      this._draftError.set(true);
    }

    this._pendingOps.update((q) => [...q, op]);
    if (this._syncStatus() === 'synced' || this._syncStatus() === 'idle') {
      this._syncStatus.set('queued');
    }
    this.flushTrigger.next();
  }

  /** Move to the review pane / return to answering (drives `canSubmit`). */
  enterReview(): void {
    if (this._sessionStatus() === 'in-exam') this._sessionStatus.set('reviewing');
  }
  backToQuestions(): void {
    if (this._sessionStatus() === 'reviewing') this._sessionStatus.set('in-exam');
  }

  // ── Sync queue (bulk autosave) ─────────────────────────────────────────────

  /**
   * Flush the current answers to the server as ONE bulk autosave, then ack the
   * exact ops that were in flight (any answer that arrived mid-flush stays queued
   * and triggers another pass).
   */
  private async flushQueue(): Promise<void> {
    if (!this.isOnline() || this._syncStatus() === 'syncing') return;
    const opsInFlight = this._pendingOps();
    const sessionId = this._sessionId();
    if (opsInFlight.length === 0 || !sessionId) return;

    this._syncStatus.set('syncing');
    const answersSnapshot = this._answers();
    try {
      await firstValueFrom(this.api.autosave(sessionId, answersSnapshot));

      // Ack every in-flight op in one IndexedDB transaction.
      await this.draftDb.markManySynced(opsInFlight).catch(() => undefined);

      const flushedSeqs = new Set(opsInFlight.map((op) => op.clientSeq));
      this._pendingOps.update((q) => q.filter((op) => !flushedSeqs.has(op.clientSeq)));

      if (this._pendingOps().length === 0) {
        this._syncStatus.set('synced');
      } else {
        this._syncStatus.set('queued');
        this.flushTrigger.next();
      }
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409) {
        // The session expired between edits and this autosave.
        this.markExpired();
        return;
      }
      // Network / 5xx: the retry interceptor already backed off; leave the ops
      // queued and let the next trigger (or the `online` event) retry.
      this._syncStatus.set('error');
    }
  }

  // ── Submission ─────────────────────────────────────────────────────────────

  /** Submit the exam. Returns the score, or `null` on a handled terminal race. */
  async submit(): Promise<ExamScoreResult | null> {
    const sessionId = this._sessionId();
    if (!sessionId || this._sessionStatus() === 'submitting') return null;

    const previous = this._sessionStatus();
    this._sessionStatus.set('submitting');
    this._error.set(null);
    try {
      const result = await firstValueFrom(this.api.submit(sessionId, this._answers()));
      await this.finishSubmitted(sessionId, result);
      return result;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409) {
        // Already submitted (double-click / auto-submit race) — terminal. The
        // score isn't returned here; the result page reads it from /exam/attempts.
        await this.finishSubmitted(sessionId, null);
        return null;
      }
      this._error.set(problemDetailMessage(err));
      this._sessionStatus.set(previous);
      return null;
    }
  }

  /**
   * Late submit within the 2-minute grace window (after `session_expired`). On
   * 403 the grace has closed and the backend has auto-submitted from its own
   * snapshot — treated as terminal.
   */
  async lateSubmit(): Promise<ExamScoreResult | null> {
    const sessionId = this._sessionId();
    if (!sessionId || this._sessionStatus() === 'submitting') return null;

    this._sessionStatus.set('submitting');
    this._error.set(null);
    try {
      const result = await firstValueFrom(this.api.lateSubmit(sessionId, this._answers()));
      await this.finishSubmitted(sessionId, result);
      return result;
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 403) {
        await this.finishSubmitted(sessionId, null);
        return null;
      }
      this._error.set(problemDetailMessage(err));
      this._sessionStatus.set('expired');
      return null;
    }
  }

  // ── WS / timer hooks (fed by the Socket.IO layer in Slice 4) ───────────────

  /** Apply an authoritative remaining-time reading from a server tick. */
  applyServerTick(remainingSeconds: number): void {
    this._remainingSeconds.set(Math.max(0, remainingSeconds));
  }

  /**
   * Server signalled expiry (`session_expired`, or a 409 on autosave) — enter the
   * expired state and immediately attempt a late-submit of the current answers
   * within the grace window. Centralised here (both the WS and the autosave-409
   * path call this) so the state-machine reaction lives with the state, not in
   * the view.
   */
  markExpired(): void {
    this._remainingSeconds.set(0);
    if (this._sessionStatus() === 'in-exam' || this._sessionStatus() === 'reviewing') {
      this._sessionStatus.set('expired');
      void this.lateSubmit();
    }
  }

  /** Force the terminal restore-error state (no session id / nothing to resume). */
  failRestore(message?: string): void {
    this._sessionStatus.set('error');
    this._error.set(message ?? null);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async finishSubmitted(sessionId: string, result: ExamScoreResult | null): Promise<void> {
    this._score.set(result);
    this._sessionStatus.set('submitted');
    this._syncStatus.set('synced');
    // Drafts are no longer authoritative once the attempt is persisted.
    await this.draftDb.deleteSession(sessionId).catch(() => undefined);
  }

  private isOnline(): boolean {
    return typeof navigator === 'undefined' || navigator.onLine;
  }

  /**
   * Offline-only fallback estimate of remaining time from the persisted expiry.
   * This is a LOCAL-clock estimate used purely to seed the display until the WS
   * delivers an authoritative tick — never the source of truth (spec §6.3).
   */
  private estimateRemaining(expiresAt: string | undefined): number {
    if (!expiresAt) return 0;
    const ms = new Date(expiresAt).getTime() - Date.now();
    return ms > 0 ? Math.floor(ms / 1000) : 0;
  }

  private resetState(): void {
    this.seq = 0;
    this._answers.set({});
    this._pendingOps.set([]);
    this._score.set(null);
    this._error.set(null);
    this._draftError.set(false);
    this._syncStatus.set('idle');
  }
}
