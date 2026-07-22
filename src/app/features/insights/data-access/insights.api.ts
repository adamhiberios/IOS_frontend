/**
 * InsightsApi — HTTP transport for the public blog (`BE-I-11`, backend `334d0c6`).
 *
 * Talks to the two `@Public()` endpoints:
 *   - `GET /blog`        — cursor-paginated list of published articles
 *   - `GET /blog/:slug`  — one published article (404 for draft/archived/unknown)
 *
 * Both are localized by `X-Lang` (added by `localeInterceptor`); the resolved
 * locale echoed in the response (`meta.locale` / `dto.locale`) is used to format
 * dates so the card date matches the served content locale. See
 * `docs/backend-analysis.md` → "Blog endpoints (BE-I-11)".
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { type Page, toHttpParams, toPage } from '@core/http';
import { environment } from '@env/environment';

import { type BlogDetailResponseDto, type BlogListResponseDto } from './insights.dto';
import { toInsightDetail, toInsightPost } from './insights.mappers';
import { type InsightDetailPost, type InsightPost } from './insights.model';

/** Query for the cursor-paginated blog list. `search` matches the English title. */
export interface BlogListQuery {
  readonly search?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

@Injectable({ providedIn: 'root' })
export class InsightsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/blog`;

  /** `GET /blog` — cursor-paginated published articles (published_at DESC). */
  list(query: BlogListQuery = {}): Observable<Page<InsightPost>> {
    const params = toHttpParams({
      search: query.search,
      cursor: query.cursor,
      limit: query.limit,
    });
    return this.http
      .get<BlogListResponseDto>(this.base, { params })
      .pipe(map((res) => toPage(res, (dto) => toInsightPost(dto, res.meta.locale))));
  }

  /** `GET /blog/:slug` — one published article (404 for draft/archived/unknown). */
  getBySlug(slug: string): Observable<InsightDetailPost> {
    return this.http
      .get<BlogDetailResponseDto>(`${this.base}/${encodeURIComponent(slug)}`)
      .pipe(map((res) => toInsightDetail(res.data, res.meta.locale)));
  }
}
