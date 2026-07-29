import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { type CursorQuery, type Page, toHttpParams, toPage } from '@core/http';
import { environment } from '@env/environment';

import {
  type ContactDeleteResponseDto,
  type ContactDetailResponseDto,
  type ContactListResponseDto,
  type UpdateContactStatusBody,
} from './contact.dto';
import { toContactDetail, toContactItem } from './contact.mappers';
import {
  type ContactDetail,
  type ContactFilters,
  type ContactItem,
} from './contact.model';

/** Query for the contact inbox: status filter + cursor paging. */
export type ContactQuery = ContactFilters & CursorQuery;

/**
 * Admin contact-inbox transport (CMS-ADMIN / plan Slice 10). Envelopes vary per
 * endpoint (BE-I-01) — the list is `{ data, meta }`, reads/updates are
 * `{ data }`, and the delete is **bare**. See `contact.dto.ts` for the route and
 * role map.
 */
@Injectable({ providedIn: 'root' })
export class AdminContactApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/contact`;

  /** `GET /admin/contact` — one keyset page, newest first. */
  list(query: ContactQuery = {}): Observable<Page<ContactItem>> {
    const params = toHttpParams({
      status: query.status,
      cursor: query.cursor,
      limit: query.limit,
    });
    return this.http
      .get<ContactListResponseDto>(this.base, { params })
      .pipe(map((res) => toPage(res, toContactItem)));
  }

  /** `GET /admin/contact/:id` — the full submission including the message. */
  getById(id: string): Observable<ContactDetail> {
    return this.http
      .get<ContactDetailResponseDto>(`${this.base}/${id}`)
      .pipe(map((res) => toContactDetail(res.data)));
  }

  /** `PATCH /admin/contact/:id` — triage status transition. */
  updateStatus(id: string, body: UpdateContactStatusBody): Observable<ContactDetail> {
    return this.http
      .patch<ContactDetailResponseDto>(`${this.base}/${id}`, body)
      .pipe(map((res) => toContactDetail(res.data)));
  }

  /**
   * `DELETE /admin/contact/:id` — **hard delete (GDPR erasure)**, learning_admin
   * only. There is no soft-delete and no undo: the submitter's email and message
   * are removed outright. Callers must confirm before invoking this.
   */
  remove(id: string): Observable<void> {
    return this.http
      .delete<ContactDeleteResponseDto>(`${this.base}/${id}`)
      .pipe(map(() => undefined));
  }
}
