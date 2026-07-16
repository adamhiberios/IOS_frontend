/**
 * Frontend domain model for the admin issued-certificates list + revoke
 * (BE-I-15 / B2). Mirrors `issued-certs.dto.ts`.
 */

export const ISSUED_CERT_STATUSES = ['valid', 'revoked'] as const;
export type IssuedCertStatus = (typeof ISSUED_CERT_STATUSES)[number];

/** True when `value` is a known issued-certificate status. */
export function isIssuedCertStatus(value: string): value is IssuedCertStatus {
  return (ISSUED_CERT_STATUSES as readonly string[]).includes(value);
}

export interface IssuedCertificate {
  /** Internal id — passed to the revoke call. */
  readonly id: string;
  /** Public serial; null until minted. */
  readonly certId: string | null;
  readonly userId: string;
  readonly studentName: string;
  readonly program: string;
  readonly programCode: string;
  readonly issuedAt: string;
  readonly status: IssuedCertStatus;
}

/** Optional server-side filters the endpoint accepts (both are UUIDs). */
export interface IssuedCertFilters {
  readonly userId?: string;
  readonly certId?: string;
}

/** Outcome of a revoke call. */
export interface RevokeResult {
  readonly certId: string;
  readonly isActive: boolean;
  /** `true` when this call performed the revoke; `false` when already revoked. */
  readonly revoked: boolean;
}
