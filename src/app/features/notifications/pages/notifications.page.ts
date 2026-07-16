import { ChangeDetectionStrategy, Component, type OnInit, inject } from '@angular/core';
import { LucideCheckCheck } from '@lucide/angular';

import { IosIcon, provideIcons } from '@ui';
import { DashboardNavbar } from '@layouts';
import { LanguageService } from '@core/i18n';

import { NotificationsStore } from '../data-access/notifications.store';
import { NotificationCard } from '../components/notification-card';

/**
 * `ios-notifications-page` — full-page in-app notifications feed (BE-I-18 / A4).
 *
 * Cursor-paginated list with an All / Unread filter, per-row and bulk
 * mark-as-read, and "Load more". `title`/`body` are shown as-is (localized by
 * the backend). The shell bell badge stays in sync via the store.
 *
 * Route: /dashboard/notifications (protected by the /dashboard authGuard).
 */
@Component({
  selector: 'ios-notifications-page',
  imports: [DashboardNavbar, IosIcon, NotificationCard],
  providers: [NotificationsStore, provideIcons(LucideCheckCheck)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <!-- ── Breadcrumb / page toolbar ─────────────────────────────────── -->
      <div class="w-full bg-white border-b border-ios-surface-soft">
        <div
          class="max-w-[1400px] mx-auto px-4 md:px-8 min-h-[70px] py-3 flex flex-wrap items-center justify-between gap-3"
        >
          <span class="text-[16px] font-semibold leading-[1.4] text-ios-fg-13 whitespace-nowrap">
            {{ lang.t('notifications.pageTitle') }}
          </span>

          <div class="flex items-center gap-2">
            <!-- All / Unread filter -->
            <div
              class="inline-flex items-center p-1 bg-ios-surface-soft rounded-2xl"
              role="group"
              [attr.aria-label]="lang.t('notifications.filterAriaLabel')"
            >
              <button
                type="button"
                class="h-9 px-4 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                [class.bg-white]="!store.unreadOnly()"
                [class.text-ios-fg-13]="!store.unreadOnly()"
                [class.text-ios-fg-8]="store.unreadOnly()"
                [attr.aria-pressed]="!store.unreadOnly()"
                (click)="onFilter(false)"
              >
                {{ lang.t('notifications.filterAll') }}
              </button>
              <button
                type="button"
                class="h-9 px-4 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                [class.bg-white]="store.unreadOnly()"
                [class.text-ios-fg-13]="store.unreadOnly()"
                [class.text-ios-fg-8]="!store.unreadOnly()"
                [attr.aria-pressed]="store.unreadOnly()"
                (click)="onFilter(true)"
              >
                {{ lang.t('notifications.filterUnread') }}
              </button>
            </div>

            <!-- Mark all read -->
            <button
              type="button"
              class="inline-flex items-center gap-2 h-11 px-4 bg-ios-surface-soft rounded-2xl text-sm font-semibold text-ios-fg-10 hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none"
              [disabled]="!store.hasUnread() || store.markingAll()"
              (click)="onMarkAllRead()"
            >
              @if (store.markingAll()) {
                <span
                  class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ios-fg-10 border-t-transparent"
                  aria-hidden="true"
                ></span>
              } @else {
                <ios-icon name="check-check" class="w-5 h-5 shrink-0" aria-hidden="true" />
              }
              {{ lang.t('notifications.markAllRead') }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Main content ──────────────────────────────────────────────── -->
      <main class="flex-1 bg-white" id="main-content">
        <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-6 flex flex-col gap-4">
          <h1 class="text-[18px] font-semibold leading-[1.4] text-ios-fg-13">
            {{ lang.t('notifications.sectionTitle') }}
          </h1>

          @if (store.loading()) {
            @for (row of skeletonRows; track row) {
              <div
                class="h-[84px] rounded-3xl bg-ios-surface-mid animate-pulse w-full"
                aria-hidden="true"
              ></div>
            }
          } @else if (store.error(); as err) {
            <div class="flex flex-col items-center gap-4 py-12 text-center" role="alert">
              <p class="text-base font-medium text-ios-brand-primary">{{ err }}</p>
              <button
                type="button"
                class="h-11 px-6 rounded-xl bg-ios-fg-13 text-white text-base font-semibold hover:bg-ios-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                (click)="onRetry()"
              >
                {{ lang.t('notifications.retry') }}
              </button>
            </div>
          } @else if (store.isEmpty()) {
            <p class="text-[16px] font-medium leading-[1.4] text-ios-fg-7 py-8 text-center">
              {{
                store.unreadOnly()
                  ? lang.t('notifications.emptyUnread')
                  : lang.t('notifications.empty')
              }}
            </p>
          } @else {
            <ul class="flex flex-col gap-[13px]" role="list" aria-live="polite">
              @for (item of store.items(); track item.id) {
                <li>
                  <ios-notification-card [notification]="item" (markRead)="onMarkRead($event)" />
                </li>
              }
            </ul>

            @if (store.hasMore()) {
              <div class="flex justify-center pt-2">
                <button
                  type="button"
                  class="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-ios-surface-soft text-ios-fg-13 text-base font-semibold hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 disabled:opacity-50 disabled:pointer-events-none"
                  [disabled]="store.loadingMore()"
                  (click)="onLoadMore()"
                >
                  @if (store.loadingMore()) {
                    <span
                      class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ios-fg-13 border-t-transparent"
                      aria-hidden="true"
                    ></span>
                  }
                  {{ lang.t('notifications.loadMore') }}
                </button>
              </div>
            }
          }
        </div>
      </main>

      <!-- ── Footer ─────────────────────────────────────────────────────── -->
      <footer class="bg-ios-fg w-full py-4 shrink-0">
        <div
          class="max-w-[1400px] mx-auto px-4 md:px-8 flex items-center justify-center gap-2 text-ios-fg-7 text-sm"
        >
          <span>{{ lang.t('common.copyright', { year: year.toString() }) }}</span>
        </div>
      </footer>
    </div>
  `,
})
export class NotificationsPage implements OnInit {
  protected readonly store = inject(NotificationsStore);
  protected readonly lang = inject(LanguageService);

  protected readonly year = new Date().getFullYear();
  protected readonly skeletonRows = [1, 2, 3];

  ngOnInit(): void {
    void this.store.load();
  }

  protected onFilter(unreadOnly: boolean): void {
    void this.store.setUnreadOnly(unreadOnly);
  }

  protected onMarkRead(id: string): void {
    void this.store.markRead(id);
  }

  protected onMarkAllRead(): void {
    void this.store.markAllRead();
  }

  protected onLoadMore(): void {
    void this.store.loadMore();
  }

  protected onRetry(): void {
    void this.store.load();
  }
}

export default NotificationsPage;
