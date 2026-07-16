import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';
import { AppEventBus } from '@core/event-bus';

import { StudentInsightsApi } from './insights.api';
import { type StudentInsights } from './insights.model';

/**
 * `StudentInsightsStore` — root singleton for the student's `GET /insights`
 * aggregates (BE-I-20a / A5), surfaced on the Dashboard overview.
 *
 * Root-provided so the overview reuses a single fetch across navigations (and so
 * the A7 dashboard composition can reuse it). Cleared on `user.logged-out`
 * (per-student data).
 */
@Injectable({ providedIn: 'root' })
export class StudentInsightsStore {
  private readonly api = inject(StudentInsightsApi);
  private readonly lang = inject(LanguageService);
  private readonly bus = inject(AppEventBus);

  constructor() {
    this.bus
      .on('user.logged-out')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.clear());
  }

  private readonly _insights = signal<StudentInsights | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly insights = this._insights.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  /**
   * Load the insights from `GET /insights`. Skips the fetch when already loaded
   * unless `force` is passed.
   */
  async load(force = false): Promise<void> {
    if (!force && this._insights() !== null) return;
    if (this._loading()) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      this._insights.set(await firstValueFrom(this.api.get()));
    } catch (err) {
      this._error.set(problemDetailMessage(err) ?? this.lang.t('studentInsights.loadError'));
    } finally {
      this._loading.set(false);
    }
  }

  /** Force a re-fetch. */
  async reload(): Promise<void> {
    await this.load(true);
  }

  private clear(): void {
    this._insights.set(null);
    this._error.set(null);
  }
}
