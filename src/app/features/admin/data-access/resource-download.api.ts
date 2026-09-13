import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { type CursorQuery, type Page, toHttpParams, toPage } from '@core/http';
import { environment } from '@env/environment';

import {
  type ResourceDownloadDeleteResponseDto,
  type ResourceDownloadDetailResponseDto,
  type ResourceDownloadListResponseDto,
  type UpdateResourceDownloadBody,
} from './resource-download.dto';
import { toResourceDownloadDetail, toResourceDownloadItem } from './resource-download.mappers';
import {
  type ResourceDownloadDetail,
  type ResourceDownloadFilters,
  type ResourceDownloadItem,
} from './resource-download.model';

/** Query for the leads list: status filter + cursor paging. */
export type ResourceDownloadQuery = ResourceDownloadFilters & CursorQuery;

/**
 * Admin gated-download leads transport (IDD-267). The list is `{ data, meta }`,
 * reads/updates are `{ data }`, and the delete is **bare**. See
 * `resource-download.dto.ts` for the route and role map.
 */
@Injectable({ providedIn: 'root' })
export class AdminResourceDownloadApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/resource-downloads`;

  /** `GET /admin/resource-downloads` — one keyset page, newest first. */
  list(query: ResourceDownloadQuery = {}): Observable<Page<ResourceDownloadItem>> {
    const params = toHttpParams({
      status: query.status,
      cursor: query.cursor,
      limit: query.limit,
    });
    return this.http
      .get<ResourceDownloadListResponseDto>(this.base, { params })
      .pipe(map((res) => toPage(res, toResourceDownloadItem)));
  }

  /** `GET /admin/resource-downloads/:id` — the full record including notes. */
  getById(id: string): Observable<ResourceDownloadDetail> {
    return this.http
      .get<ResourceDownloadDetailResponseDto>(`${this.base}/${id}`)
      .pipe(map((res) => toResourceDownloadDetail(res.data)));
  }

  /** `PATCH /admin/resource-downloads/:id` — status and/or notes. */
  update(id: string, body: UpdateResourceDownloadBody): Observable<ResourceDownloadDetail> {
    return this.http
      .patch<ResourceDownloadDetailResponseDto>(`${this.base}/${id}`, body)
      .pipe(map((res) => toResourceDownloadDetail(res.data)));
  }

  /**
   * `DELETE /admin/resource-downloads/:id` — **hard delete (GDPR erasure)**,
   * learning_admin only. No soft-delete and no undo. Callers must confirm first.
   */
  remove(id: string): Observable<void> {
    return this.http
      .delete<ResourceDownloadDeleteResponseDto>(`${this.base}/${id}`)
      .pipe(map(() => undefined));
  }
}
