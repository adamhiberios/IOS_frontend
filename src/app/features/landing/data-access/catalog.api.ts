import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { type Page, toHttpParams, toPage } from '@core/http';
import { environment } from '@env/environment';

import {
  type CatalogDetailResponseDto,
  type CatalogListResponseDto,
  type OutlineResponseDto,
} from './catalog.dto';
import { toCourseOutline, toPublicCertificate, toPublicCertificateDetail } from './catalog.mappers';
import {
  type CatalogListQuery,
  type CourseOutline,
  type PublicCertificate,
  type PublicCertificateDetail,
} from './catalog.model';

/**
 * Public catalog transport — `@Controller('catalog')` (no auth). Active
 * certificates only; titles/descriptions arrive resolved into the requested
 * locale (`X-Lang` via `localeInterceptor`), with English fallback. See
 * `docs/backend-analysis.md` §6.3.
 */
@Injectable({ providedIn: 'root' })
export class PublicCatalogApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/catalog`;

  /** `GET /catalog` — cursor-paginated list of active certificates. */
  list(query: CatalogListQuery = {}): Observable<Page<PublicCertificate>> {
    const params = toHttpParams({
      search: query.search,
      program_code: query.programCode,
      cursor: query.cursor,
      limit: query.limit,
      sort: query.sort,
    });
    return this.http
      .get<CatalogListResponseDto>(this.base, { params })
      .pipe(map((res) => toPage(res, toPublicCertificate)));
  }

  /**
   * `GET /catalog/:id` — one active certificate (404 if inactive/unknown),
   * including the `seo` block (title/description/canonical/JSON-LD) that the
   * list endpoint omits. No current page calls this — see
   * `docs/implementation-progress.md` task 13.
   */
  getById(id: string): Observable<PublicCertificateDetail> {
    return this.http
      .get<CatalogDetailResponseDto>(`${this.base}/${id}`)
      .pipe(map((res) => toPublicCertificateDetail(res.data)));
  }

  /** `GET /catalog/:id/outline` — public curriculum outline (titles only). */
  getOutline(id: string): Observable<CourseOutline> {
    return this.http
      .get<OutlineResponseDto>(`${this.base}/${id}/outline`)
      .pipe(map(toCourseOutline));
  }
}
