import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { AdminAuditLogsApi } from './audit.api';
import { type AuditLogEntry, type AuditLogFilters } from './audit.model';

/** Page size for the admin audit-log list (backend max is 100). */
const PAGE_LIMIT = 50;

/**
 * Signal store for the admin audit-log list (`GET /admin/audit-logs`).
 *
 * Read-only, cursor-paginated, newest-first, with the backend filter set
 * (`tableName`, `actorId`, `recordId`, `action`). Same shape as the other admin
 * list stores; `loadMore()` appends the next keyset page. No mutations — audit
 * logs are append-only and never edited from the UI.
 */
@Injectable({ providedIn: 'root' })
export class AdminAuditLogsStore {
  private readonly api = inject(AdminAuditLogsApi);
  private readonly lang = inject(LanguageService);

  private readonly _items = signal<readonly AuditLogEntry[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadingMore = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _nextCursor = signal<string | null>(null);
  private readonly _hasMore = signal(false);
  private readonly _filters = signal<AuditLogFilters>({});

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadingMore = this._loadingMore.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly filters = this._filters.asReadonly();
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

  /**
   * Replace the filter set and reload from the first page. Empty strings are
   * normalised to `undefined` so blank fields aren't sent as query params.
   * No-ops when the filters are unchanged.
   */
  async setFilters(next: AuditLogFilters): Promise<void> {
    const normalized = normalizeFilters(next);
    if (filtersEqual(normalized, this._filters())) return;
    this._filters.set(normalized);
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
      const filters = this._filters();
      const page = await firstValueFrom(
        this.api.list({
          ...filters,
          cursor: append ? (this._nextCursor() ?? undefined) : undefined,
          limit: PAGE_LIMIT,
        }),
      );
      this._items.update((current) => (append ? [...current, ...page.items] : [...page.items]));
      this._nextCursor.set(page.nextCursor);
      this._hasMore.set(page.hasMore);
    } catch (err) {
      this._error.set(problemDetailMessage(err) ?? this.lang.t('admin.audit.error'));
    } finally {
      this._loading.set(false);
      this._loadingMore.set(false);
    }
  }
}

/** Drop blank string fields (treat `''` as "no filter"). */
function normalizeFilters(filters: AuditLogFilters): AuditLogFilters {
  return {
    tableName: filters.tableName?.trim() || undefined,
    actorId: filters.actorId?.trim() || undefined,
    recordId: filters.recordId?.trim() || undefined,
    action: filters.action || undefined,
  };
}

function filtersEqual(a: AuditLogFilters, b: AuditLogFilters): boolean {
  return (
    a.tableName === b.tableName &&
    a.actorId === b.actorId &&
    a.recordId === b.recordId &&
    a.action === b.action
  );
}
