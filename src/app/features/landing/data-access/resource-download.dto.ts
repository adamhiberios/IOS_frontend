/**
 * Wire shapes for the gated-download lead capture — `POST /resource-downloads`
 * (`@Public()`, throttled 5/60s by default). Source of truth: `IOS_Backend`
 * `modules/resource-download/dto/create-resource-download.dto.ts` +
 * `resource-download-response.dto.ts`.
 *
 * The backend records *who* asked for a gated asset; it never serves the file
 * itself. The frontend hosts the PDF and hands it over once the capture
 * returns 201.
 *
 * The response is deliberately uniform — any 201 means success, and a filled
 * honeypot (`company`) is silently dropped server-side with no row stored.
 */

/** `POST /resource-downloads` request body. */
export interface SubmitResourceDownloadRequest {
  readonly email: string;
  readonly fullName?: string;
  readonly country?: string;
  /** Which gated asset was requested. Defaults to `scrum-guide` server-side. */
  readonly resourceSlug?: string;
  /** Slug of the page the form was submitted from, for attribution. */
  readonly pageSlug?: string;
  /** Honeypot — must stay empty for real visitors. */
  readonly company?: string;
}

/** `POST /resource-downloads` response — `{ data: { received: true } }`. */
export interface SubmitResourceDownloadResponse {
  readonly data: { readonly received: true };
}
