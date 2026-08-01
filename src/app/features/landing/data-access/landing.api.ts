/**
 * LandingApi — transport for the public landing page's live counters
 * (`GET /analytics/public-stats`).
 *
 * **BE-I-30:** this used to call `GET /landing`, which the backend deleted in
 * `66a7632`; the call 404'd against the deployed API until this repoint. See
 * `landing.dto.ts` for where the rest of that composite payload went.
 *
 * Public (no auth), localized by `X-Lang` via `localeInterceptor` — though the
 * payload is numeric, so the locale only affects error messages.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { environment } from '@env/environment';

import { type PublicStatsResponseDto } from './landing.dto';
import { toLandingStats } from './landing.mappers';
import { type LandingStats } from './landing.model';

@Injectable({ providedIn: 'root' })
export class LandingApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/analytics`;

  /** `GET /analytics/public-stats` — live platform counters. */
  getPublicStats(): Observable<LandingStats> {
    return this.http
      .get<PublicStatsResponseDto>(`${this.base}/public-stats`)
      .pipe(map(toLandingStats));
  }
}
