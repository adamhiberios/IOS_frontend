import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { type CursorQuery, type Page, toHttpParams, toPage } from '@core/http';
import { environment } from '@env/environment';

import {
  type IssuedCertificatesResponseDto,
  type ReinstateResultDto,
  type RevokeResultDto,
} from './issued-certs.dto';
import { toIssuedCertificate, toReinstateResult, toRevokeResult } from './issued-certs.mappers';
import {
  type IssuedCertFilters,
  type IssuedCertificate,
  type ReinstateResult,
  type RevokeResult,
} from './issued-certs.model';

/** Query for the issued list: the two backend filters + cursor paging. */
export type IssuedCertsQuery = IssuedCertFilters & CursorQuery;

/**
 * Admin issued-certificates transport (BE-I-15 / B2).
 *
 *   GET   /admin/certs/issued  — cursor-paginated, newest-first (super/learning admin)
 *   PATCH /admin/certs/issued/:id/revoke — idempotent soft-revoke (404 if unknown)
 *   PATCH /admin/certs/issued/:id/reinstate — idempotent undo of a revoke (404 if unknown)
 */
@Injectable({ providedIn: 'root' })
export class AdminIssuedCertsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/certs/issued`;

  /** `GET /admin/certs/issued` — one keyset page of issued certificates. */
  list(query: IssuedCertsQuery = {}): Observable<Page<IssuedCertificate>> {
    const params = toHttpParams({
      userId: query.userId,
      certId: query.certId,
      cursor: query.cursor,
      limit: query.limit,
    });
    return this.http
      .get<IssuedCertificatesResponseDto>(this.base, { params })
      .pipe(map((res) => toPage(res, toIssuedCertificate)));
  }

  /** `PATCH /admin/certs/issued/:id/revoke` — revoke an issued certificate. */
  revoke(id: string): Observable<RevokeResult> {
    return this.http
      .patch<RevokeResultDto>(`${this.base}/${id}/revoke`, {})
      .pipe(map(toRevokeResult));
  }

  /** `PATCH /admin/certs/issued/:id/reinstate` — undo a revoke. */
  reinstate(id: string): Observable<ReinstateResult> {
    return this.http
      .patch<ReinstateResultDto>(`${this.base}/${id}/reinstate`, {})
      .pipe(map(toReinstateResult));
  }
}
