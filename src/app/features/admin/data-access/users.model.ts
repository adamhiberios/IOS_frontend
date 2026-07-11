/** Frontend domain models for admin student oversight. */

export interface StudentCounts {
  readonly purchases: number;
  readonly attempts: number;
  readonly certificatesEarned: number;
}

/** A student as shown in the list. */
export interface StudentListItem {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly createdAt: string;
}

/** A student's detail view (profile slice + activity counts). */
export interface StudentDetail {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly locale: string;
  readonly country: string | null;
  readonly createdAt: string;
  readonly counts: StudentCounts;
}

/** Query for `GET /admin/users`. Mirrors the backend `ListUsersQueryDto`. */
export interface UsersListQuery {
  readonly search?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

/** One exam attempt in a student's history. */
export interface StudentAttempt {
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

export type AccessCodeStatus = 'used' | 'expired' | 'active';

/** One issued exam access code for a student. */
export interface AccessCode {
  readonly id: string;
  readonly examId: string;
  readonly certId: string;
  readonly expiresAt: string;
  readonly usedAt: string | null;
  readonly status: AccessCodeStatus;
}
