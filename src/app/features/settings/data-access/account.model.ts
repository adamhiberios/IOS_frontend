/**
 * Domain model for the self-service GDPR account actions (BE-042 / A2).
 * Mirrors `account.dto.ts`.
 */

/** Outcome of `POST /me/delete` — the account is anonymized-in-place. */
export interface DeleteAccountResult {
  readonly deleted: true;
  /** Record classes preserved for legal reasons (certificates, transactions, …). */
  readonly retained: readonly string[];
  readonly note: string;
}
