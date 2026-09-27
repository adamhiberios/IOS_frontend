import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { AuthStore } from '@core/auth';
import { LanguageService } from '@core/i18n';
import { Button } from '@ui';

import { AdminRevenueChart } from '../components/admin-revenue-chart';
import { AdminDashboardStore } from '../data-access/dashboard.store';
import {
  DASHBOARD_MONTH_OPTIONS,
  DASHBOARD_RANGE_PRESETS,
  type DashboardMonths,
  type DashboardRangePreset,
  dateInputToIso,
  formatMoney,
  formatPassRate,
  presetRangeStart,
} from '../data-access/dashboard.model';

/**
 * Admin home — the landing page after admin sign-in.
 *
 * Confirms the signed-in staff member and their role, and — for super_admin /
 * finance_admin — surfaces the platform-wide dashboard metrics (BE-I-07 / B6):
 * revenue KPIs + a monthly-revenue chart + a top-programs list. The overview
 * endpoint is finance-gated (403 for every other role), so the metrics section
 * (and its fetch) is hidden for admins who can't read it — no doomed request.
 */
@Component({
  selector: 'ios-admin-home-page',
  imports: [Button, AdminRevenueChart, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h1 class="text-2xl font-bold text-ios-brand-dark">
        {{ lang.t('admin.home.title') }}
      </h1>
      <p class="text-sm text-gray-500 mt-1">
        {{ lang.t('admin.home.subtitle') }}
      </p>

      <dl class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <dt class="text-xs uppercase tracking-wide text-gray-500">
            {{ lang.t('admin.home.signedInAs') }}
          </dt>
          <dd class="mt-1 text-base font-semibold">{{ displayName() }}</dd>
          <dd class="text-sm text-gray-500">{{ email() }}</dd>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <dt class="text-xs uppercase tracking-wide text-gray-500">
            {{ lang.t('admin.home.role') }}
          </dt>
          <dd class="mt-1 text-base font-semibold">{{ roleLabel() }}</dd>
        </div>
      </dl>

      @if (canViewMetrics()) {
        <div class="mt-10">
          <div class="flex items-center justify-between gap-4 flex-wrap mb-4">
            <h2 class="text-lg font-semibold text-ios-brand-dark">
              {{ lang.t('admin.home.metrics.title') }}
            </h2>
          </div>

          <!-- Date range filter: quick presets + custom from/to (IDD-391) -->
          <div class="rounded-lg border border-gray-200 bg-white p-4 mb-4">
            <div
              class="inline-flex flex-wrap rounded-lg border border-gray-200 bg-white p-0.5"
              role="group"
              [attr.aria-label]="lang.t('admin.home.metrics.rangeLabel')"
            >
              @for (p of rangePresets; track p) {
                <button
                  type="button"
                  class="px-3 py-1.5 text-sm font-semibold rounded-md transition-colors cursor-pointer hover:text-ios-brand-primary
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50
                         disabled:cursor-not-allowed disabled:opacity-60"
                  [class.bg-ios-brand-amber-soft]="preset() === p"
                  [class.text-ios-brand-primary]="preset() === p"
                  [class.text-gray-500]="preset() !== p"
                  [attr.aria-pressed]="preset() === p"
                  [disabled]="store.loading()"
                  (click)="selectPreset(p)"
                >
                  {{ lang.t('admin.home.metrics.range.' + p) }}
                </button>
              }
            </div>

            @if (preset() === 'custom') {
              <div class="mt-4 flex items-end gap-4 flex-wrap" [formGroup]="dateRangeForm">
                <div class="flex-1 min-w-[200px]">
                  <label
                    for="filter-from"
                    class="block text-sm font-medium text-ios-brand-dark mb-1"
                  >
                    {{ lang.t('admin.home.metrics.dateFromLabel') }}
                  </label>
                  <input
                    id="filter-from"
                    type="date"
                    formControlName="from"
                    [max]="dateRangeForm.controls.to.value || null"
                    (change)="applyCustomRange()"
                    class="w-full h-12 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
                  />
                </div>
                <div class="flex-1 min-w-[200px]">
                  <label for="filter-to" class="block text-sm font-medium text-ios-brand-dark mb-1">
                    {{ lang.t('admin.home.metrics.dateToLabel') }}
                  </label>
                  <input
                    id="filter-to"
                    type="date"
                    formControlName="to"
                    [min]="dateRangeForm.controls.from.value || null"
                    (change)="applyCustomRange()"
                    class="w-full h-12 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
                  />
                </div>
              </div>
              <p class="mt-2 text-xs text-gray-400">
                {{ lang.t('admin.home.metrics.customHint') }}
              </p>
            }
          </div>

          <!-- Revenue-window control (shown when no date range is set) -->
          <!-- @if (!hasDateRange()) {
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-600 mb-2">
                {{ lang.t('admin.home.metrics.months') }}
              </label>
              <div
                class="inline-flex rounded-lg border border-gray-200 bg-white p-0.5"
                role="group"
                [attr.aria-label]="lang.t('admin.home.metrics.months')"
              >
                @for (m of monthOptions; track m) {
                  <button
                    type="button"
                    class="px-3 py-1 text-sm font-semibold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                    [class.bg-ios-brand-amber-soft]="store.months() === m"
                    [class.text-ios-brand-primary]="store.months() === m"
                    [class.text-gray-500]="store.months() !== m"
                    [attr.aria-pressed]="store.months() === m"
                    [disabled]="store.loading()"
                    (click)="onMonths(m)"
                  >
                    {{ lang.t('admin.home.metrics.monthsOption', { count: m }) }}
                  </button>
                }
              </div>
            </div>
          } -->

          @if (store.loading() && !store.loaded()) {
            <p class="mt-6 text-sm text-gray-500" role="status">
              {{ lang.t('admin.home.metrics.loading') }}
            </p>
          } @else if (store.error() && !store.loaded()) {
            <div
              class="mt-6 rounded-xl border border-ios-danger-mid/30 bg-ios-danger-mid/5 p-4"
              role="alert"
            >
              <p class="text-sm text-ios-danger-mid">{{ store.error() }}</p>
              <ios-button variant="secondary" size="sm" class="mt-3" (clicked)="retry()">
                {{ lang.t('admin.home.metrics.retry') }}
              </ios-button>
            </div>
          } @else if (store.overview(); as o) {
            <!-- KPI tiles -->
            <dl class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div class="rounded-xl border border-gray-200 bg-white p-4">
                <dt class="text-xs uppercase tracking-wide text-gray-500">
                  {{
                    ranged()
                      ? lang.t('admin.home.metrics.revenue')
                      : lang.t('admin.home.metrics.revenueTotal')
                  }}
                  @if (ranged()) {
                    <span
                      class="ms-2 normal-case tracking-normal rounded bg-ios-brand-amber-soft px-1.5 py-0.5 text-[11px] font-semibold text-ios-brand-primary"
                      >{{ rangeName() }}</span
                    >
                  }
                </dt>
                <dd class="mt-1 text-2xl font-bold text-ios-brand-dark">
                  {{ money(ranged() ? o.revenue.last30Days : o.revenue.total, o.revenue.currency) }}
                </dd>
                <dd class="text-xs text-gray-500 mt-1">
                  @if (ranged()) {
                    {{
                      lang.t('admin.home.metrics.allTimeValue', {
                        value: money(o.revenue.total, o.revenue.currency),
                      })
                    }}
                  } @else {
                    {{
                      lang.t('admin.home.metrics.revenueLast30', {
                        amount: money(o.revenue.last30Days, o.revenue.currency),
                      })
                    }}
                  }
                </dd>
              </div>

              <div class="rounded-xl border border-gray-200 bg-white p-4">
                <dt class="text-xs uppercase tracking-wide text-gray-500">
                  {{ lang.t('admin.home.metrics.transactions') }}
                  @if (ranged()) {
                    <span
                      class="ms-2 normal-case tracking-normal rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-500"
                      >{{ lang.t('admin.home.metrics.allTimeBadge') }}</span
                    >
                  }
                </dt>
                <dd class="mt-1 text-2xl font-bold text-ios-brand-dark">
                  {{ o.transactions.completed }}
                  <span class="text-sm font-normal text-gray-500">{{
                    lang.t('admin.home.metrics.transactionsCompleted')
                  }}</span>
                </dd>
                <dd class="text-xs text-gray-500 mt-1">
                  {{
                    lang.t('admin.home.metrics.transactionsBreakdown', {
                      pending: o.transactions.pending,
                      failed: o.transactions.failed,
                      refunded: o.transactions.refunded,
                    })
                  }}
                </dd>
              </div>

              <div class="rounded-xl border border-gray-200 bg-white p-4">
                <dt class="text-xs uppercase tracking-wide text-gray-500">
                  {{ lang.t('admin.home.metrics.enrollments') }}
                  @if (ranged()) {
                    <span
                      class="ms-2 normal-case tracking-normal rounded bg-ios-brand-amber-soft px-1.5 py-0.5 text-[11px] font-semibold text-ios-brand-primary"
                      >{{ rangeName() }}</span
                    >
                  }
                </dt>
                <dd class="mt-1 text-2xl font-bold text-ios-brand-dark">
                  {{ ranged() ? o.enrollments.last30Days : o.enrollments.total }}
                </dd>
                <dd class="text-xs text-gray-500 mt-1">
                  @if (ranged()) {
                    {{ lang.t('admin.home.metrics.allTimeValue', { value: o.enrollments.total }) }}
                  } @else {
                    {{ lang.t('admin.home.metrics.last30', { count: o.enrollments.last30Days }) }}
                  }
                </dd>
              </div>

              <div class="rounded-xl border border-gray-200 bg-white p-4">
                <dt class="text-xs uppercase tracking-wide text-gray-500">
                  {{
                    ranged()
                      ? lang.t('admin.home.metrics.newStudents')
                      : lang.t('admin.home.metrics.students')
                  }}
                  @if (ranged()) {
                    <span
                      class="ms-2 normal-case tracking-normal rounded bg-ios-brand-amber-soft px-1.5 py-0.5 text-[11px] font-semibold text-ios-brand-primary"
                      >{{ rangeName() }}</span
                    >
                  }
                </dt>
                <dd class="mt-1 text-2xl font-bold text-ios-brand-dark">
                  {{ ranged() ? o.students.newLast30Days : o.students.total }}
                </dd>
                <dd class="text-xs text-gray-500 mt-1">
                  @if (ranged()) {
                    {{ lang.t('admin.home.metrics.allTimeValue', { value: o.students.total }) }}
                  } @else {
                    {{
                      lang.t('admin.home.metrics.newLast30', { count: o.students.newLast30Days })
                    }}
                  }
                </dd>
              </div>

              <div class="rounded-xl border border-gray-200 bg-white p-4">
                <dt class="text-xs uppercase tracking-wide text-gray-500">
                  {{ lang.t('admin.home.metrics.examAttempts') }}
                  @if (ranged()) {
                    <span
                      class="ms-2 normal-case tracking-normal rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-500"
                      >{{ lang.t('admin.home.metrics.allTimeBadge') }}</span
                    >
                  }
                </dt>
                <dd class="mt-1 text-2xl font-bold text-ios-brand-dark">
                  {{ o.exams.attempts }}
                </dd>
                <dd class="text-xs text-gray-500 mt-1">
                  {{
                    lang.t('admin.home.metrics.passRateValue', {
                      rate: passRate(o.exams.passRate),
                    })
                  }}
                </dd>
              </div>

              <div class="rounded-xl border border-gray-200 bg-white p-4">
                <dt class="text-xs uppercase tracking-wide text-gray-500">
                  {{ lang.t('admin.home.metrics.certificatesIssued') }}
                  @if (ranged()) {
                    <span
                      class="ms-2 normal-case tracking-normal rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-500"
                      >{{ lang.t('admin.home.metrics.allTimeBadge') }}</span
                    >
                  }
                </dt>
                <dd class="mt-1 text-2xl font-bold text-ios-brand-dark">
                  {{ o.certificates.issued }}
                </dd>
              </div>
            </dl>

            <!-- Revenue time series -->
            <div class="mt-6">
              <h3 class="text-sm font-semibold text-gray-700 mb-2">
                {{
                  ranged()
                    ? lang.t('admin.home.metrics.revenueChartTitleRange', { range: rangeName() })
                    : lang.t('admin.home.metrics.revenueChartTitle')
                }}
              </h3>
              <ios-admin-revenue-chart
                [points]="o.revenue.monthly"
                [currency]="o.revenue.currency"
              />
            </div>

            <!-- Top programs -->
            <div class="mt-6">
              <h3 class="text-sm font-semibold text-gray-700 mb-2">
                {{ lang.t('admin.home.metrics.topPrograms') }}
                @if (ranged()) {
                  <span
                    class="ms-2 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-500"
                    >{{ lang.t('admin.home.metrics.allTimeBadge') }}</span
                  >
                }
              </h3>
              @if (o.topPrograms.length === 0) {
                <p class="text-sm text-gray-500">
                  {{ lang.t('admin.home.metrics.topProgramsEmpty') }}
                </p>
              } @else {
                <ul class="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                  @for (p of o.topPrograms; track p.certId) {
                    <li class="flex items-center justify-between gap-4 px-4 py-3">
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-ios-brand-dark truncate">
                          {{ p.program }}
                        </p>
                        <span
                          class="inline-block mt-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded px-1.5 py-0.5"
                        >
                          {{ p.programCode }}
                        </span>
                      </div>
                      <div class="text-end shrink-0">
                        <p class="text-sm font-semibold text-ios-brand-dark">
                          {{ money(p.revenue, o.revenue.currency) }}
                        </p>
                        <p class="text-xs text-gray-500">
                          {{
                            lang.t('admin.home.metrics.topProgramsEnrollments', {
                              count: p.enrollments,
                            })
                          }}
                        </p>
                      </div>
                    </li>
                  }
                </ul>
              }
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class AdminHomePage implements OnInit {
  private readonly auth = inject(AuthStore);
  protected readonly lang = inject(LanguageService);
  protected readonly store = inject(AdminDashboardStore);
  private readonly fb = inject(FormBuilder);

  protected readonly monthOptions = DASHBOARD_MONTH_OPTIONS;
  protected readonly dateRangeForm = this.fb.group({
    from: [''],
    to: [''],
  });

  protected readonly rangePresets = DASHBOARD_RANGE_PRESETS;
  /** Selected quick range; `all` = no range (the backend's default window). */
  protected readonly preset = signal<DashboardRangePreset>('all');

  /**
   * True once a range is actually applied (a custom range needs a start date).
   * The backend scopes only revenue, enrollments, new students and the monthly
   * series to the range; the other tiles stay all-time and are labelled so.
   */
  protected readonly ranged = computed(() => this.preset() !== 'all' && !!this.store.from());

  /** Human label for the applied range, shown on the scoped tiles and chart. */
  protected readonly rangeName = computed(() =>
    this.lang.t(
      this.preset() === 'custom'
        ? 'admin.home.metrics.rangeSelected'
        : `admin.home.metrics.range.${this.preset()}`,
    ),
  );

  protected readonly displayName = computed(() => this.auth.user()?.fullName ?? '');
  protected readonly email = computed(() => this.auth.user()?.email ?? '');

  /** Only super_admin / finance_admin may read the finance-sensitive overview. */
  protected readonly canViewMetrics = computed(
    () => this.auth.hasRole('super_admin') || this.auth.hasRole('finance_admin'),
  );

  protected readonly roleLabel = computed(() => {
    const role = this.auth.roles()[0];
    if (!role) return '';
    const spaced = role.replace(/_/g, ' ');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  });

  ngOnInit(): void {
    if (this.canViewMetrics()) void this.store.load();
  }

  protected money(amount: number, currency: string): string {
    return formatMoney(amount, currency, this.lang.locale());
  }

  protected passRate(fraction: number): string {
    return formatPassRate(fraction);
  }

  protected onMonths(months: DashboardMonths): void {
    void this.store.setMonths(months);
  }

  protected selectPreset(preset: DashboardRangePreset): void {
    if (preset === this.preset() && preset !== 'custom') return;
    this.preset.set(preset);
    if (preset === 'all') {
      this.dateRangeForm.reset();
      void this.store.clearDateRange();
    } else if (preset === 'custom') {
      // Keep the current data until a start date is picked.
      this.applyCustomRange();
    } else {
      void this.store.setDateRange(presetRangeStart(preset));
    }
  }

  /**
   * Applies the custom from/to once a start date exists — the backend ignores a
   * range with only an end. Dates are sent as the admin's local day bounds, so
   * the chosen end day is included.
   */
  protected applyCustomRange(): void {
    const { from, to } = this.dateRangeForm.getRawValue();
    if (!from) return;
    void this.store.setDateRange(
      dateInputToIso(from, 'start'),
      to ? dateInputToIso(to, 'end') : undefined,
    );
  }

  protected retry(): void {
    void this.store.reload();
  }
}

export default AdminHomePage;
