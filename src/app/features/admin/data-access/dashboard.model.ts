/**
 * Admin dashboard overview domain model (BE-I-07 / B6) — the platform-wide
 * aggregates shown on the admin home. Mirrors `dashboard.dto.ts`.
 *
 * `exams.passRate` is a **0–1 fraction** (render as a percentage); `revenue.currency`
 * may be the sentinel `"MIXED"` (completed tx spanning >1 currency, summed without FX).
 */

export interface MonthlyRevenuePoint {
  /** Calendar month, `YYYY-MM`. */
  readonly month: string;
  readonly revenue: number;
  readonly transactions: number;
}

export interface DashboardRevenue {
  readonly total: number;
  /** ISO currency code, or `"MIXED"` when completed tx span more than one currency. */
  readonly currency: string;
  readonly last30Days: number;
  readonly monthly: readonly MonthlyRevenuePoint[];
}

export interface DashboardTransactions {
  readonly completed: number;
  readonly pending: number;
  readonly failed: number;
  readonly refunded: number;
}

export interface DashboardEnrollments {
  readonly total: number;
  readonly last30Days: number;
}

export interface DashboardStudents {
  readonly total: number;
  readonly newLast30Days: number;
}

export interface DashboardExams {
  readonly attempts: number;
  readonly passed: number;
  /** 0–1 fraction — render as a percentage. */
  readonly passRate: number;
  readonly avgScore: number;
}

export interface DashboardCertificates {
  readonly issued: number;
}

export interface TopProgram {
  readonly certId: string;
  readonly program: string;
  readonly programCode: string;
  readonly enrollments: number;
  readonly revenue: number;
}

export interface DashboardOverview {
  readonly revenue: DashboardRevenue;
  readonly transactions: DashboardTransactions;
  readonly enrollments: DashboardEnrollments;
  readonly students: DashboardStudents;
  readonly exams: DashboardExams;
  readonly certificates: DashboardCertificates;
  readonly topPrograms: readonly TopProgram[];
}

/** Sentinel the backend returns when completed transactions span >1 currency. */
export const MIXED_CURRENCY = 'MIXED';

/**
 * Allowed values for the revenue-series window (`?months=N`, backend caps 1–24).
 * The page offers a compact subset as a segmented control.
 */
export const DASHBOARD_MONTH_OPTIONS = [6, 12, 24] as const;
export type DashboardMonths = (typeof DASHBOARD_MONTH_OPTIONS)[number];

/**
 * Quick date ranges for the platform overview (IDD-391). `all` means no range
 * (the backend's default trailing window); `custom` shows the from/to inputs.
 */
export const DASHBOARD_RANGE_PRESETS = ['all', 'today', '7d', '30d', '3m', 'custom'] as const;
export type DashboardRangePreset = (typeof DASHBOARD_RANGE_PRESETS)[number];

/** Local midnight `days` days before `now`, as an ISO instant. */
function daysAgoStart(now: Date, days: number): string {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - days).toISOString();
}

/**
 * Window start for a relative preset, or `undefined` for `all` / `custom`.
 * Only a start is returned: the backend defaults `to` to "now", which keeps
 * today's activity in every preset. Starts are local midnight so "Today" means
 * the admin's today, not UTC's.
 */
export function presetRangeStart(
  preset: DashboardRangePreset,
  now: Date = new Date(),
): string | undefined {
  switch (preset) {
    case 'today':
      return daysAgoStart(now, 0);
    case '7d':
      return daysAgoStart(now, 6);
    case '30d':
      return daysAgoStart(now, 29);
    case '3m': {
      // Clamp to the target month's length: 31 May → 28 Feb, not 3 Mar.
      const lastDay = new Date(now.getFullYear(), now.getMonth() - 2, 0).getDate();
      const day = Math.min(now.getDate(), lastDay);
      return new Date(now.getFullYear(), now.getMonth() - 3, day).toISOString();
    }
    default:
      return undefined;
  }
}

/**
 * A `<input type="date">` value (`YYYY-MM-DD`) as an ISO instant at the start
 * or end of that day in the admin's timezone. The backend reads a bare date as
 * UTC midnight, so sending `to` unchanged silently dropped the whole end day.
 */
export function dateInputToIso(value: string, edge: 'start' | 'end'): string {
  const [y, m, d] = value.split('-').map(Number);
  return edge === 'start'
    ? new Date(y, m - 1, d).toISOString()
    : new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

/** Format a 0–1 pass-rate fraction as a whole-number percentage (`0.8125` → `81%`). */
export function formatPassRate(fraction: number): string {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  return `${pct}%`;
}

/**
 * Format a monetary amount for display. For a real ISO currency this uses
 * `Intl` currency formatting; for the `"MIXED"` sentinel (or any code `Intl`
 * rejects) it falls back to a plain 2dp number with the code appended — never a
 * misleading single-currency symbol.
 */
export function formatMoney(amount: number, currency: string, locale: string): string {
  if (currency && currency !== MIXED_CURRENCY) {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
    } catch {
      // fall through to the plain-number fallback for unknown ISO codes
    }
  }
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return currency ? `${formatted} ${currency}` : formatted;
}
