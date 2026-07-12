/** Frontend domain model for admin audit logs (`GET /admin/audit-logs`). */

/** The three actions the backend records. */
export const AUDIT_ACTIONS = ['INSERT', 'UPDATE', 'DELETE'] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** True when `value` is one of the known audit actions. */
export function isAuditAction(value: string): value is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(value);
}

/**
 * One audit-log entry as rendered by the admin UI. Kept close to the wire shape
 * (this is a raw activity log); `action` stays a `string` because the backend
 * types it loosely — {@link isAuditAction} narrows it for display.
 */
export interface AuditLogEntry {
  readonly id: number;
  readonly actorId: string;
  readonly action: string;
  readonly tableName: string;
  readonly recordId: string | null;
  readonly oldData: Record<string, unknown> | null;
  readonly newData: Record<string, unknown> | null;
  readonly ipAddress: string | null;
  readonly createdAt: string;
}

/** Filter fields for the audit-log list. Mirrors the backend `AuditLogQueryDto`. */
export interface AuditLogFilters {
  readonly tableName?: string;
  readonly actorId?: string;
  readonly recordId?: string;
  readonly action?: AuditAction;
}

/** Full query for `GET /admin/audit-logs` (filters + cursor pagination). */
export interface AuditLogQuery extends AuditLogFilters {
  readonly cursor?: string;
  readonly limit?: number;
}
