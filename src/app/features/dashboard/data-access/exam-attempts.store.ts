import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';
import { AppEventBus } from '@core/event-bus';

import { ExamAttemptsApi } from './exam-attempts.api';
import { type ExamAttempt } from './exam-attempts.model';

/** Page size for the real-exam history list (backend max is 100). */
const PAGE_LIMIT = 20;

/**
 * `ExamAttemptsStore` — root singleton for the student's real-exam attempt
 * history (`GET /exam/attempts`, BE-I-17 / A7), surfaced on the Dashboard
 * overview. Cursor-paginated, newest-first — `load` replaces the list,
 * `loadMore` appends the next keyset page.
 *
 * Root-provided so the fetch survives navigations; cleared on `user.logged-out`
 * (per-student data). Mirrors {@link PaymentsStore}'s history contract.
 */
@Injectable({ providedIn: 'root' })
export class ExamAttemptsStore {
  private readonly api = inject(ExamAttemptsApi);
  private readonly lang = inject(LanguageService);
  private readonly bus = inject(AppEventBus);

  private readonly _items = signal<readonly ExamAttempt[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadingMore = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _nextCursor = signal<string | null>(null);
  private readonly _hasMore = signal(false);
  private readonly _loaded = signal(false);

  readonly attempts = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadingMore = this._loadingMore.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly isEmpty = computed(
    () => this._loaded() && this._error() === null && this._items().length === 0,
  );

  constructor() {
    this.bus
      .on('user.logged-out')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.clear());
  }

  /**
   * Load the first page of the caller's attempt history. Skips the fetch when
   * already loaded unless `force` is passed.
   */
  async load(force = false): Promise<void> {
    if (!force && this._loaded()) return;
    await this.fetch(false);
  }

  /** Append the next keyset page of attempts, if any. */
  async loadMore(): Promise<void> {
    if (this._loadingMore() || !this._hasMore() || this._nextCursor() === null) return;
    await this.fetch(true);
  }

  /** Force a re-fetch of the first page (e.g. a retry after an error). */
  async reload(): Promise<void> {
    await this.fetch(false);
  }

  private async fetch(append: boolean): Promise<void> {
    if (append) this._loadingMore.set(true);
    else this._loading.set(true);
    this._error.set(null);
    try {
      const page = await firstValueFrom(
        this.api.list({
          cursor: append ? (this._nextCursor() ?? undefined) : undefined,
          limit: PAGE_LIMIT,
        }),
      );
      this._items.update((current) => (append ? [...current, ...page.items] : [...page.items]));
      this._nextCursor.set(page.nextCursor);
      this._hasMore.set(page.hasMore);
      this._loaded.set(true);
    } catch (err) {
      this._error.set(
        problemDetailMessage(err) ?? this.lang.t('studentInsights.examHistory.error'),
      );
    } finally {
      this._loading.set(false);
      this._loadingMore.set(false);
    }
  }

  private clear(): void {
    this._items.set([]);
    this._loading.set(false);
    this._loadingMore.set(false);
    this._error.set(null);
    this._nextCursor.set(null);
    this._hasMore.set(false);
    this._loaded.set(false);
  }
}
