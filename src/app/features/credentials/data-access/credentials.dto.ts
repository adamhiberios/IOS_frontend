/**
 * Wire shapes for the student "earned credentials" endpoint (BE-I-16 / A3).
 * Mirror the backend JSON exactly. `GET /me/certificates` returns the
 * **`{ data: [...] }`** envelope (no pagination) — see
 * `docs/backend-analysis.md` "Endpoints added 2026-07-13".
 */

/** Lifecycle of an issued certificate. */
export type EarnedCertificateStatusDto = 'valid' | 'revoked';

/**
 * One earned certificate. `certId` is the public credential id (e.g. `IOS-…`)
 * and is **nullable** — a freshly-issued row may not have one yet. The three URL
 * fields depend on that public id, so they are nullable too (a credential with
 * no public id has nothing to download / scan / verify).
 */
export interface EarnedCertificateDto {
  readonly certId: string | null;
  readonly program: string;
  readonly programCode: string;
  readonly issuedAt: string;
  readonly status: EarnedCertificateStatusDto;
  readonly certificateUrl: string | null;
  readonly qrUrl: string | null;
  readonly verifyUrl: string | null;
}

/** `GET /me/certificates` response envelope — `{ data }`, no pagination. */
export interface EarnedCertificatesResponseDto {
  readonly data: readonly EarnedCertificateDto[];
}
