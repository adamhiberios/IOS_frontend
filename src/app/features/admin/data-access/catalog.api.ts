import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { type Page, toHttpParams, toPage } from '@core/http';
import { environment } from '@env/environment';

import { type CatalogListResponseDto } from './catalog.dto';
import { toAdminCertificate } from './catalog.mappers';
import { type AdminCertificate, type CatalogListQuery } from './catalog.model';

/**
 * Admin catalog transport — `GET /admin/catalog` (list, incl. inactive).
 * Requires `content_creator` or `learning_admin` (super_admin bypass); the
 * backend enforces this and returns 403 otherwise (see backend-analysis §6.3).
 *
 * Mutations (create/update/soft-delete) are added alongside the catalog
 * create/edit pages, one page at a time.
 */
@Injectable({ providedIn: 'root' })
export class AdminCatalogApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/catalog`;

  list(query: CatalogListQuery = {}): Observable<Page<AdminCertificate>> {
    const params = toHttpParams({
      search: query.search,
      program_code: query.programCode,
      active: query.active,
      cursor: query.cursor,
      limit: query.limit,
      sort: query.sort,
    });
    return this.http
      .get<CatalogListResponseDto>(this.base, { params })
      .pipe(map((res) => toPage(res, toAdminCertificate)));
  }
}
