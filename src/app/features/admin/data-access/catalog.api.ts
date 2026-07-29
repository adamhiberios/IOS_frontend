import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { type Page, toHttpParams, toPage } from '@core/http';
import { environment } from '@env/environment';

import {
  type CatalogDetailResponseDto,
  type CatalogListResponseDto,
  type CertificateImageUploadUrlRequestDto,
  type CertificateImageUploadUrlResponseDto,
} from './catalog.dto';
import {
  toAdminCertificate,
  toAdminCertificateDetail,
  toCertificateImageUploadTarget,
} from './catalog.mappers';
import {
  type AdminCertificate,
  type AdminCertificateDetail,
  type CatalogListQuery,
  type CertificateImageContentType,
  type CertificateImageType,
  type CertificateImageUploadTarget,
  type CertificateTranslationsPayload,
  type CertificateWritePayload,
} from './catalog.model';

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
  /**
   * An interceptor-free client for the object-storage PUT only — see
   * {@link uploadImageBytes}. Same idiom as the A1 avatar upload (`242a11d`).
   */
  private readonly rawHttp = new HttpClient(inject(HttpBackend));
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

  /** `GET /admin/catalog/:id` — one certificate (incl. inactive + raw translations). */
  getById(id: string): Observable<AdminCertificateDetail> {
    return this.http
      .get<CatalogDetailResponseDto>(`${this.base}/${id}`)
      .pipe(map((res) => toAdminCertificateDetail(res.data)));
  }

  /** `POST /admin/catalog` — create a certificate (content_creator / learning_admin). */
  create(payload: CertificateWritePayload): Observable<void> {
    return this.http.post<void>(this.base, payload);
  }

  /** `PATCH /admin/catalog/:id` — partial update (content_creator / learning_admin). */
  update(id: string, payload: Partial<CertificateWritePayload>): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}`, payload);
  }

  /**
   * `PATCH /admin/catalog/:id/translations` — replace per-locale translations
   * (content_creator / learning_admin). Each supplied locale is replaced; pass
   * `{}` for a locale to clear it. English is the canonical title/description
   * (edited via the main form) and is not sent here.
   */
  updateTranslations(id: string, payload: CertificateTranslationsPayload): Observable<void> {
    return this.http
      .patch<void>(`${this.base}/${id}/translations`, payload)
      .pipe(map(() => undefined));
  }

  /** `DELETE /admin/catalog/:id` — soft-delete / deactivate (learning_admin only). */
  softDelete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /* ─── Image upload (BE-I-27, narrowed by backend `66a7632`) ─── */

  /**
   * `POST /admin/catalog/:id/image-upload-url` — ask for a short-lived presigned
   * PUT target. **Bare** response (no `{ data }`). Goes through the normal API
   * client, so it carries the bearer token.
   *
   * **404 when the certificate does not exist yet** — uploading is therefore only
   * possible on an existing certificate, not while creating one.
   */
  requestImageUploadUrl(
    certId: string,
    imageType: CertificateImageType,
    contentType: CertificateImageContentType,
  ): Observable<CertificateImageUploadTarget> {
    return this.http
      .post<CertificateImageUploadUrlResponseDto>(`${this.base}/${certId}/image-upload-url`, {
        imageType,
        contentType,
      } satisfies CertificateImageUploadUrlRequestDto)
      .pipe(map(toCertificateImageUploadTarget));
  }

  /**
   * PUT the raw bytes to the presigned storage URL. Uses {@link rawHttp} so the
   * whole interceptor chain is bypassed: no `Authorization`, no `X-Lang`, and no
   * refresh cookie is ever sent to the storage host, and no extra header
   * invalidates the presigned signature.
   *
   * Every `requiredHeaders` entry is echoed verbatim — the signature covers
   * `x-amz-acl: public-read` as well as `Content-Type`, so omitting it fails the
   * upload rather than merely making the object private. `responseType: 'text'`
   * avoids a JSON-parse error on the empty/XML storage response.
   */
  uploadImageBytes(target: CertificateImageUploadTarget, file: Blob): Observable<void> {
    return this.rawHttp
      .put(target.uploadUrl, file, {
        headers: { ...target.requiredHeaders },
        responseType: 'text',
      })
      .pipe(map(() => undefined));
  }
}
