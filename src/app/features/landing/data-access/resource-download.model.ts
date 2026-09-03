/**
 * Frontend domain model for the gated-download lead capture (landing feature).
 *
 * Backs the "Download Scrum Guide" form — the visitor trades a name and email
 * for the PDF, which the frontend serves from `/assets/docs/`.
 */

/** What the gated-download form collects before submitting. */
export interface ResourceDownloadPayload {
  readonly email: string;
  readonly fullName?: string;
  readonly country?: string;
  /** Which gated asset was requested; omitted falls back to the backend default. */
  readonly resourceSlug?: string;
  /** Slug of the page the form lives on, for attribution. */
  readonly pageSlug?: string;
  /** Honeypot value — must be left empty by real visitors. */
  readonly company?: string;
}
