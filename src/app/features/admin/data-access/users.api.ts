import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { type Page, toHttpParams, toPage } from '@core/http';
import { environment } from '@env/environment';

import { type StudentDetailResponseDto, type UsersListResponseDto } from './users.dto';
import { toStudentDetail, toStudentListItem } from './users.mappers';
import { type StudentDetail, type StudentListItem, type UsersListQuery } from './users.model';

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
}
