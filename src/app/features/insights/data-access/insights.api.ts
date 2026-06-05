/**
 * InsightsApi — HTTP client for the insights content.
 *
 * ── Current state ─────────────────────────────────────────────────────────
 * The backend endpoint does not exist yet. `getPosts()` returns `null`, which
 * causes `InsightsStore` to fall back to static data.
 *
 * ── When the backend is ready ────────────────────────────────────────────
 * 1. Remove the `return null` guard.
 * 2. Uncomment the `firstValueFrom(this.http.get(...))` call.
 * 3. The store requires no changes.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '@env/environment';

import { mapInsightsPageData } from './insights.mappers';
import type { InsightsPageData } from './insights.model';
import type { InsightsPageDto } from './insights.dto';

@Injectable({ providedIn: 'root' })
export class InsightsApi {
  private readonly http = inject(HttpClient);

  async getPosts(): Promise<InsightsPageData | null> {
    if (!environment.production) {
      return null;
    }

    try {
      const dto = await firstValueFrom(
        this.http.get<InsightsPageDto>(`${environment.apiBaseUrl}/insights`),
      );
      return mapInsightsPageData(dto);
    } catch {
      return null;
    }
  }
}
