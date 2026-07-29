import { type PagedResponse } from '@core/http';

/**
 * Wire shapes for the admin catalog endpoints — mirror the backend
 * `catalog-response.dto.ts` / `catalog-query.dto.ts` exactly
 * (`docs/backend-analysis.md` §6.3, §7.2). Names match the JSON on the wire.
 */

/** One certificate row (`CatalogItemDto`). `price` is a decimal string, e.g. "49.00". */
export interface CatalogItemDto {
  readonly id: string;
  readonly programCode: string;
  readonly title: string;
  readonly description: string | null;
  readonly price: string;
  readonly currency: string;
  readonly thumbnailUrl: string | null;
  readonly active: boolean;
  // Catalog-card metadata (BE-I-04) — all nullable.
  readonly badgeImageUrl: string | null;
  readonly track: string | null;
  readonly level: string | null;
  readonly durationHours: number | null;
  readonly syllabusUrl: string | null;
  readonly locale: string;
  readonly direction: 'ltr' | 'rtl';
  readonly fallbackUsed: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** `GET /admin/catalog` response — list envelope with `locale` + pagination meta. */
export type CatalogListResponseDto = PagedResponse<CatalogItemDto, { locale: string }>;

/** One certificate for the admin detail view (`CatalogDetailDto`) — includes raw translations. */
export interface CatalogDetailDto extends CatalogItemDto {
  readonly translations?: Record<string, Record<string, string>>;
}

/** `GET /admin/catalog/:id` response. */
export interface CatalogDetailResponseDto {
  readonly data: CatalogDetailDto;
  readonly meta: { readonly locale: string };
}

/**
 * `POST /admin/catalog/:id/image-upload-url` (backend `66a7632`, narrows
 * BE-I-27) — request a short-lived presigned PUT so the browser uploads the
 * badge / thumbnail straight to object storage, bypassing the API for the bytes.
 * **Bare** response, no `{ data }` envelope (`catalog-admin.controller.ts:112`).
 *
 * Flow, mirroring the A1 avatar precedent (`242a11d`):
 *   1. POST here → `{ uploadUrl, requiredHeaders, key, publicUrl }`
 *   2. PUT the bytes to `uploadUrl` **echoing every `requiredHeaders` entry** —
 *      the presigned signature covers `Content-Type` *and* `x-amz-acl`, so
 *      dropping either fails the upload (or leaves the object unreadable).
 *   3. `PATCH /admin/catalog/:id` with `publicUrl` as `badgeImageUrl` /
 *      `thumbnailUrl`. Note this differs from the avatar flow, which persists
 *      the `key`; here the backend hands back a permanent public URL because the
 *      certificates bucket is public-read.
 *
 * 400 on an unsupported image/content type, 404 when the certificate is unknown
 * — which is why uploading is only possible **after** the certificate exists.
 */
export interface CertificateImageUploadUrlRequestDto {
  readonly imageType: string;
  readonly contentType: string;
}

export interface CertificateImageUploadUrlResponseDto {
  readonly uploadUrl: string;
  /** Must all be sent verbatim on the PUT (`Content-Type`, `x-amz-acl`). */
  readonly requiredHeaders: Readonly<Record<string, string>>;
  readonly key: string;
  /** Permanent public URL to persist on the certificate. */
  readonly publicUrl: string;
  readonly expiresInSeconds: number;
}
