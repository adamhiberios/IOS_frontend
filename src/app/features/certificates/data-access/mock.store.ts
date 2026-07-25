import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, firstValueFrom } from 'rxjs';

import { AppEventBus } from '@core/event-bus';
import { problemDetailMessage } from '@core/http';

import { MockApi } from './mock.api';
import {
  type MockHistoryItem,
  type MockQuestion,
  type MockResult,
  type MockReveal,
  type MockReview,
} from './mock.model';

/** Debounce window before a burst of answer changes is autosaved. */
const AUTOSAVE_DEBOUNCE_MS = 1_000;

type RunnerStatus = 'idle' | 'starting' | 'active' | 'submitting' | 'submitted' | 'error';

/**
 * `MockStore` — student practice-exam state (live runner, history, review).
 * Root singleton; server state in private signals exposed via `.asReadonly()`,
 * mutated only through actions. Clears on logout. No Observables leak to the UI.
 *
 * Mock vs. real exam: the timer is soft (extendable, non-terminal), correct
 * answers are revealed (reveal + review), and nothing is graded on the client.
 */
@Injectable({ providedIn: 'root' })
export class MockStore {
  private readonly api = inject(MockApi);
  private readonly bus = inject(AppEventBus);

  // ── Live attempt ─────────────────────────────────────────────────────────
  private readonly _attemptId = signal<string | null>(null);
  private readonly _certId = signal<string | null>(null);
  private readonly _questions = signal<readonly MockQuestion[]>([]);
  private readonly _answers = signal<Record<string, string>>({});
  private readonly _remainingSeconds = signal(0);
  private readonly _extensionsRemaining = signal(0);
  private readonly _timeUp = signal(false);
  private readonly _runnerStatus = signal<RunnerStatus>('idle');
  private readonly _runnerError = signal<string | null>(null);
  private readonly _reveals = signal<Record<string, MockReveal>>({});
  private readonly _result = signal<MockResult | null>(null);

  readonly attemptId = this._attemptId.asReadonly();
  readonly certId = this._certId.asReadonly();
  readonly questions = this._questions.asReadonly();
  readonly answers = this._answers.asReadonly();
  readonly remainingSeconds = this._remainingSeconds.asReadonly();
  readonly extensionsRemaining = this._extensionsRemaining.asReadonly();
  readonly timeUp = this._timeUp.asReadonly();
  readonly runnerStatus = this._runnerStatus.asReadonly();
  readonly runnerError = this._runnerError.asReadonly();
  readonly reveals = this._reveals.asReadonly();
  readonly result = this._result.asReadonly();

  readonly answeredCount = computed(() => Object.keys(this._answers()).length);
  readonly canExtend = computed(() => this._extensionsRemaining() > 0);

  // ── History ───────────────────────────────────────────────────────────────
  private readonly _history = signal<readonly MockHistoryItem[]>([]);
  private readonly _historyLoading = signal(false);
  private readonly _historyLoadingMore = signal(false);
  private readonly _historyError = signal<string | null>(null);
  private readonly _historyCursor = signal<string | null>(null);
  private readonly _historyHasMore = signal(false);
  private readonly _historyLoaded = signal(false);
  readonly history = this._history.asReadonly();
  readonly historyLoading = this._historyLoading.asReadonly();
  readonly historyLoadingMore = this._historyLoadingMore.asReadonly();
  readonly historyError = this._historyError.asReadonly();
  readonly historyHasMore = this._historyHasMore.asReadonly();
  readonly historyEmpty = computed(
    () => this._historyLoaded() && this._historyError() === null && this._history().length === 0,
  );

  // ── Review ────────────────────────────────────────────────────────────────
  private readonly _review = signal<MockReview | null>(null);
  private readonly _reviewLoading = signal(false);
  private readonly _reviewError = signal<string | null>(null);
  readonly review = this._review.asReadonly();
  readonly reviewLoading = this._reviewLoading.asReadonly();
  readonly reviewError = this._reviewError.asReadonly();

  private readonly autosaveTrigger = new Subject<void>();

  constructor() {
    this.autosaveTrigger
      .pipe(debounceTime(AUTOSAVE_DEBOUNCE_MS), takeUntilDestroyed())
      .subscribe(() => void this.flushAutosave());
    this.bus
      .on('user.logged-out')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.clear());
  }

  // ── Runner actions ─────────────────────────────────────────────────────────

  /** Start a new attempt for a certificate. Returns the attemptId, or null on error. */
  async start(certId: string): Promise<string | null> {
    this.resetRunner();
    this._runnerStatus.set('starting');
    try {
      const start = await firstValueFrom(this.api.start(certId));
      this._attemptId.set(start.attemptId);
      this._certId.set(start.certId);
      this._questions.set(start.questions);
      this._remainingSeconds.set(start.durationSeconds);
      this._extensionsRemaining.set(start.extensionsRemaining);
      this._runnerStatus.set('active');
      return start.attemptId;
    } catch (err) {
      this._runnerError.set(problemDetailMessage(err));
      this._runnerStatus.set('error');
      return null;
    }
  }

  /** Resume an existing attempt (reload / deep link). */
  async resume(attemptId: string): Promise<void> {
    this.resetRunner();
    this._runnerStatus.set('starting');
    this._attemptId.set(attemptId);
    try {
      const s = await firstValueFrom(this.api.getSession(attemptId));
      this._certId.set(s.certId);
      this._questions.set(s.questions);
      this._answers.set({ ...s.answers });
      this._remainingSeconds.set(s.remainingSeconds);
      this._extensionsRemaining.set(s.extensionsRemaining);
      this._timeUp.set(s.timeUp);
      this._runnerStatus.set(s.status === 'submitted' ? 'submitted' : 'active');
    } catch (err) {
      this._runnerError.set(problemDetailMessage(err));
      this._runnerStatus.set('error');
    }
  }

  /** Record an answer optimistically and schedule a debounced autosave. */
  setAnswer(questionId: string, optionId: string): void {
    if (this._runnerStatus() !== 'active') return;
    this._answers.update((a) => ({ ...a, [questionId]: optionId }));
    this.autosaveTrigger.next();
  }

  /** Reveal the correctness of the selected answer for a question (mock-only hint). */
  async reveal(questionId: string): Promise<void> {
    const attemptId = this._attemptId();
    if (!attemptId) return;
    try {
      const result = await firstValueFrom(this.api.reveal(attemptId, questionId));
      this._reveals.update((r) => ({ ...r, [questionId]: result }));
    } catch {
      // Non-critical hint; the global error interceptor surfaces failures.
    }
  }

  /** Extend the soft timer by the backend's fixed increment (422 when capped). */
  async extend(): Promise<void> {
    const attemptId = this._attemptId();
    if (!attemptId) return;
    try {
      const ext = await firstValueFrom(this.api.extend(attemptId));
      this._remainingSeconds.set(ext.remainingSeconds);
      this._extensionsRemaining.set(ext.extensionsRemaining);
      this._timeUp.set(false);
    } catch (err) {
      this._runnerError.set(problemDetailMessage(err));
    }
  }

  /** Submit / exit — grades whatever is answered so far. Returns the result. */
  async submit(): Promise<MockResult | null> {
    const attemptId = this._attemptId();
    if (!attemptId || this._runnerStatus() === 'submitting') return null;
    this._runnerStatus.set('submitting');
    this._runnerError.set(null);
    try {
      const result = await firstValueFrom(this.api.submit(attemptId, this._answers()));
      this._result.set(result);
      this._runnerStatus.set('submitted');
      return result;
    } catch (err) {
      this._runnerError.set(problemDetailMessage(err));
      this._runnerStatus.set('active');
      return null;
    }
  }

  /** Apply an authoritative remaining-time reading (from the WS / a poll). */
  applyRemaining(remainingSeconds: number): void {
    this._remainingSeconds.set(Math.max(0, remainingSeconds));
    this._timeUp.set(remainingSeconds <= 0);
  }

  private async flushAutosave(): Promise<void> {
    const attemptId = this._attemptId();
    if (!attemptId || this._runnerStatus() !== 'active') return;
    try {
      await firstValueFrom(this.api.autosave(attemptId, this._answers()));
    } catch {
      // Autosave never rejects server-side; a transport blip retries on next edit.
    }
  }

  // ── History actions ──────────────────────────────────────────────────────

  async loadHistory(): Promise<void> {
    this._historyLoading.set(true);
    this._historyError.set(null);
    try {
      const page = await firstValueFrom(this.api.getHistory({ limit: 20 }));
      this._history.set(page.items);
      this._historyCursor.set(page.nextCursor);
      this._historyHasMore.set(page.hasMore);
    } catch (err) {
      this._historyError.set(problemDetailMessage(err));
    } finally {
      this._historyLoading.set(false);
      this._historyLoaded.set(true);
    }
  }

  async loadMoreHistory(): Promise<void> {
    if (this._historyLoadingMore() || !this._historyHasMore()) return;
    const cursor = this._historyCursor();
    if (!cursor) return;
    this._historyLoadingMore.set(true);
    try {
      const page = await firstValueFrom(this.api.getHistory({ cursor, limit: 20 }));
      this._history.update((cur) => [...cur, ...page.items]);
      this._historyCursor.set(page.nextCursor);
      this._historyHasMore.set(page.hasMore);
    } catch (err) {
      this._historyError.set(problemDetailMessage(err));
    } finally {
      this._historyLoadingMore.set(false);
    }
  }

  // ── Review actions ───────────────────────────────────────────────────────

  async loadReview(attemptId: string): Promise<void> {
    this._reviewLoading.set(true);
    this._reviewError.set(null);
    try {
      this._review.set(await firstValueFrom(this.api.getReview(attemptId)));
    } catch (err) {
      this._review.set(null);
      this._reviewError.set(problemDetailMessage(err));
    } finally {
      this._reviewLoading.set(false);
    }
  }

  clear(): void {
    this.resetRunner();
    this._history.set([]);
    this._historyLoaded.set(false);
    this._historyError.set(null);
    this._historyCursor.set(null);
    this._historyHasMore.set(false);
    this._review.set(null);
    this._reviewError.set(null);
  }

  private resetRunner(): void {
    this._attemptId.set(null);
    this._certId.set(null);
    this._questions.set([]);
    this._answers.set({});
    this._remainingSeconds.set(0);
    this._extensionsRemaining.set(0);
    this._timeUp.set(false);
    this._reveals.set({});
    this._result.set(null);
    this._runnerError.set(null);
    this._runnerStatus.set('idle');
  }
}
