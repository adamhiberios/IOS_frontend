import {
  type AccessCodeItemDto,
  type AttemptItemDto,
  type CertificateItemDto,
  type PurchaseItemDto,
  type StudentDetailDto,
  type UserItemDto,
} from './users.dto';
import {
  type AccessCode,
  type StudentAttempt,
  type StudentCertificate,
  type StudentDetail,
  type StudentListItem,
  type StudentPurchase,
} from './users.model';

function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

/** Map a wire `UserItemDto` to a `StudentListItem`. */
export function toStudentListItem(dto: UserItemDto): StudentListItem {
  return {
    id: dto.id,
    firstName: dto.firstName,
    lastName: dto.lastName,
    fullName: fullName(dto.firstName, dto.lastName),
    email: dto.email,
    emailVerified: dto.emailVerified,
    createdAt: dto.createdAt,
  };
}

/** Map a wire `CertificateItemDto` to a `StudentCertificate`. */
export function toStudentCertificate(dto: CertificateItemDto): StudentCertificate {
  return {
    id: dto.id,
    certId: dto.certId,
    certificateId: dto.certificateId,
    examAttemptId: dto.examAttemptId,
    certificateUrl: dto.s3Url,
    qrUrl: dto.qrUrl,
    isActive: dto.isActive,
    issuedAt: dto.issuedAt,
  };
}

/** Map a wire `PurchaseItemDto` to a `StudentPurchase`. */
export function toStudentPurchase(dto: PurchaseItemDto): StudentPurchase {
  return {
    id: dto.id,
    certId: dto.certId,
    paymentType: dto.paymentType,
    preExamConfirmed: dto.preExamConfirmed,
    examCompleted: dto.examCompleted,
    createdAt: dto.createdAt,
  };
}

/** Map a wire `StudentDetailDto` to a `StudentDetail`. */
export function toStudentDetail(dto: StudentDetailDto): StudentDetail {
  return {
    id: dto.id,
    firstName: dto.firstName,
    lastName: dto.lastName,
    fullName: fullName(dto.firstName, dto.lastName),
    email: dto.email,
    emailVerified: dto.emailVerified,
    locale: dto.locale,
    country: dto.country,
    createdAt: dto.createdAt,
    counts: {
      purchases: dto.counts.purchases,
      attempts: dto.counts.attempts,
      certificatesEarned: dto.counts.certificatesEarned,
    },
    certificates: dto.certificates.map(toStudentCertificate),
    attempts: dto.attempts.map(toStudentAttempt),
    exams: {
      assigned: dto.exams.assigned.map(toAccessCode),
      purchases: dto.exams.purchases.map(toStudentPurchase),
    },
  };
}

/** Map a wire `AttemptItemDto` to a `StudentAttempt`. */
export function toStudentAttempt(dto: AttemptItemDto): StudentAttempt {
  return {
    id: dto.id,
    examId: dto.examId,
    certId: dto.certId,
    score: dto.score,
    passed: dto.passed,
    status: dto.status,
    lateFlag: dto.lateFlag,
    startedAt: dto.startedAt,
    submittedAt: dto.submittedAt,
    durationSeconds: dto.durationSeconds,
  };
}

/** Map a wire `AccessCodeItemDto` to an `AccessCode`. */
export function toAccessCode(dto: AccessCodeItemDto): AccessCode {
  return {
    id: dto.id,
    examId: dto.examId,
    certId: dto.certId,
    expiresAt: dto.expiresAt,
    usedAt: dto.usedAt,
    status: dto.status,
  };
}
