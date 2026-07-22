/**
 * LandingApi — transport for the public landing page (`GET /landing`, BE-I-20).
 *
 * Bare `{ featuredPrograms, stats }`, no auth, localized by `X-Lang` (via
 * `localeInterceptor`). Titles/prices arrive resolved into the requested locale.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { environment } from '@env/environment';

import { type LandingResponseDto } from './landing.dto';
import { toLandingData } from './landing.mappers';
import { type LandingData } from './landing.model';

@Injectable({ providedIn: 'root' })
export class LandingApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/landing`;

  /** `GET /landing` — featured programs + live platform stats. */
  getPageData(): Observable<LandingData> {
    return this.http.get<LandingResponseDto>(this.base).pipe(map(toLandingData));
  }
}
