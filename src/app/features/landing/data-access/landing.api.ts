/**
 * LandingApi — HTTP client for landing page dynamic content.
 *
 * ── Current state ─────────────────────────────────────────────────────────
 * The backend endpoint does not exist yet. `getPageData()` returns `null`,
 * which causes `LandingStore` to fall back to its static defaults.
 *
 * ── When the backend is ready ────────────────────────────────────────────
 * 1. Remove the `return null` guard.
 * 2. Uncomment (or restore) the `firstValueFrom(this.http.get(...))` call.
 * 3. The store and all components require no other changes — they already
 *    consume the mapped domain model regardless of source.
 *
 * The endpoint contract is documented in `landing.dto.ts`.
 * Only dynamic fields are returned (cohort date, graduate count, insight posts).
 * Static copy lives in the section components and is never fetched.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '@env/environment';

import { mapLandingDynamicData } from './landing.mappers';
import type { LandingDynamicData } from './landing.model';
import type { LandingDynamicDto } from './landing.dto';

@Injectable({ providedIn: 'root' })
export class LandingApi {
  private readonly http = inject(HttpClient);

  /**
   * Fetches the landing page dynamic content payload.
   *
   * Returns `null` while the backend endpoint is unavailable so the store
   * can fall back to static defaults gracefully.
   */
  async getPageData(): Promise<LandingDynamicData | null> {
    // Guard until the backend endpoint is live: returning null lets the store fall back to
    // static defaults rather than failing the request in non-production builds.
    if (!environment.production) {
      return null;
    }

    try {
      const dto = await firstValueFrom(
        this.http.get<LandingDynamicDto>(`${environment.apiBaseUrl}/landing`),
      );
      return mapLandingDynamicData(dto);
    } catch {
      return null;
    }
  }
}
