import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { type CursorQuery, type Page, toHttpParams, toPage } from '@core/http';
import { environment } from '@env/environment';

import {
  type AccessCodesListResponseDto,
  type AttemptsListResponseDto,
  type RevokeCodeResponseDto,
  type StudentDetailResponseDto,
  type UsersListResponseDto,
} from './users.dto';
import {
  toAccessCode,
  toStudentAttempt,
  toStudentDetail,
  toStudentListItem,
} from './users.mappers';
import {
  type AccessCode,
  type StudentAttempt,
  type StudentDetail,
  type StudentListItem,
  type UsersListQuery,
} from './users.model';

/**
 * Admin student-oversight transport.
 *
 *   GET /admin/users        — list/search students (learning_admin, support_admin)
 *   GET /admin/users/:id    — student detail + activity counts
 *
 * The backend enforces the roles and never returns PII/hashes. Attempts,
 * access codes and revoke land alongside those UI pieces, one step at a time.
 */
@Injectable({ providedIn: 'root' })
export class AdminUsersApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/users`;

  list(query: UsersListQuery = {}): Observable<Page<StudentListItem>> {
    const params = toHttpParams({
      search: query.search,
      cursor: query.cursor,
      limit: query.limit,
    });
    return this.http
      .get<UsersListResponseDto>(this.base, { params })
      .pipe(map((res) => toPage(res, toStudentListItem)));
  }

  getDetail(userId: string): Observable<StudentDetail> {
    return this.http
      .get<StudentDetailResponseDto>(`${this.base}/${userId}`)
      .pipe(map((res) => toStudentDetail(res.data)));
  }

  /** `GET /admin/users/:userId/attempts` — exam-attempt history (no answers). */
  getAttempts(userId: string, query: CursorQuery = {}): Observable<Page<StudentAttempt>> {
    const params = toHttpParams({ cursor: query.cursor, limit: query.limit });
    return this.http
      .get<AttemptsListResponseDto>(`${this.base}/${userId}/attempts`, { params })
      .pipe(map((res) => toPage(res, toStudentAttempt)));
  }

  /** `GET /admin/users/:userId/access-codes` — issued access codes (derived status). */
  getAccessCodes(userId: string, query: CursorQuery = {}): Observable<Page<AccessCode>> {
    const params = toHttpParams({ cursor: query.cursor, limit: query.limit });
    return this.http
      .get<AccessCodesListResponseDto>(`${this.base}/${userId}/access-codes`, { params })
      .pipe(map((res) => toPage(res, toAccessCode)));
  }

  /**
   * `POST /admin/users/:userId/access-codes/:codeId/revoke` — revoke an UNUSED
   * code (learning_admin only). 404 if not found, 409 if already used.
   */
  revokeAccessCode(userId: string, codeId: string): Observable<void> {
    return this.http
      .post<RevokeCodeResponseDto>(`${this.base}/${userId}/access-codes/${codeId}/revoke`, {})
      .pipe(map(() => undefined));
  }
}
