import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { AdminCatalogApi } from './catalog.api';
import { type ActiveFilter, type AdminCertificate } from './catalog.model';

/** Page size for the admin catalog list. */
const PAGE_LIMIT = 20;

/**
 * Signal store for the admin catalog (certificates) list.
 *
 * Owns cursor-paginated server state: private writable signals, read-only views,
 * and action methods (`load`, `loadMore`, `setSearch`, `setActiveFilter`).
 * Newest-first; `loadMore()` appends the next keyset page.
 */
@Injectable({ providedIn: 'root' })
export class AdminCatalogStore {
  private readonly api = inject(AdminCatalogApi);
  private readonly lang = inject(LanguageService);

  private readonly _items = signal<readonly AdminCertificate[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadingMore = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _nextCursor = signal<string | null>(null);
  private readonly _hasMore = signal(false);
  private readonly _search = signal('');
  private readonly _active = signal<ActiveFilter>(undefined);
  private readonly _actionPendingId = signal<string | null>(null);
  private readonly _actionError = signal<string | null>(null);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadingMore = this._loadingMore.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly search = this._search.asReadonly();
  readonly activeFilter = this._active.asReadonly();
  readonly actionPendingId = this._actionPendingId.asReadonly();
  readonly actionError = this._actionError.asReadonly();
  readonly isEmpty = computed(
    () => !this._loading() && this._error() === null && this._items().length === 0,
  );

  /** Load the first page with the current filters (replaces the list). */
  async load(): Promise<void> {
    await this.fetch(false);
  }

  /** Append the next keyset page, if any. */
  async loadMore(): Promise<void> {
    if (this._loadingMore() || !this._hasMore() || this._nextCursor() === null) return;
    await this.fetch(true);
  }

  /** Set the free-text search and reload from the first page. */
  async setSearch(value: string): Promise<void> {
    const next = value.trim();
    if (next === this._search()) return;
    this._search.set(next);
    await this.fetch(false);
  }

  /** Set the active-state filter (`undefined` = all) and reload. */
  async setActiveFilter(value: ActiveFilter): Promise<void> {
    if (value === this._active()) return;
    this._active.set(value);
    await this.fetch(false);
  }

  /**
   * Soft-delete (deactivate) a certificate, then refresh the current page so
   * the list reflects the new state. Returns `true` on success; on failure the
   * reason is exposed via {@link actionError}. Requires `learning_admin`
   * (backend-enforced — a 403 surfaces here as an action error).
   */
  async deactivate(id: string): Promise<boolean> {
    if (this._actionPendingId() !== null) return false;
    this._actionPendingId.set(id);
    this._actionError.set(null);
    try {
      await firstValueFrom(this.api.softDelete(id));
      await this.fetch(false);
      return true;
    } catch (err) {
      this._actionError.set(
        problemDetailMessage(err) ?? this.lang.t('admin.catalog.deactivateError'),
      );
      return false;
    } finally {
      this._actionPendingId.set(null);
    }
  }

  /** Clear a lingering row-action error (e.g. when the confirm dialog closes). */
  clearActionError(): void {
    this._actionError.set(null);
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
          search: this._search() || undefined,
          active: this._active(),
          cursor: append ? (this._nextCursor() ?? undefined) : undefined,
          limit: PAGE_LIMIT,
        }),
      );
      this._items.update((current) => (append ? [...current, ...page.items] : [...page.items]));
      this._nextCursor.set(page.nextCursor);
      this._hasMore.set(page.hasMore);
    } catch (err) {
      this._error.set(problemDetailMessage(err) ?? this.lang.t('admin.catalog.error'));
    } finally {
      this._loading.set(false);
      this._loadingMore.set(false);
    }
  }
}
