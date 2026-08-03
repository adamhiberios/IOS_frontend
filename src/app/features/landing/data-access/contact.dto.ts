/**
 * Wire shapes for the public contact form — `POST /contact` (`@Public()`,
 * throttled 3/60s by default). Source of truth: `IOS_Backend`
 * `modules/contact/dto/create-contact-submission.dto.ts` +
 * `contact-response.dto.ts`. See `docs/reference/backend/cms-blog-contact.md`.
 *
 * The response is deliberately uniform — any 201 means success, a filled
 * honeypot (`company`) is silently dropped server-side, and a mail failure
 * never fails the request.
 */

/** `POST /contact` request body. */
export interface SubmitContactRequest {
  readonly name: string;
  readonly email: string;
  readonly subject?: string;
  readonly message: string;
  /** Slug of the CMS page the form was submitted from. */
  readonly pageSlug?: string;
  /** Honeypot — must stay empty for real visitors. */
  readonly company?: string;
}

/** `POST /contact` response — `{ data: { received: true } }`. */
export interface SubmitContactResponse {
  readonly data: { readonly received: true };
}
