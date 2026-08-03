/**
 * Frontend domain model for the public contact form (landing feature).
 *
 * Not to be confused with the admin inbox model
 * (`features/admin/data-access/contact.model.ts`), which reads back
 * submissions rather than creating them.
 */

/** What a contact-form component collects before submitting. */
export interface ContactSubmissionPayload {
  readonly name: string;
  readonly email: string;
  readonly subject?: string;
  readonly message: string;
  /** Slug of the CMS page the form lives on, for recipient routing. */
  readonly pageSlug?: string;
  /** Honeypot value — must be left empty by real visitors. */
  readonly company?: string;
}
