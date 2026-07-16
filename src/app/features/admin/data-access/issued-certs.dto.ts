/**
 * Wire shapes for the admin issued-certificates list + revoke (BE-I-15 / B2).
 *
 *   GET   /admin/certs/issued?userId&certId&cursor&limit → { data, meta.pagination }
 *   PATCH /admin/certs/issued/:id/revoke                  → bare RevokeResult
 *
 * super_admin / learning_admin only (backend-enforced). The list — unlike the
 * student view — exposes the internal `id` needed for the revoke call.
 */

import { type PagedResponse } from '@core/http';

/** One issued certificate row on the admin list. */
export interface IssuedCertificateItemDto {
  /** Internal issued-certificate id — pass this to the revoke call. */
  readonly id: string;
  /** Public serial (e.g. `IOS-PSM-2026-000123`); null until minted. */
  readonly certId: string | null;
  readonly userId: string;
  readonly studentName: string;
  readonly program: string;
  readonly programCode: string;
  /** Issue date, `YYYY-MM-DD`. */
  readonly issuedAt: string;
  readonly status: 'valid' | 'revoked';
}

/** `{ data, meta.pagination }` envelope for the issued list. */
export type IssuedCertificatesResponseDto = PagedResponse<IssuedCertificateItemDto>;

/** Bare result of `PATCH …/revoke` (idempotent). */
export interface RevokeResultDto {
  readonly certId: string;
  readonly isActive: boolean;
  /** `true` when this call performed the revoke; `false` when already revoked. */
  readonly revoked: boolean;
}
