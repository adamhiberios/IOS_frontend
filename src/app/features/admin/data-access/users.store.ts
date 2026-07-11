import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { AdminUsersApi } from './users.api';
import { type StudentListItem } from './users.model';

/** Page size for the admin students list. */
const PAGE_LIMIT = 50;

/**
 * Signal store for the admin students (user oversight) list. Cursor-paginated,
 * newest-first, with free-text search. Same shape as the catalog store minus
 * the active-state filter (students have no such flag on the list endpoint).
 */
@Injectable({ providedIn: 'root' })
export class AdminUsersStore {
  private readonly api = inject(AdminUsersApi);
  private readonly lang = inject(LanguageService);

  private readonly _items = signal<readonly StudentListItem[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadingMore = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _nextCursor = signal<string | null>(null);
  private readonly _hasMore = signal(false);
  private readonly _search = signal('');

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadingMore = this._loadingMore.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly search = this._search.asReadonly();
  readonly isEmpty = computed(
    () => !this._loading() && this._error() === null && this._items().length === 0,
  );

  /** Load the first page with the current search (replaces the list). */
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
          cursor: append ? (this._nextCursor() ?? undefined) : undefined,
          limit: PAGE_LIMIT,
        }),
      );
      this._items.update((current) => (append ? [...current, ...page.items] : [...page.items]));
      this._nextCursor.set(page.nextCursor);
      this._hasMore.set(page.hasMore);
    } catch (err) {
      this._error.set(problemDetailMessage(err) ?? this.lang.t('admin.users.error'));
    } finally {
      this._loading.set(false);
      this._loadingMore.set(false);
    }
  }
}
