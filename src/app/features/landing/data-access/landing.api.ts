/**
 * LandingApi — HTTP client for landing page content.
 *
 * ── Current state ─────────────────────────────────────────────────────────
 * The backend endpoint does not exist yet. `getPageData()` returns
 * `null`, which causes `LandingStore` to fall back to static data.
 *
 * ── When the backend is ready ────────────────────────────────────────────
 * 1. Remove the `return null` line.
 * 2. Uncomment (or restore) the `firstValueFrom(this.http.get(...))` call.
 * 3. The store and all components require no changes — they already consume
 *    the mapped domain model regardless of source.
 *
 * The endpoint contract is documented in `landing.dto.ts`.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '@env/environment';

import { mapLandingPageData } from './landing.mappers';
import type { LandingPageData } from './landing.model';
import type { LandingPageDto } from './landing.dto';

@Injectable({ providedIn: 'root' })
export class LandingApi {
  private readonly http = inject(HttpClient);

  /**
   * Fetches the landing page content payload.
   *
   * Returns `null` while the backend endpoint is unavailable so the store
   * can fall back to static data gracefully.
   */
  async getPageData(): Promise<LandingPageData | null> {
    // ── TODO: remove this guard when the backend endpoint is live ──────────
    if (!environment.production) {
      return null;
    }
    // ────────────────────────────────────────────────────────────────────────

    try {
      const dto = await firstValueFrom(
        this.http.get<LandingPageDto>(`${environment.apiBaseUrl}/landing`),
      );
      return mapLandingPageData(dto);
    } catch {
      return null;
    }
  }
}
