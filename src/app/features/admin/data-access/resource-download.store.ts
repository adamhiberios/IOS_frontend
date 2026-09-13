import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { AppEventBus } from '@core/event-bus';
import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { AdminResourceDownloadApi } from './resource-download.api';
import {
  type ResourceDownloadDetail,
  type ResourceDownloadFilters,
  type ResourceDownloadItem,
  type ResourceDownloadPatch,
} from './resource-download.model';

/** Page size for the list (backend caps at 100). */
const PAGE_LIMIT = 50;

/**
 * Signal store for the admin gated-download leads list (IDD-267).
 *
 * Cursor-paginated list with a `status` filter, lazy detail load, status/notes
 * updates and GDPR hard delete. Cleared on `user.logged-out` — the rows hold
 * visitor PII (email, name, country), so they must not outlive the session in
 * memory.
 */
@Injectable({ providedIn: 'root' })
export class AdminResourceDownloadStore {
  private readonly api = inject(AdminResourceDownloadApi);
  private readonly lang = inject(LanguageService);
  private readonly bus = inject(AppEventBus);

  constructor() {
    this.bus
      .on('user.logged-out')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.clear());
  }

  private readonly _items = signal<readonly ResourceDownloadItem[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadingMore = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _nextCursor = signal<string | null>(null);
  private readonly _hasMore = signal(false);
  private readonly _filters = signal<ResourceDownloadFilters>({});
  private readonly _loaded = signal(false);

  private readonly _actionPendingId = signal<string | null>(null);
  private readonly _actionError = signal<string | null>(null);

  private readonly _detail = signal<ResourceDownloadDetail | null>(null);
  private readonly _detailLoading = signal(false);
  private readonly _detailError = signal<string | null>(null);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadingMore = this._loadingMore.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly actionPendingId = this._actionPendingId.asReadonly();
  readonly actionError = this._actionError.asReadonly();
  readonly detail = this._detail.asReadonly();
  readonly detailLoading = this._detailLoading.asReadonly();
  readonly detailError = this._detailError.asReadonly();
  readonly isEmpty = computed(
    () => !this._loading() && this._error() === null && this._items().length === 0,
  );

  async load(force = false): Promise<void> {
    if (!force && this._loaded()) return;
    await this.fetch(false);
  }

  async loadMore(): Promise<void> {
    if (this._loadingMore() || !this._hasMore() || this._nextCursor() === null) return;
    await this.fetch(true);
  }

  async setFilters(next: ResourceDownloadFilters): Promise<void> {
    if (next.status === this._filters().status) return;
    this._filters.set(next);
    await this.fetch(false);
  }

  async retry(): Promise<void> {
    await this.fetch(false);
  }

  async loadDetail(id: string): Promise<ResourceDownloadDetail | null> {
    this._detail.set(null);
    this._detailError.set(null);
    this._detailLoading.set(true);
    try {
      const detail = await firstValueFrom(this.api.getById(id));
      this._detail.set(detail);
      return detail;
    } catch (err) {
      this._detailError.set(
        problemDetailMessage(err) ?? this.lang.t('admin.downloads.detailError'),
      );
      return null;
    } finally {
      this._detailLoading.set(false);
    }
  }

  clearDetail(): void {
    this._detail.set(null);
    this._detailError.set(null);
  }

  /** Update the follow-up status and/or notes. The caller must send ≥ 1 field. */
  async update(id: string, patch: ResourceDownloadPatch): Promise<boolean> {
    return this.runAction(id, async () => {
      const updated = await firstValueFrom(this.api.update(id, patch));
      // Keep an open detail pane in step without a second round trip.
      if (this._detail()?.id === id) this._detail.set(updated);
    });
  }

  /** **Irreversible** GDPR erasure. The caller must have confirmed with the user. */
  async remove(id: string): Promise<boolean> {
    const ok = await this.runAction(id, () => firstValueFrom(this.api.remove(id)));
    if (ok && this._detail()?.id === id) this.clearDetail();
    return ok;
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
      this._actionError.set(problemDetailMessage(err) ?? this.lang.t('admin.downloads.saveError'));
      return false;
    } finally {
      this._actionPendingId.set(null);
    }
  }

  private async fetch(append: boolean): Promise<void> {
    if (append) this._loadingMore.set(true);
    else this._loading.set(true);
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
      this._error.set(problemDetailMessage(err) ?? this.lang.t('admin.downloads.error'));
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
    this._detail.set(null);
    this._detailError.set(null);
  }
}
