import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { toHttpParams } from '@core/http';
import { environment } from '@env/environment';

import { type DashboardOverviewDto } from './dashboard.dto';
import { toDashboardOverview } from './dashboard.mappers';
import { type DashboardOverview } from './dashboard.model';

/**
 * Transport for the admin dashboard overview — `GET /admin/dashboard/overview`
 * (super_admin / finance_admin; every other role 403s — see backend-analysis
 * §B6). **Bare** response (no envelope). Bearer token via `authInterceptor`,
 * `X-Locale` via `localeInterceptor`.
 */
@Injectable({ providedIn: 'root' })
export class AdminDashboardApi {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/admin/dashboard/overview`;

  /**
   * `GET /admin/dashboard/overview?months=N` — platform-wide aggregates.
   * `months` sizes the revenue time series (backend caps 1–24, default 6).
   */
  getOverview(months?: number): Observable<DashboardOverview> {
    const params = toHttpParams({ months });
    return this.http
      .get<DashboardOverviewDto>(this.endpoint, { params })
      .pipe(map(toDashboardOverview));
  }

  /**
   * `GET /admin/dashboard/overview?from=DATE&to=DATE` — platform-wide aggregates
   * scoped to a date range. Both `from` and `to` are optional ISO 8601 dates.
   */
  getOverviewByDateRange(from?: string, to?: string): Observable<DashboardOverview> {
    const params = toHttpParams({ from, to });
    return this.http
      .get<DashboardOverviewDto>(this.endpoint, { params })
      .pipe(map(toDashboardOverview));
  }
}
