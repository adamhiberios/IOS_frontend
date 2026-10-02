import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { type CursorQuery, type Page, toHttpParams, toPage } from '@core/http';
import { environment } from '@env/environment';

import {
  type BlogAdminDetailDto,
  type BlogAdminDetailResponseDto,
  type BlogAdminListResponseDto,
  type BlogCoverUploadUrlRequestDto,
  type BlogCoverUploadUrlResponseDto,
  type CreateBlogBody,
  type UpdateBlogBody,
  type UpdateBlogTranslationsBody,
} from './blog.dto';
import { toBlogAdminDetail, toBlogAdminItem, toBlogCoverUploadTarget } from './blog.mappers';
import {
  type BlogAdminDetail,
  type BlogAdminItem,
  type BlogCoverContentType,
  type BlogCoverUploadTarget,
  type BlogFilters,
} from './blog.model';

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
  /**
   * An interceptor-free client for the object-storage PUT only — see
   * {@link uploadCoverBytes}. Same idiom as the catalog image upload.
   */
  private readonly rawHttp = new HttpClient(inject(HttpBackend));
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

  /**
   * `DELETE /admin/blog/:id/permanent` — hard delete of a draft or archived
   * article (learning_admin). 409 `RESOURCE_STILL_ACTIVE` while published.
   */
  permanentDelete(id: string): Observable<void> {
    return this.http.delete<unknown>(`${this.base}/${id}/permanent`).pipe(map(() => undefined));
  }

  /* ─── Cover photo upload (IDD-384 / IDD-387) ─── */

  /**
   * `POST /admin/blog/:id/cover-upload-url` — short-lived presigned PUT target.
   * **Bare** response (no `{ data }`). 404 until the article exists, so a cover
   * can only be added once the draft has been saved.
   */
  requestCoverUploadUrl(
    id: string,
    contentType: BlogCoverContentType,
  ): Observable<BlogCoverUploadTarget> {
    return this.http
      .post<BlogCoverUploadUrlResponseDto>(`${this.base}/${id}/cover-upload-url`, {
        contentType,
      } satisfies BlogCoverUploadUrlRequestDto)
      .pipe(map(toBlogCoverUploadTarget));
  }

  /**
   * PUT the raw bytes to the presigned storage URL via {@link rawHttp}, so no
   * `Authorization` / `X-Lang` / refresh cookie reaches the storage host and no
   * extra header breaks the signature. Every `requiredHeaders` entry is echoed
   * verbatim; `responseType: 'text'` avoids parsing the empty/XML reply.
   */
  uploadCoverBytes(target: BlogCoverUploadTarget, file: Blob): Observable<void> {
    return this.rawHttp
      .put(target.uploadUrl, file, {
        headers: { ...target.requiredHeaders },
        responseType: 'text',
      })
      .pipe(map(() => undefined));
  }
}
