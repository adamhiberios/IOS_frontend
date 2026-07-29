/**
 * Frontend domain model for the admin contact inbox (CMS-ADMIN / plan Slice 10).
 *
 * RBAC (backend-enforced; the UI only hides actions):
 *   - list / read / update status → support_admin, learning_admin
 *   - delete (GDPR hard erasure)  → learning_admin
 *   - super_admin bypasses all.
 */

/**
 * Triage workflow (`ContactStatus`). `spam` exists so an admin can flag a
 * submission the honeypot missed **without deleting it** — the row is kept for
 * abuse-pattern review, which is why it is a status rather than a delete.
 */
export const CONTACT_STATUSES = ['new', 'read', 'archived', 'spam'] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

/** True when `value` is a known submission status. */
export function isContactStatus(value: string): value is ContactStatus {
  return (CONTACT_STATUSES as readonly string[]).includes(value);
}

/** A row in the inbox list (no message body — the list stays light). */
export interface ContactItem {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly subject: string | null;
  readonly pageSlug: string | null;
  readonly status: ContactStatus;
  readonly createdAt: string;
}

/** A full submission, including the free-text message. */
export interface ContactDetail extends ContactItem {
  readonly message: string;
  readonly locale: string | null;
  /** sha256 of the submitter's IP — shown truncated, for abuse triage only. */
  readonly ipHash: string | null;
  readonly userAgent: string | null;
  readonly updatedAt: string;
}

/** Optional server-side filter for the inbox list. */
export interface ContactFilters {
  readonly status?: ContactStatus;
}

/**
 * The statuses an admin can move a submission to from its current one. `new` is
 * the backend's initial state and is not offered as a manual target — nothing
 * is gained by marking a read submission unread, and the backend has no
 * "unread" concept to keep in step with.
 */
export function nextStatusesFor(current: ContactStatus): readonly ContactStatus[] {
  return CONTACT_STATUSES.filter((s) => s !== current && s !== 'new');
}
