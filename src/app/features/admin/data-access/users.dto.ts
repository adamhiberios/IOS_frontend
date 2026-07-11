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
}

/** `GET /admin/users/:userId` response. */
export interface StudentDetailResponseDto {
  readonly data: StudentDetailDto;
}
