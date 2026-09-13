/**
 * Wire shapes for the admin gated-download leads list (IDD-267, backend
 * `10fa7b0`). Verified against `resource-download-admin.controller.ts` and
 * `resource-download-response.dto.ts`.
 *
 *   GET    /admin/resource-downloads      → { data, meta.pagination }  (support_admin, learning_admin)
 *   GET    /admin/resource-downloads/:id  → { data }                   (support_admin, learning_admin)
 *   PATCH  /admin/resource-downloads/:id  → { data }                   (support_admin, learning_admin)
 *   DELETE /admin/resource-downloads/:id  → **bare** { id, deleted }   (learning_admin only)
 *
 * Same envelope split and role map as `/admin/contact`. `super_admin`
 * satisfies every `@Roles` check.
 *
 * **`DELETE` is a hard delete** — GDPR erasure of the visitor's email, name and
 * country. There is no undo. One row per download event: a repeat visitor
 * appears more than once. Honeypot-dropped captures are never stored.
 */

import { type PagedResponse } from '@core/http';

import { type ResourceDownloadStatus } from './resource-download.model';

/** One row of the admin list — no admin notes (the list stays light). */
export interface ResourceDownloadItemDto {
  readonly id: string;
  readonly resourceSlug: string;
  readonly fullName: string | null;
  readonly email: string;
  /** Free-text English country name (e.g. "Canada"), not an ISO code. */
  readonly country: string | null;
  readonly pageSlug: string | null;
  readonly status: ResourceDownloadStatus;
  readonly createdAt: string;
}

/** `GET /admin/resource-downloads` — cursor page, `(created_at, id)` DESC. */
export type ResourceDownloadListResponseDto = PagedResponse<ResourceDownloadItemDto>;

/** `GET /admin/resource-downloads/:id` — the full record. */
export interface ResourceDownloadDetailDto extends ResourceDownloadItemDto {
  readonly adminNotes: string | null;
  readonly locale: string | null;
  /** sha256 of the visitor's IP — never the raw address. */
  readonly ipHash: string | null;
  readonly userAgent: string | null;
  readonly updatedAt: string;
}

/** `{ data }` envelope shared by detail and update. */
export interface ResourceDownloadDetailResponseDto {
  readonly data: ResourceDownloadDetailDto;
}

/**
 * `PATCH /admin/resource-downloads/:id` body. Both fields optional, but the
 * backend rejects an empty patch with a 400. `adminNotes: null` clears the
 * notes (max 2000 chars). The visitor's own data is not editable.
 */
export interface UpdateResourceDownloadBody {
  readonly status?: ResourceDownloadStatus;
  readonly adminNotes?: string | null;
}

/** `DELETE /admin/resource-downloads/:id` — bare, no `{ data }` wrapper. */
export interface ResourceDownloadDeleteResponseDto {
  readonly id: string;
  readonly deleted: boolean;
}
