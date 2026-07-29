/**
 * Wire shapes for the admin contact inbox (CMS-ADMIN / plan Slice 10, backend
 * `2976be0` → `7160f11`). Verified against `contact-admin.controller.ts:48-111`
 * and `contact-response.dto.ts` at backend HEAD `7160f11`.
 *
 *   GET    /admin/contact      → { data, meta.pagination }  (support_admin, learning_admin)
 *   GET    /admin/contact/:id  → { data }                   (support_admin, learning_admin)
 *   PATCH  /admin/contact/:id  → { data }                   (support_admin, learning_admin)
 *   DELETE /admin/contact/:id  → **bare** { id, deleted }   (learning_admin only)
 *
 * Envelopes vary again (BE-I-01): the list handler returns the service result
 * directly, the two single-row reads wrap in `{ data }`, and the delete returns
 * a bare object. `super_admin` satisfies every `@Roles` check.
 *
 * **`DELETE` is a hard delete, not a soft archive** — the whole point is GDPR
 * erasure of the submitter's email and free-text message. There is no undo.
 *
 * Honeypot rows are never stored, so they never appear in this list
 * (`contact.controller.ts` drops them at submit time).
 */

import { type PagedResponse } from '@core/http';

import { type ContactStatus } from './contact.model';

/** One row of the admin list — deliberately without the message body. */
export interface ContactItemDto {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly subject: string | null;
  /** The CMS page the form was submitted from, when the section supplied one. */
  readonly pageSlug: string | null;
  readonly status: ContactStatus;
  readonly createdAt: string;
}

/** `GET /admin/contact` — cursor page, `(created_at, id)` DESC. */
export type ContactListResponseDto = PagedResponse<ContactItemDto>;

/** `GET /admin/contact/:id` — the full submission. */
export interface ContactDetailDto extends ContactItemDto {
  readonly message: string;
  readonly locale: string | null;
  /** sha256 of the submitter's IP — never the raw address. */
  readonly ipHash: string | null;
  readonly userAgent: string | null;
  readonly updatedAt: string;
}

/** `{ data }` envelope shared by detail and status-update. */
export interface ContactDetailResponseDto {
  readonly data: ContactDetailDto;
}

/** `PATCH /admin/contact/:id` body. */
export interface UpdateContactStatusBody {
  readonly status: ContactStatus;
}

/** `DELETE /admin/contact/:id` — bare, no `{ data }` wrapper. */
export interface ContactDeleteResponseDto {
  readonly id: string;
  readonly deleted: boolean;
}
