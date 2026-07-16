/**
 * Wire shapes for the admin dashboard overview (BE-I-07 / B6).
 * `GET /admin/dashboard/overview?months=N` (super_admin / finance_admin) returns
 * a **bare** aggregate object (no envelope). Mirror the backend
 * `DashboardOverviewDto` JSON exactly.
 *
 * Revenue is finance-sensitive — the endpoint 403s for every role other than
 * super_admin / finance_admin, so the page only fetches when the signed-in admin
 * holds one of those roles.
 */

/** One point of the revenue time series (one calendar month). */
export interface MonthlyRevenuePointDto {
  /** Calendar month, `YYYY-MM`. */
  readonly month: string;
  /** Completed-transaction revenue for the month (2dp). */
  readonly revenue: number;
  /** Completed transaction count for the month. */
  readonly transactions: number;
}

export interface DashboardRevenueDto {
  /** All-time revenue from completed transactions (2dp). */
  readonly total: number;
  /** Currency of the totals; `"MIXED"` when completed tx span >1 currency (no FX). */
  readonly currency: string;
  /** Completed-transaction revenue in the last 30 days (2dp). */
  readonly last30Days: number;
  readonly monthly: readonly MonthlyRevenuePointDto[];
}

export interface DashboardTransactionsDto {
  readonly completed: number;
  readonly pending: number;
  readonly failed: number;
  readonly refunded: number;
}

export interface DashboardEnrollmentsDto {
  readonly total: number;
  readonly last30Days: number;
}

export interface DashboardStudentsDto {
  readonly total: number;
  readonly newLast30Days: number;
}

export interface DashboardExamsDto {
  readonly attempts: number;
  readonly passed: number;
  /** `passed / attempts`, as a 0–1 fraction (0 when no attempts). */
  readonly passRate: number;
  /** Average score across all attempts (2dp, 0 when none). */
  readonly avgScore: number;
}

export interface DashboardCertificatesDto {
  /** Count of active issued certificates. */
  readonly issued: number;
}

export interface TopProgramDto {
  readonly certId: string;
  readonly program: string;
  readonly programCode: string;
  /** Enrollment purchases. */
  readonly enrollments: number;
  /** Completed revenue (2dp). */
  readonly revenue: number;
}

/** Bare `GET /admin/dashboard/overview` response. */
export interface DashboardOverviewDto {
  readonly revenue: DashboardRevenueDto;
  readonly transactions: DashboardTransactionsDto;
  readonly enrollments: DashboardEnrollmentsDto;
  readonly students: DashboardStudentsDto;
  readonly exams: DashboardExamsDto;
  readonly certificates: DashboardCertificatesDto;
  /** Top 5 programs by enrollments. */
  readonly topPrograms: readonly TopProgramDto[];
}
