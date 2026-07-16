import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';
import { NotificationBadgeStore } from '@core/notifications';

import { NotificationsApi } from './notifications.api';
import { type Notification } from './notification.model';

/** Page size for the notifications feed (backend caps its own limit). */
const PAGE_LIMIT = 20;

/**
 * `NotificationsStore` — signal store for the notifications feature (BE-I-18).
 *
 * Owns the cursor-paginated feed plus the mark-read / mark-all-read actions and
 * the unread-only filter. Feature-scoped (provided by the page). Business logic
 * lives here; the page binds signals and dispatches actions. Keeps the shell's
 * unread badge (`core` {@link NotificationBadgeStore}) in sync after mutations.
 */
@Injectable()
export class NotificationsStore {
  private readonly api = inject(NotificationsApi);
  private readonly lang = inject(LanguageService);
  private readonly badge = inject(NotificationBadgeStore);

  private readonly _items = signal<readonly Notification[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadingMore = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _nextCursor = signal<string | null>(null);
  private readonly _hasMore = signal(false);
  private readonly _unreadOnly = signal(false);
  private readonly _markingAll = signal(false);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadingMore = this._loadingMore.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly unreadOnly = this._unreadOnly.asReadonly();
  readonly markingAll = this._markingAll.asReadonly();

  /** True when a completed load returned no notifications. */
  readonly isEmpty = computed(
    () => !this._loading() && this._error() === null && this._items().length === 0,
  );

  /** True when at least one loaded item is still unread. */
  readonly hasUnread = computed(() => this._items().some((n) => !n.read));

  /** Load the first page with the current filter (replaces the list). */
  async load(): Promise<void> {
    await this.fetch(false);
  }

  /** Append the next keyset page, if any. */
  async loadMore(): Promise<void> {
    if (this._loadingMore() || !this._hasMore() || this._nextCursor() === null) return;
    await this.fetch(true);
  }

  /** Toggle the unread-only filter and reload from the first page. */
  async setUnreadOnly(value: boolean): Promise<void> {
    if (value === this._unreadOnly()) return;
    this._unreadOnly.set(value);
    await this.fetch(false);
  }

  /**
   * Mark a single notification read (`POST /:id/read`, idempotent). Optimistic
   * badge decrement; if the unread-only filter is active the row drops out of
   * the list. No-op when the item is already read.
   */
  async markRead(id: string): Promise<void> {
    const target = this._items().find((n) => n.id === id);
    if (!target || target.read) return;
    try {
      await firstValueFrom(this.api.markRead(id));
      if (this._unreadOnly()) {
        this._items.update((list) => list.filter((n) => n.id !== id));
      } else {
        this._items.update((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
      }
      this.badge.decrement();
    } catch (err) {
      this._error.set(problemDetailMessage(err) ?? this.lang.t('notifications.markReadError'));
    }
  }

  /**
   * Mark every notification read (`POST /read-all`). Flips all loaded rows to
   * read (or clears the list under the unread-only filter) and zeroes the badge.
   */
  async markAllRead(): Promise<void> {
    if (this._markingAll() || !this.hasUnread()) return;
    this._markingAll.set(true);
    this._error.set(null);
    try {
      await firstValueFrom(this.api.markAllRead());
      if (this._unreadOnly()) {
        this._items.set([]);
      } else {
        this._items.update((list) => list.map((n) => ({ ...n, read: true })));
      }
      this.badge.setCount(0);
    } catch (err) {
      this._error.set(problemDetailMessage(err) ?? this.lang.t('notifications.markAllReadError'));
    } finally {
      this._markingAll.set(false);
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
          cursor: append ? (this._nextCursor() ?? undefined) : undefined,
          limit: PAGE_LIMIT,
          unreadOnly: this._unreadOnly() ? true : undefined,
        }),
      );
      this._items.update((current) => (append ? [...current, ...page.items] : [...page.items]));
      this._nextCursor.set(page.nextCursor);
      this._hasMore.set(page.hasMore);
      if (!append) void this.badge.refresh();
    } catch (err) {
      this._error.set(problemDetailMessage(err) ?? this.lang.t('notifications.loadError'));
    } finally {
      this._loading.set(false);
      this._loadingMore.set(false);
    }
  }
}
