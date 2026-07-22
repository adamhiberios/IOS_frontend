/**
 * Wire shapes for the self-service GDPR account endpoints (BE-042 / A2), both on
 * `@Controller('me')` (student token only). Mirror the backend JSON exactly.
 *
 *  - `GET  /me/export` — streams a JSON attachment (read as a Blob; no typed DTO).
 *  - `POST /me/delete` `{ password }` — anonymize-in-place; returns the summary
 *    below. Wrong password → 401.
 */

/** Request body for `POST /me/delete` (step-up re-auth). */
export interface DeleteAccountRequestDto {
  readonly password: string;
}

/** `POST /me/delete` success body — the account is anonymized, not hard-deleted. */
export interface DeleteAccountResultDto {
  readonly deleted: true;
  /** Record classes preserved for legal reasons (e.g. certificates, transactions). */
  readonly retained: readonly string[];
  readonly note: string;
}
