import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { type CursorQuery, type Page, toHttpParams, toPage } from '@core/http';
import { environment } from '@env/environment';

import {
  type BlogAdminDetailDto,
  type BlogAdminDetailResponseDto,
  type BlogAdminListResponseDto,
  type CreateBlogBody,
  type UpdateBlogBody,
  type UpdateBlogTranslationsBody,
} from './blog.dto';
import { toBlogAdminDetail, toBlogAdminItem } from './blog.mappers';
import { type BlogAdminDetail, type BlogAdminItem, type BlogFilters } from './blog.model';

/** Query for the admin blog list: backend filters + cursor paging. */
export type BlogAdminQuery = BlogFilters & CursorQuery;

/**
 * Admin blog transport (BE-I-11 / BLOG-ADMIN). Envelopes vary per endpoint:
 * the list is `{ data, meta }`, GET-one is **bare**, and every write returns
 * `{ data }`. See `blog.dto.ts` for the full route/role map.
 */
@Injectable({ providedIn: 'root' })
export class AdminBlogApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/blog`;

  /** `GET /admin/blog` — one keyset page (all statuses). */
  list(query: BlogAdminQuery = {}): Observable<Page<BlogAdminItem>> {
    const params = toHttpParams({
      status: query.status,
      search: query.search,
      cursor: query.cursor,
      limit: query.limit,
    });
    return this.http
      .get<BlogAdminListResponseDto>(this.base, { params })
      .pipe(map((res) => toPage(res, toBlogAdminItem)));
  }

  /** `GET /admin/blog/:id` — bare authoring detail (body + translations). */
  getById(id: string): Observable<BlogAdminDetail> {
    return this.http.get<BlogAdminDetailDto>(`${this.base}/${id}`).pipe(map(toBlogAdminDetail));
  }

  /** `POST /admin/blog` — create a draft. */
  create(body: CreateBlogBody): Observable<BlogAdminDetail> {
    return this.http
      .post<BlogAdminDetailResponseDto>(this.base, body)
      .pipe(map((res) => toBlogAdminDetail(res.data)));
  }

  /** `PATCH /admin/blog/:id` — update English fields + slug. */
  update(id: string, body: UpdateBlogBody): Observable<BlogAdminDetail> {
    return this.http
      .patch<BlogAdminDetailResponseDto>(`${this.base}/${id}`, body)
      .pipe(map((res) => toBlogAdminDetail(res.data)));
  }

  /** `PATCH /admin/blog/:id/translations` — per-locale replace-merge. */
  updateTranslations(id: string, body: UpdateBlogTranslationsBody): Observable<BlogAdminDetail> {
    return this.http
      .patch<BlogAdminDetailResponseDto>(`${this.base}/${id}/translations`, body)
      .pipe(map((res) => toBlogAdminDetail(res.data)));
  }

  /** `POST /admin/blog/:id/publish` — draft/archived → published (409 with reasons). */
  publish(id: string): Observable<BlogAdminDetail> {
    return this.http
      .post<BlogAdminDetailResponseDto>(`${this.base}/${id}/publish`, {})
      .pipe(map((res) => toBlogAdminDetail(res.data)));
  }

  /** `POST /admin/blog/:id/unpublish` — published → draft. */
  unpublish(id: string): Observable<BlogAdminDetail> {
    return this.http
      .post<BlogAdminDetailResponseDto>(`${this.base}/${id}/unpublish`, {})
      .pipe(map((res) => toBlogAdminDetail(res.data)));
  }

  /** `DELETE /admin/blog/:id` — soft-delete (archive). */
  remove(id: string): Observable<void> {
    return this.http.delete<unknown>(`${this.base}/${id}`).pipe(map(() => undefined));
  }
}
