import { type EarnedCertificateDto } from './credentials.dto';
import {
  type EarnedCertificate,
  type EarnedCertificateStatus,
  isEarnedCertificateStatus,
} from './credentials.model';

/**
 * Map a wire `EarnedCertificateDto` to the frontend {@link EarnedCertificate}.
 * `status` is guarded — an unrecognised value degrades to `revoked` so an
 * unknown state never renders as a valid, downloadable credential.
 */
export function toEarnedCertificate(dto: EarnedCertificateDto): EarnedCertificate {
  const status: EarnedCertificateStatus = isEarnedCertificateStatus(dto.status)
    ? dto.status
    : 'revoked';
  return {
    certId: dto.certId,
    program: dto.program,
    programCode: dto.programCode,
    issuedAt: dto.issuedAt,
    status,
    certificateUrl: dto.certificateUrl,
    qrUrl: dto.qrUrl,
    verifyUrl: dto.verifyUrl,
  };
}
