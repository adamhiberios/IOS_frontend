import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { type CursorQuery, type Page, toHttpParams, toPage } from '@core/http';
import { environment } from '@env/environment';

import {
  type CreateStaffBody,
  type StaffDetailResponseDto,
  type StaffListResponseDto,
  type UpdateStaffBody,
} from './staff.dto';
import { toStaffMember } from './staff.mappers';
import { type StaffFilters, type StaffMember } from './staff.model';

/** Query for the staff list: the backend filters + cursor paging. */
export type StaffQuery = StaffFilters & CursorQuery;

/**
 * Admin staff transport (BE-I-03 / B3). All routes are **super_admin only**
 * (backend-enforced). Create/detail/update/deactivate return `{ data }`; the
 * list returns `{ data, meta.pagination }` (cursor, newest-first).
 */
@Injectable({ providedIn: 'root' })
export class AdminStaffApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/staff`;

  /** `GET /admin/staff` — one keyset page of staff accounts. */
  list(query: StaffQuery = {}): Observable<Page<StaffMember>> {
    const params = toHttpParams({
      search: query.search,
      role: query.role,
      active: query.active,
      cursor: query.cursor,
      limit: query.limit,
    });
    return this.http
      .get<StaffListResponseDto>(this.base, { params })
      .pipe(map((res) => toPage(res, toStaffMember)));
  }

  /** `GET /admin/staff/:id` — one staff account (safe projection). */
  getOne(id: string): Observable<StaffMember> {
    return this.http
      .get<StaffDetailResponseDto>(`${this.base}/${id}`)
      .pipe(map((res) => toStaffMember(res.data)));
  }

  /** `POST /admin/staff` — create a staff account. */
  create(body: CreateStaffBody): Observable<StaffMember> {
    return this.http
      .post<StaffDetailResponseDto>(this.base, body)
      .pipe(map((res) => toStaffMember(res.data)));
  }

  /** `PATCH /admin/staff/:id` — update a staff account (partial). */
  update(id: string, body: UpdateStaffBody): Observable<StaffMember> {
    return this.http
      .patch<StaffDetailResponseDto>(`${this.base}/${id}`, body)
      .pipe(map((res) => toStaffMember(res.data)));
  }

  /** `POST /admin/staff/:id/deactivate` — soft off-switch (idempotent). */
  deactivate(id: string): Observable<StaffMember> {
    return this.http
      .post<StaffDetailResponseDto>(`${this.base}/${id}/deactivate`, {})
      .pipe(map((res) => toStaffMember(res.data)));
  }
}
