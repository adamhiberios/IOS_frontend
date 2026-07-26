import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { AppEventBus } from '@core/event-bus';
import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { AdminDashboardApi } from './dashboard.api';
import { type DashboardMonths, type DashboardOverview } from './dashboard.model';

/**
 * `AdminDashboardStore` — root singleton for the admin dashboard overview
 * (BE-I-07 / B6), surfaced on the admin home for super_admin / finance_admin.
 *
 * Owns the revenue-window (`months`) selection and re-fetches when it changes.
 * Cleared on `user.logged-out` (platform-wide finance data — never leak across
 * sessions).
 */
@Injectable({ providedIn: 'root' })
export class AdminDashboardStore {
  private readonly api = inject(AdminDashboardApi);
  private readonly lang = inject(LanguageService);
  private readonly bus = inject(AppEventBus);

  constructor() {
    this.bus
      .on('user.logged-out')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.clear());
  }

  private readonly _overview = signal<DashboardOverview | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _months = signal<DashboardMonths>(6);
  private readonly _from = signal<string | undefined>(undefined);
  private readonly _to = signal<string | undefined>(undefined);

  readonly overview = this._overview.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly months = this._months.asReadonly();
  readonly from = this._from.asReadonly();
  readonly to = this._to.asReadonly();

  /** True once a first successful fetch has populated the overview. */
  readonly loaded = computed(() => this._overview() !== null);

  /**
   * Load the overview from `GET /admin/dashboard/overview`. Skips the fetch when
   * already loaded (for the current window) unless `force` is passed.
   */
  async load(force = false): Promise<void> {
    if (!force && this._overview() !== null) return;
    if (this._loading()) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      const from = this._from();
      const to = this._to();
      if (from || to) {
        this._overview.set(await firstValueFrom(this.api.getOverviewByDateRange(from, to)));
      } else {
        this._overview.set(await firstValueFrom(this.api.getOverview(this._months())));
      }
    } catch (err) {
      this._error.set(problemDetailMessage(err) ?? this.lang.t('admin.home.metrics.loadError'));
    } finally {
      this._loading.set(false);
    }
  }

  /** Force a re-fetch with the current window. */
  async reload(): Promise<void> {
    await this.load(true);
  }

  /** Change the revenue-series window and re-fetch (no-op if unchanged). */
  async setMonths(months: DashboardMonths): Promise<void> {
    if (months === this._months()) return;
    this._months.set(months);
    this._from.set(undefined);
    this._to.set(undefined);
    await this.load(true);
  }

  /** Set date range filter and re-fetch. */
  async setDateRange(from?: string, to?: string): Promise<void> {
    this._from.set(from);
    this._to.set(to);
    await this.load(true);
  }

  /** Clear date range filter and reset to months-based view. */
  async clearDateRange(): Promise<void> {
    this._from.set(undefined);
    this._to.set(undefined);
    await this.load(true);
  }

  private clear(): void {
    this._overview.set(null);
    this._error.set(null);
    this._months.set(6);
    this._from.set(undefined);
    this._to.set(undefined);
  }
}
