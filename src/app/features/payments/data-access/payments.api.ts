import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { type Page, toHttpParams, toPage } from '@core/http';
import { environment } from '@env/environment';

import {
  type CheckoutResponseDto,
  type RetakeResponseDto,
  type TransactionsResponseDto,
} from './payments.dto';
import { toCheckoutResult, toRetakeResult, toTransaction } from './payments.mappers';
import {
  type CheckoutRequest,
  type CheckoutResult,
  type RetakeRequest,
  type Transaction,
  type TransactionsQuery,
} from './payments.model';

/**
 * Student payment transport — `@Controller('payments')` (student token only).
 * The charge is always recomputed server-side; the client never sends an
 * amount. Checkout/retake return a discriminated result (redirect vs. $0
 * completed); transactions is a cursor-paginated, RLS-scoped list. See
 * `docs/backend-analysis.md` §6.
 */
@Injectable({ providedIn: 'root' })
export class PaymentsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/payments`;

  /** `POST /payments/checkout` — enroll (Stripe redirect, or $0 immediate enroll). */
  checkout(req: CheckoutRequest): Observable<CheckoutResult> {
    return this.http
      .post<CheckoutResponseDto>(`${this.base}/checkout`, {
        certId: req.certId,
        promoCode: req.promoCode,
      })
      .pipe(map(toCheckoutResult));
  }

  /** `POST /payments/retake` — pay the retake fee (Stripe redirect, or $0 unlock). */
  retake(req: RetakeRequest): Observable<CheckoutResult> {
    return this.http
      .post<RetakeResponseDto>(`${this.base}/retake`, { certId: req.certId })
      .pipe(map(toRetakeResult));
  }

  /** `GET /payments/transactions` — the caller's own history (cursor, newest-first). */
  listTransactions(query: TransactionsQuery = {}): Observable<Page<Transaction>> {
    const params = toHttpParams({ cursor: query.cursor, limit: query.limit });
    return this.http
      .get<TransactionsResponseDto>(`${this.base}/transactions`, { params })
      .pipe(map((res) => toPage(res, toTransaction)));
  }
}
