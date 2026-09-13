/**
 * Frontend domain model for the admin gated-download leads list (IDD-267).
 *
 * RBAC (backend-enforced; the UI only hides actions):
 *   - list / read / update status + notes → support_admin, learning_admin
 *   - delete (GDPR hard erasure)          → learning_admin
 *   - super_admin bypasses all.
 */

/**
 * Follow-up workflow (`ResourceDownloadStatus`). A download is a marketing
 * lead, so the useful states track follow-up: `new → contacted → converted`,
 * with `archived` / `spam` as side branches. `spam` keeps the row for
 * abuse-pattern review instead of deleting it.
 */
export const RESOURCE_DOWNLOAD_STATUSES = [
  'new',
  'contacted',
  'converted',
  'archived',
  'spam',
] as const;
export type ResourceDownloadStatus = (typeof RESOURCE_DOWNLOAD_STATUSES)[number];

/** True when `value` is a known download status. */
export function isResourceDownloadStatus(value: string): value is ResourceDownloadStatus {
  return (RESOURCE_DOWNLOAD_STATUSES as readonly string[]).includes(value);
}

/** Backend cap on `adminNotes` (`UpdateResourceDownloadDto`). */
export const ADMIN_NOTES_MAX_LENGTH = 2000;

/** A row in the leads list (no admin notes — the list stays light). */
export interface ResourceDownloadItem {
  readonly id: string;
  readonly resourceSlug: string;
  readonly fullName: string | null;
  readonly email: string;
  readonly country: string | null;
  readonly pageSlug: string | null;
  readonly status: ResourceDownloadStatus;
  readonly createdAt: string;
}

/** A full record, including the admin's follow-up notes. */
export interface ResourceDownloadDetail extends ResourceDownloadItem {
  readonly adminNotes: string | null;
  readonly locale: string | null;
  /** sha256 of the visitor's IP — for abuse triage only. */
  readonly ipHash: string | null;
  readonly userAgent: string | null;
  readonly updatedAt: string;
}

/** Optional server-side filter for the leads list. */
export interface ResourceDownloadFilters {
  readonly status?: ResourceDownloadStatus;
}

/** The admin's editable follow-up state. At least one field must be set. */
export interface ResourceDownloadPatch {
  readonly status?: ResourceDownloadStatus;
  /** `null` clears the notes. */
  readonly adminNotes?: string | null;
}
