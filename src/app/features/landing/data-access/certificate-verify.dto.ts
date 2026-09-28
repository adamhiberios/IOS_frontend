/**
 * Wire shape of the public certificate check (backend `CertificateVerifyController`).
 *
 *   GET /verify/:certId   (@Public, no auth)
 *
 * The body is NOT wrapped in `{ data }`. 200 for a known certificate — valid
 * or revoked; 404 for an unknown ID. The same URL serves an HTML page to
 * browsers (QR scans), so the request must not ask for `text/html` —
 * HttpClient's default `Accept` gets JSON.
 */
export interface CertificateVerificationDto {
  /** Public certificate ID, e.g. `IOS-ESM-2026-000123`. */
  readonly certId: string;
  readonly studentName: string;
  /** Full programme title, e.g. "Endorsed Scrum Master". */
  readonly program: string;
  /** Short code, e.g. "ESM-P". */
  readonly programCode: string;
  /** `YYYY-MM-DD`. */
  readonly issueDate: string;
  readonly status: 'valid' | 'revoked';
  readonly isActive: boolean;
  readonly certificateUrl: string | null;
  readonly verifyUrl: string;
}
