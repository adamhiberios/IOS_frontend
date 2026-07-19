import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { AppEventBus } from '@core/event-bus';
import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { AdminCatalogApi } from './catalog.api';
import { AdminPromoApi } from './promo.api';
import { toCreatePromoBody, toUpdatePromoBody } from './promo.mappers';
import {
  type CreatePromoPayload,
  type PromoCode,
  type PromoFilters,
  type UpdatePromoPayload,
} from './promo.model';

/** Page size for the promo list (backend max is 100). */
const PAGE_LIMIT = 50;
/** Certs offered in the applicable-certs picker (backend max page size). */
const CERT_PICKER_LIMIT = 100;

/** A certificate option for the applicable-certs picker. */
export interface PromoCertOption {
  readonly id: string;
  readonly label: string;
}

/**
 * Signal store for admin promo-code management (BE-I-05 / B4).
 *
 * Cursor-paginated, newest-first, with `active` / `expired` filters. Owns
 * create / update / retire (soft-delete) / reactivate actions and the certificate
 * options for the "applies to" picker. Cleared on `user.logged-out`.
 */
@Injectable({ providedIn: 'root' })
export class AdminPromoStore {
  private readonly api = inject(AdminPromoApi);
  private readonly catalog = inject(AdminCatalogApi);
  private readonly lang = inject(LanguageService);
  private readonly bus = inject(AppEventBus);

  constructor() {
    this.bus
      .on('user.logged-out')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.clear());
  }

  private readonly _items = signal<readonly PromoCode[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadingMore = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _nextCursor = signal<string | null>(null);
  private readonly _hasMore = signal(false);
  private readonly _filters = signal<PromoFilters>({});
  private readonly _loaded = signal(false);
  private readonly _actionPendingId = signal<string | null>(null);
  private readonly _actionError = signal<string | null>(null);

  private readonly _certs = signal<readonly PromoCertOption[]>([]);
  private readonly _certsLoading = signal(false);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadingMore = this._loadingMore.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly actionPendingId = this._actionPendingId.asReadonly();
  readonly actionError = this._actionError.asReadonly();
  readonly certs = this._certs.asReadonly();
  readonly certsLoading = this._certsLoading.asReadonly();
  readonly isEmpty = computed(
    () => !this._loading() && this._error() === null && this._items().length === 0,
  );

  /** Load the first page (once) unless `force`d. */
  async load(force = false): Promise<void> {
    if (!force && this._loaded()) return;
    await this.fetch(false);
  }

  /** Append the next keyset page, if any. */
  async loadMore(): Promise<void> {
    if (this._loadingMore() || !this._hasMore() || this._nextCursor() === null) return;
    await this.fetch(true);
  }

  /** Replace the filter set and reload from page 1. No-ops when unchanged. */
  async setFilters(next: PromoFilters): Promise<void> {
    if (filtersEqual(next, this._filters())) return;
    this._filters.set(next);
    await this.fetch(false);
  }

  /** Load the active-cert options for the applicable-certs picker. */
  async loadCerts(): Promise<void> {
    if (this._certsLoading() || this._certs().length > 0) return;
    this._certsLoading.set(true);
    try {
      const page = await firstValueFrom(
        this.catalog.list({ active: true, limit: CERT_PICKER_LIMIT }),
      );
      this._certs.set(
        page.items.map((c) => ({ id: c.id, label: `${c.title} (${c.programCode})` })),
      );
    } catch {
      this._certs.set([]);
    } finally {
      this._certsLoading.set(false);
    }
  }

  // ── Mutations ────────────────────────────────────────────────────────────

  async create(payload: CreatePromoPayload): Promise<boolean> {
    return this.runAction('new', () => firstValueFrom(this.api.create(toCreatePromoBody(payload))));
  }

  async update(id: string, payload: UpdatePromoPayload): Promise<boolean> {
    return this.runAction(id, () =>
      firstValueFrom(this.api.update(id, toUpdatePromoBody(payload))),
    );
  }

  /** Retire a promo (soft-delete via DELETE → active=false). */
  async retire(id: string): Promise<boolean> {
    return this.runAction(id, () => firstValueFrom(this.api.retire(id)));
  }

  /** Reactivate a retired promo (`PATCH { active: true }`). */
  async reactivate(id: string): Promise<boolean> {
    return this.runAction(id, () => firstValueFrom(this.api.update(id, { active: true })));
  }

  clearActionError(): void {
    this._actionError.set(null);
  }

  private async runAction(pendingKey: string, action: () => Promise<unknown>): Promise<boolean> {
    if (this._actionPendingId() !== null) return false;
    this._actionPendingId.set(pendingKey);
    this._actionError.set(null);
    try {
      await action();
      await this.fetch(false);
      return true;
    } catch (err) {
      this._actionError.set(problemDetailMessage(err) ?? this.lang.t('admin.promo.saveError'));
      return false;
    } finally {
      this._actionPendingId.set(null);
    }
  }

  private async fetch(append: boolean): Promise<void> {
    if (append) {
      this._loadingMore.set(true);
    } else {
      this._loading.set(true);
    }
    this._error.set(null);

    try {
      const page = await firstValueFrom(
        this.api.list({
          ...this._filters(),
          cursor: append ? (this._nextCursor() ?? undefined) : undefined,
          limit: PAGE_LIMIT,
        }),
      );
      this._items.update((current) => (append ? [...current, ...page.items] : [...page.items]));
      this._nextCursor.set(page.nextCursor);
      this._hasMore.set(page.hasMore);
      this._loaded.set(true);
    } catch (err) {
      this._error.set(problemDetailMessage(err) ?? this.lang.t('admin.promo.error'));
    } finally {
      this._loading.set(false);
      this._loadingMore.set(false);
    }
  }

  private clear(): void {
    this._items.set([]);
    this._error.set(null);
    this._actionError.set(null);
    this._nextCursor.set(null);
    this._hasMore.set(false);
    this._filters.set({});
    this._loaded.set(false);
    this._certs.set([]);
  }
}

function filtersEqual(a: PromoFilters, b: PromoFilters): boolean {
  return a.active === b.active && a.expired === b.expired;
}
