/**
 * Payments domain types.
 *
 * The checkout/retake endpoints return a discriminated result the UI acts on:
 * either redirect to Stripe, or (for a $0 charge) the enrollment/unlock already
 * happened server-side. `Transaction` is the history-row model.
 */

/** Request to enroll in (buy) a certificate. */
export interface CheckoutRequest {
  readonly certId: string;
  readonly promoCode?: string;
}

/** Request to pay the retake fee for a certificate's exam. */
export interface RetakeRequest {
  readonly certId: string;
}

/**
 * Unified outcome of a checkout/retake call:
 *  - `redirect`  — a non-zero charge; send the browser to `checkoutUrl` (Stripe).
 *  - `enrolled`  — a $0 enrollment completed server-side (no redirect).
 *  - `unlocked`  — a $0 retake completed server-side (no redirect).
 */
export type CheckoutResult =
  | {
      readonly status: 'redirect';
      readonly checkoutUrl: string | null;
      readonly amount: number;
      readonly currency: string;
      readonly sessionId: string;
    }
  | { readonly status: 'enrolled'; readonly amount: number; readonly currency: string }
  | { readonly status: 'unlocked'; readonly amount: number; readonly currency: string };

/**
 * Known transaction statuses. Kept as a `string` on {@link Transaction} because
 * the backend types the column loosely; the union + guard are for the UI.
 */
export const TRANSACTION_STATUSES = ['pending', 'completed', 'failed', 'refunded'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export function isTransactionStatus(value: string): value is TransactionStatus {
  return (TRANSACTION_STATUSES as readonly string[]).includes(value);
}

/** A single transaction in the caller's history. */
export interface Transaction {
  readonly id: string;
  readonly certId: string;
  /** Charge amount as a number (e.g. 149). */
  readonly amount: number;
  readonly currency: string;
  /** Raw backend status (see {@link TransactionStatus}). */
  readonly status: string;
  readonly createdAt: string;
}

/** Query for `GET /payments/transactions`. */
export interface TransactionsQuery {
  readonly cursor?: string;
  readonly limit?: number;
}
