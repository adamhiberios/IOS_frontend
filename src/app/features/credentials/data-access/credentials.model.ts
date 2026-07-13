/**
 * Credentials feature domain types — the student's earned certificates
 * (BE-I-16 / A3). Flat frontend model mirroring `credentials.dto.ts`; nullable
 * fields stay nullable so the UI can hide the action a credential can't offer
 * (e.g. no download link on a row without a public id).
 */

/** Lifecycle of an issued certificate. */
export const EARNED_CERTIFICATE_STATUSES = ['valid', 'revoked'] as const;
export type EarnedCertificateStatus = (typeof EARNED_CERTIFICATE_STATUSES)[number];

/** Narrow an arbitrary status string to a known {@link EarnedCertificateStatus}. */
export function isEarnedCertificateStatus(value: string): value is EarnedCertificateStatus {
  return (EARNED_CERTIFICATE_STATUSES as readonly string[]).includes(value);
}

/**
 * A certificate the student has earned. `certId` is the public credential id
 * (`IOS-…`); `certificateUrl` / `qrUrl` / `verifyUrl` are the downloadable PDF,
 * the QR image, and the public verification page respectively — any may be
 * `null` (a row without a public id has no verifiable artefacts yet).
 */
export interface EarnedCertificate {
  readonly certId: string | null;
  readonly program: string;
  readonly programCode: string;
  /** ISO-8601 issue timestamp. */
  readonly issuedAt: string;
  readonly status: EarnedCertificateStatus;
  readonly certificateUrl: string | null;
  readonly qrUrl: string | null;
  readonly verifyUrl: string | null;
}
