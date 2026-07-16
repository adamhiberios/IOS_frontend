import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { AppEventBus } from '@core/event-bus';
import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { AdminStaffApi } from './staff.api';
import { toCreateStaffBody, toUpdateStaffBody } from './staff.mappers';
import {
  type CreateStaffPayload,
  type StaffFilters,
  type StaffMember,
  type UpdateStaffPayload,
} from './staff.model';

/** Page size for the staff list (backend max is 100). */
const PAGE_LIMIT = 50;

/**
 * Signal store for admin staff management (BE-I-03 / B3) — super_admin only.
 *
 * Cursor-paginated, newest-first, with the backend filter set (`search`,
 * `role`, `active`). Owns create / update / deactivate / reactivate actions with
 * a shared `actionPending` / `actionError` lifecycle; each write refetches the
 * list. Cleared on `user.logged-out` (admin account data).
 */
@Injectable({ providedIn: 'root' })
export class AdminStaffStore {
  private readonly api = inject(AdminStaffApi);
  private readonly lang = inject(LanguageService);
  private readonly bus = inject(AppEventBus);

  constructor() {
    this.bus
      .on('user.logged-out')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.clear());
  }

  private readonly _items = signal<readonly StaffMember[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadingMore = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _nextCursor = signal<string | null>(null);
  private readonly _hasMore = signal(false);
  private readonly _filters = signal<StaffFilters>({});
  private readonly _loaded = signal(false);
  /** `${id}` (or `new`) of the in-flight write, for row/dialog spinners. */
  private readonly _actionPendingId = signal<string | null>(null);
  private readonly _actionError = signal<string | null>(null);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadingMore = this._loadingMore.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly actionPendingId = this._actionPendingId.asReadonly();
  readonly actionError = this._actionError.asReadonly();
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
  async setFilters(next: StaffFilters): Promise<void> {
    const normalized = normalizeFilters(next);
    if (filtersEqual(normalized, this._filters())) return;
    this._filters.set(normalized);
    await this.fetch(false);
  }

  // ── Mutations ────────────────────────────────────────────────────────────

  async create(payload: CreateStaffPayload): Promise<boolean> {
    return this.runAction('new', () => firstValueFrom(this.api.create(toCreateStaffBody(payload))));
  }

  async update(id: string, payload: UpdateStaffPayload): Promise<boolean> {
    return this.runAction(id, () =>
      firstValueFrom(this.api.update(id, toUpdateStaffBody(payload))),
    );
  }

  /** Deactivate via the dedicated soft off-switch endpoint. */
  async deactivate(id: string): Promise<boolean> {
    return this.runAction(id, () => firstValueFrom(this.api.deactivate(id)));
  }

  /** Reactivate a deactivated account (`PATCH { active: true }`). */
  async reactivate(id: string): Promise<boolean> {
    return this.runAction(id, () => firstValueFrom(this.api.update(id, { active: true })));
  }

  /** Clear a lingering form/row action error (e.g. when a dialog closes). */
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
      this._actionError.set(problemDetailMessage(err) ?? this.lang.t('admin.staff.saveError'));
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
      this._error.set(problemDetailMessage(err) ?? this.lang.t('admin.staff.error'));
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
  }
}

/** Drop blank filter fields (treat `''` / `undefined` as "no filter"). */
function normalizeFilters(filters: StaffFilters): StaffFilters {
  return {
    search: filters.search?.trim() || undefined,
    role: filters.role,
    active: filters.active,
  };
}

function filtersEqual(a: StaffFilters, b: StaffFilters): boolean {
  return a.search === b.search && a.role === b.role && a.active === b.active;
}
