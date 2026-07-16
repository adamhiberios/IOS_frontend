import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { environment } from '@env/environment';

import { AppEventBus } from '../event-bus';

/** Bare `GET /notifications/unread-count` response. */
interface UnreadCountResponse {
  readonly count: number;
}

/**
 * `NotificationBadgeStore` — root singleton holding the count of unread in-app
 * notifications for the dashboard shell's bell badge (BE-I-18 / A4).
 *
 * Lives in `core/` because the app-shell navbar (a **layout**) needs it, and
 * layouts must not import features (CLAUDE.md §5 / the eslint boundary rule).
 * The notifications feature keeps it in sync after marking items read; the
 * navbar refreshes it on each dashboard navigation. Cleared on logout so a
 * stale count never leaks into the next session.
 */
@Injectable({ providedIn: 'root' })
export class NotificationBadgeStore {
  private readonly http = inject(HttpClient);
  private readonly bus = inject(AppEventBus);
  private readonly endpoint = `${environment.apiBaseUrl}/notifications/unread-count`;

  private readonly _count = signal(0);
  readonly count = this._count.asReadonly();
  readonly hasUnread = computed(() => this._count() > 0);

  constructor() {
    this.bus
      .on('user.logged-out')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this._count.set(0));
  }

  /** Re-fetch the unread count. Silent on failure — the badge is non-critical. */
  async refresh(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<UnreadCountResponse>(this.endpoint));
      this._count.set(Math.max(0, res.count ?? 0));
    } catch {
      // Non-critical: keep the previous count rather than surfacing an error.
    }
  }

  /** Set the count directly (e.g. from a mark-all-read result). */
  setCount(value: number): void {
    this._count.set(Math.max(0, value));
  }

  /** Optimistically decrement (e.g. after marking a single item read). */
  decrement(by = 1): void {
    this._count.update((c) => Math.max(0, c - by));
  }
}
