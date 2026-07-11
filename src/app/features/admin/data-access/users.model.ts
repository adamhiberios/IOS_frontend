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
