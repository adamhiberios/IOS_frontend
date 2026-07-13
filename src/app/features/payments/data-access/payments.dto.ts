import { type PagedResponse } from '@core/http';

/**
 * Wire shapes for the student payment endpoints — mirror the backend
 * `payment.controller.ts` / `payment.service.ts` return shapes exactly
 * (`docs/backend-analysis.md`). Checkout/retake return **bare** discriminated
 * objects (`free`); transactions is a `{ data, meta.pagination }` list. The
 * client never sends an amount — the charge is recomputed server-side.
 */

/** `POST /payments/checkout` body. */
export interface CreateCheckoutDto {
  readonly certId: string;
  readonly promoCode?: string;
}

/** `POST /payments/retake` body (no promo — fixed retake fee). */
export interface CreateRetakeDto {
  readonly certId: string;
}

/** Non-zero charge → redirect the browser to Stripe Checkout. */
export interface PaidCheckoutDto {
  readonly free: false;
  readonly amount: number;
  readonly currency: string;
  /** Stripe-hosted checkout URL. Nullable per the Stripe session type. */
  readonly checkoutUrl: string | null;
  readonly sessionId: string;
}

/** $0 enrollment (full waiver) → enrolled immediately, no Stripe. */
export interface FreeEnrollmentDto {
  readonly free: true;
  readonly enrolled: true;
  readonly amount: number;
  readonly currency: string;
}

/** $0 retake → unlocked immediately, no Stripe. */
export interface FreeRetakeDto {
  readonly free: true;
  readonly unlocked: true;
  readonly amount: number;
  readonly currency: string;
}

/** `POST /payments/checkout` response — paid redirect or free enrollment. */
export type CheckoutResponseDto = PaidCheckoutDto | FreeEnrollmentDto;

/** `POST /payments/retake` response — paid redirect or free unlock. */
export type RetakeResponseDto = PaidCheckoutDto | FreeRetakeDto;

/** One transaction row (`listTransactions`). `amount` is a number, not a string. */
export interface TransactionItemDto {
  readonly transactionId: string;
  readonly certId: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: string;
  readonly createdAt: string;
}

/** `GET /payments/transactions` response — cursor-paginated, newest-first. */
export type TransactionsResponseDto = PagedResponse<TransactionItemDto>;
