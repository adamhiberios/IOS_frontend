import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { type CursorQuery, type Page, toHttpParams, toPage } from '@core/http';
import { environment } from '@env/environment';

import {
  type CreatePromoBody,
  type PromoDetailResponseDto,
  type PromoListResponseDto,
  type UpdatePromoBody,
} from './promo.dto';
import { toPromoCode } from './promo.mappers';
import { type PromoCode, type PromoFilters } from './promo.model';

/** Query for the promo list: the backend filters + cursor paging. */
export type PromoQuery = PromoFilters & CursorQuery;

/**
 * Admin promo-code transport (BE-I-05 / B4).
 *
 *   GET    /admin/promo-codes  — cursor list (super/finance/support admin)
 *   POST   /admin/promo-codes  — create (super/finance admin; 409 dup code)
 *   PATCH  /admin/promo-codes/:id — update (super/finance; code immutable)
 *   DELETE /admin/promo-codes/:id — soft-delete → active=false (super/finance)
 */
@Injectable({ providedIn: 'root' })
export class AdminPromoApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/promo-codes`;

  /** `GET /admin/promo-codes` — one keyset page. */
  list(query: PromoQuery = {}): Observable<Page<PromoCode>> {
    const params = toHttpParams({
      active: query.active,
      expired: query.expired,
      cursor: query.cursor,
      limit: query.limit,
    });
    return this.http
      .get<PromoListResponseDto>(this.base, { params })
      .pipe(map((res) => toPage(res, toPromoCode)));
  }

  /** `POST /admin/promo-codes` — create a promo. */
  create(body: CreatePromoBody): Observable<PromoCode> {
    return this.http
      .post<PromoDetailResponseDto>(this.base, body)
      .pipe(map((res) => toPromoCode(res.data)));
  }

  /** `PATCH /admin/promo-codes/:id` — update a promo (partial). */
  update(id: string, body: UpdatePromoBody): Observable<PromoCode> {
    return this.http
      .patch<PromoDetailResponseDto>(`${this.base}/${id}`, body)
      .pipe(map((res) => toPromoCode(res.data)));
  }

  /** `DELETE /admin/promo-codes/:id` — retire (soft-delete, active=false). */
  retire(id: string): Observable<PromoCode> {
    return this.http
      .delete<PromoDetailResponseDto>(`${this.base}/${id}`)
      .pipe(map((res) => toPromoCode(res.data)));
  }
}
