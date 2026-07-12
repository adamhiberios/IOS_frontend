import { type PagedResponse } from '@core/http';

/**
 * Wire shapes for the admin audit-log endpoint — mirror the backend
 * `audit-log-response.dto.ts` (`docs/backend-analysis.md` §6.10, §7.7).
 * `oldData`/`newData` arrive with sensitive keys (password, hash, token, secret,
 * refresh) already redacted server-side, regardless of caller role.
 */

/** One audit-log row (`AuditLogItemDto`). `id` is a serial integer. */
export interface AuditLogItemDto {
  readonly id: number;
  readonly actorId: string;
  /** `INSERT | UPDATE | DELETE` (backend-constrained). */
  readonly action: string;
  readonly tableName: string;
  readonly recordId: string | null;
  readonly oldData: Record<string, unknown> | null;
  readonly newData: Record<string, unknown> | null;
  readonly ipAddress: string | null;
  readonly createdAt: string;
}

/** `GET /admin/audit-logs` response — cursor-paginated, newest-first. */
export type AuditLogListResponseDto = PagedResponse<AuditLogItemDto>;
