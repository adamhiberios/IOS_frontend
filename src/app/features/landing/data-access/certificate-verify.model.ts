import { type CertFamily } from '@shared';

/** A certificate found by the public check (IDD-258). */
export interface CertificateVerification {
  readonly certId: string;
  readonly holderName: string;
  readonly program: string;
  readonly programCode: string;
  readonly issueDate: string;
  readonly valid: boolean;
  /** Drives the result card's tint. */
  readonly family: CertFamily;
  readonly badgeAsset: string;
}

/**
 *   idle      — nothing checked yet
 *   checking  — request in flight
 *   found     — the ID belongs to a certificate (valid or revoked)
 *   not-found — no certificate has this ID
 *   error     — the check itself failed (network / server)
 */
export type VerifyStatus = 'idle' | 'checking' | 'found' | 'not-found' | 'error';
