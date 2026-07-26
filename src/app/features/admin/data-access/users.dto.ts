import { type PagedResponse } from '@core/http';

/**
 * Wire shapes for the admin users (student oversight) endpoints — mirror the
 * backend `users-response.dto.ts` / `student-detail-response.dto.ts`
 * (`docs/backend-analysis.md` §6.9, §7.7). Never includes password hashes or
 * token columns — the backend strips them.
 */

/** One student row in the list (`UserItemDto`). */
export interface UserItemDto {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly createdAt: string;
}

/** `GET /admin/users` response — cursor-paginated list. */
export type UsersListResponseDto = PagedResponse<UserItemDto>;

/** Activity tallies shown on the detail view (`StudentCountsDto`). */
export interface StudentCountsDto {
  readonly purchases: number;
  readonly attempts: number;
  readonly certificatesEarned: number;
}

/** One earned certificate (`CertificateItemDto`). */
export interface CertificateItemDto {
  readonly id: string;
  /** Public serial (`IOS-…`), null if not yet assigned. */
  readonly certId: string | null;
  readonly certificateId: string;
  readonly examAttemptId: string;
  readonly s3Url: string | null;
  readonly qrUrl: string | null;
  readonly isActive: boolean;
  readonly issuedAt: string;
}

/** One purchase / enrollment record (`PurchaseItemDto`). */
export interface PurchaseItemDto {
  readonly id: string;
  readonly certId: string;
  readonly paymentType: string;
  readonly preExamConfirmed: boolean;
  readonly examCompleted: boolean;
  readonly createdAt: string;
}

/** Exams block on the detail response (`StudentExamsBlockDto`). */
export interface StudentExamsBlockDto {
  /** Exams assigned to the student (issued access codes). */
  readonly assigned: readonly AccessCodeItemDto[];
  /** Programs the student has purchased (enrollments + retakes). */
  readonly purchases: readonly PurchaseItemDto[];
}

/** Student detail projection (`StudentDetailDto`). */
export interface StudentDetailDto {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly locale: string;
  readonly country: string | null;
  readonly createdAt: string;
  readonly counts: StudentCountsDto;
  /** Earned certificates (most recent first, capped at 100). */
  readonly certificates: readonly CertificateItemDto[];
  /** Exam attempts (most recent first, capped at 100). */
  readonly attempts: readonly AttemptItemDto[];
  readonly exams: StudentExamsBlockDto;
}

/** `GET /admin/users/:userId` response. */
export interface StudentDetailResponseDto {
  readonly data: StudentDetailDto;
}

/** One exam attempt (`AttemptItemDto`). No answer snapshot is returned. */
export interface AttemptItemDto {
  readonly id: string;
  readonly examId: string;
  readonly certId: string;
  readonly score: number;
  readonly passed: boolean;
  readonly status: string;
  readonly lateFlag: boolean;
  readonly startedAt: string;
  readonly submittedAt: string;
  readonly durationSeconds: number | null;
}

/** `GET /admin/users/:userId/attempts` response. */
export type AttemptsListResponseDto = PagedResponse<AttemptItemDto>;

/** One issued access code (`AccessCodeItemDto`). `tokenHash` is never returned. */
export interface AccessCodeItemDto {
  readonly id: string;
  readonly examId: string;
  readonly certId: string;
  readonly expiresAt: string;
  readonly usedAt: string | null;
  readonly status: 'used' | 'expired' | 'active';
}

/** `GET /admin/users/:userId/access-codes` response. */
export type AccessCodesListResponseDto = PagedResponse<AccessCodeItemDto>;

/** `POST /admin/users/:userId/access-codes/:codeId/revoke` response. */
export interface RevokeCodeResponseDto {
  readonly data: { readonly revoked: true };
}
