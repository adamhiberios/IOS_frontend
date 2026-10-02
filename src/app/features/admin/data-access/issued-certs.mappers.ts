import {
  type IssuedCertificateItemDto,
  type ReinstateResultDto,
  type RevokeResultDto,
} from './issued-certs.dto';
import {
  type IssuedCertificate,
  type ReinstateResult,
  type RevokeResult,
  isIssuedCertStatus,
} from './issued-certs.model';

/**
 * Map an issued-certificate DTO to the domain model. An unrecognised status is
 * treated as `revoked` (fail closed — never present an unknown cert as valid).
 */
export function toIssuedCertificate(dto: IssuedCertificateItemDto): IssuedCertificate {
  return {
    id: dto.id,
    certId: dto.certId,
    userId: dto.userId,
    studentName: dto.studentName,
    program: dto.program,
    programCode: dto.programCode,
    issuedAt: dto.issuedAt,
    status: isIssuedCertStatus(dto.status) ? dto.status : 'revoked',
  };
}

export function toRevokeResult(dto: RevokeResultDto): RevokeResult {
  return {
    certId: dto.certId,
    isActive: dto.isActive,
    revoked: dto.revoked,
  };
}

export function toReinstateResult(dto: ReinstateResultDto): ReinstateResult {
  return {
    certId: dto.certId,
    isActive: dto.isActive,
    reinstated: dto.reinstated,
  };
}
