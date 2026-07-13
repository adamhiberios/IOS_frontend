import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';
import { AppEventBus } from '@core/event-bus';

import { PaymentsApi } from './payments.api';
import {
  type CheckoutRequest,
  type CheckoutResult,
  type RetakeRequest,
  type Transaction,
} from './payments.model';

/** Page size for the transaction history (backend max is 50). */
const PAGE_LIMIT = 20;

/**
 * `PaymentsStore` — signal store for the student payment flows.
 *
 * Owns two concerns:
 *  - the **pay action** (`checkout` / `retake`) — returns a {@link CheckoutResult}
 *    the caller acts on (redirect to Stripe, or a $0 completion); the store only
 *    tracks pending/error, never navigates (that's the component's job).
 *  - the **transaction history** list — cursor-paginated, newest-first, same
 *    shape as the admin list stores (`load` / `loadMore`).
 *
 * Business logic lives here; components read signals and act on the returned
 * result. Clears on logout (root singleton) so no history survives the session.
 */
@Injectable({ providedIn: 'root' })
export class PaymentsStore {
  private readonly api = inject(PaymentsApi);
  private readonly lang = inject(LanguageService);
  private readonly bus = inject(AppEventBus);

  /* ── pay action state ── */
  private readonly _actionPending = signal(false);
  private readonly _actionError = signal<string | null>(null);

  /* ── transaction history state ── */
  private readonly _items = signal<readonly Transaction[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadingMore = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _nextCursor = signal<string | null>(null);
  private readonly _hasMore = signal(false);
  private readonly _loaded = signal(false);

  readonly actionPending = this._actionPending.asReadonly();
  readonly actionError = this._actionError.asReadonly();

  readonly transactions = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadingMore = this._loadingMore.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly isEmpty = computed(
    () => this._loaded() && this._error() === null && this._items().length === 0,
  );

  constructor() {
    this.bus
      .on('user.logged-out')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.clear());
  }

  /* ── actions ── */

  /**
   * Start an enrollment checkout. Returns the {@link CheckoutResult} on success
   * (the caller redirects to `checkoutUrl` for a paid charge, or shows the $0
   * "enrolled" outcome), or `null` on failure ({@link actionError} carries why).
   */
  async checkout(req: CheckoutRequest): Promise<CheckoutResult | null> {
    return this.runAction(() => this.api.checkout(req));
  }

  /** Start a retake-fee checkout. Same contract as {@link checkout}. */
  async retake(req: RetakeRequest): Promise<CheckoutResult | null> {
    return this.runAction(() => this.api.retake(req));
  }

  private async runAction(
    call: () => ReturnType<PaymentsApi['checkout']>,
  ): Promise<CheckoutResult | null> {
    if (this._actionPending()) return null;
    this._actionPending.set(true);
    this._actionError.set(null);
    try {
      return await firstValueFrom(call());
    } catch (err) {
      this._actionError.set(problemDetailMessage(err) ?? this.lang.t('payments.checkoutError'));
      return null;
    } finally {
      this._actionPending.set(false);
    }
  }

  /** Clear a lingering pay-action error (e.g. when reopening a checkout dialog). */
  clearActionError(): void {
    this._actionError.set(null);
  }

  /** Load the first page of the caller's transaction history (replaces the list). */
  async load(): Promise<void> {
    await this.fetch(false);
  }

  /** Append the next keyset page of transactions, if any. */
  async loadMore(): Promise<void> {
    if (this._loadingMore() || !this._hasMore() || this._nextCursor() === null) return;
    await this.fetch(true);
  }

  private async fetch(append: boolean): Promise<void> {
    if (append) this._loadingMore.set(true);
    else this._loading.set(true);
    this._error.set(null);
    try {
      const page = await firstValueFrom(
        this.api.listTransactions({
          cursor: append ? (this._nextCursor() ?? undefined) : undefined,
          limit: PAGE_LIMIT,
        }),
      );
      this._items.update((current) => (append ? [...current, ...page.items] : [...page.items]));
      this._nextCursor.set(page.nextCursor);
      this._hasMore.set(page.hasMore);
      this._loaded.set(true);
    } catch (err) {
      this._error.set(problemDetailMessage(err) ?? this.lang.t('payments.transactionsError'));
    } finally {
      this._loading.set(false);
      this._loadingMore.set(false);
    }
  }

  /** Wipe all payment state — invoked on logout. */
  private clear(): void {
    this._actionPending.set(false);
    this._actionError.set(null);
    this._items.set([]);
    this._loading.set(false);
    this._loadingMore.set(false);
    this._error.set(null);
    this._nextCursor.set(null);
    this._hasMore.set(false);
    this._loaded.set(false);
  }
}
