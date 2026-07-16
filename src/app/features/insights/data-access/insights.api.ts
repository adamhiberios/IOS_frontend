/**
 * InsightsApi — HTTP client for the public "insights" blog content.
 *
 * ── Current state ─────────────────────────────────────────────────────────
 * There is **no backend for blog posts**. The `GET /insights` path is now the
 * **student learning-analytics** endpoint (BE-I-20a / A5 — see
 * `features/dashboard/data-access/insights.*`), a different domain and student-only.
 * So `getPosts()` always returns `null`, which makes `InsightsStore` fall back
 * to the static marketing content. Do NOT point this at `/insights` — that would
 * fire a doomed (and, for signed-out visitors, unauthorized) request.
 *
 * ── When a real blog API exists ───────────────────────────────────────────
 * Wire it to that dedicated endpoint (NOT `/insights`) and map via
 * `mapInsightsPageData`.
 */

import { Injectable } from '@angular/core';

import type { InsightsPageData } from './insights.model';

@Injectable({ providedIn: 'root' })
export class InsightsApi {
  getPosts(): Promise<InsightsPageData | null> {
    // No blog backend — the store uses its static fallback. See the class note.
    return Promise.resolve(null);
  }
}
