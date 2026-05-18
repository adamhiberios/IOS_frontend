import { ChangeDetectionStrategy, Component, type OnInit, computed, inject } from '@angular/core';
import {
  LucideArrowDownUp,
  LucideAward,
  LucideCircleCheck,
  LucideDollarSign,
  LucideFilePlus,
  LucideKey,
  LucideNewspaper,
  LucidePercent,
  LucideScanFace,
  LucideShieldAlert,
  LucideUserRoundCheck,
} from '@lucide/angular';

import { IosIcon, provideIcons } from '@ui';
import { DashboardNavbar } from '@layouts';
import { LanguageService } from '@core/i18n';

import { NotificationsStore } from '../data-access/notifications.store';
import { NotificationCard } from '../components/notification-card';

/**
 * `ios-notifications-page` — full-page notifications list.
 *
 * Figma: node 13468:9960 (Notifications)
 *
 * Layout:
 *  ┌─ ios-dashboard-navbar ─────────────────────────────────────────┐
 *  ├─ breadcrumb bar ───────────────────────────────────────────────┤
 *  │  "Notifications"                     [↕ Sort: Last date]       │
 *  ├─ main content ─────────────────────────────────────────────────┤
 *  │  h1 "All certifications"                                        │
 *  │  ┌─ notification-card ─────────────────────────────────────┐   │
 *  │  │  ...                                                     │   │
 *  │  └─────────────────────────────────────────────────────────┘   │
 *  └─ footer ───────────────────────────────────────────────────────┘
 *
 * Route: /dashboard/notifications
 * Guard: already protected by roleGuard on the /dashboard parent.
 */
@Component({
  selector: 'ios-notifications-page',
  imports: [DashboardNavbar, IosIcon, NotificationCard],
  providers: [
    NotificationsStore,
    provideIcons(
      LucideArrowDownUp,
      LucideAward,
      LucideCircleCheck,
      LucideDollarSign,
      LucideFilePlus,
      LucideKey,
      LucideNewspaper,
      LucidePercent,
      LucideScanFace,
      LucideShieldAlert,
      LucideUserRoundCheck,
    ),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <!-- ── Top nav ──────────────────────────────────────────────────────── -->
      <ios-dashboard-navbar />

      <!-- ── Breadcrumb / page toolbar ─────────────────────────────────── -->
      <div class="w-full bg-white border-b border-ios-surface-soft">
        <div class="max-w-[1400px] mx-auto px-8 h-[70px] flex items-center justify-between">
          <!-- Page title (acts as breadcrumb label in the Figma) -->
          <span class="text-[16px] font-semibold leading-[1.4] text-ios-fg-13 whitespace-nowrap">
            {{ lang.t('notifications.pageTitle') }}
          </span>

          <!-- Sort button -->
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 h-11 px-4 bg-ios-surface-soft rounded-2xl text-[16px] font-semibold leading-[1.4] text-ios-fg-10 hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 whitespace-nowrap"
            (click)="store.toggleSort()"
            [attr.aria-label]="lang.t('notifications.sortAriaLabel')"
          >
            <ios-icon name="arrow-down-up" class="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>
              {{
                store.sortOrder() === 'latest'
                  ? lang.t('notifications.sortLatest')
                  : lang.t('notifications.sortEarliest')
              }}
            </span>
          </button>
        </div>
      </div>

      <!-- ── Main content ──────────────────────────────────────────────── -->
      <main class="flex-1 bg-white" id="main-content">
        <div class="max-w-[1400px] mx-auto px-8 py-6 flex flex-col gap-4">
          <!-- Section heading -->
          <h1 class="text-[18px] font-semibold leading-[1.4] text-ios-fg-13 whitespace-nowrap">
            {{ lang.t('notifications.sectionTitle') }}
          </h1>

          <!-- Notification list -->
          @if (store.loading()) {
            <!-- Loading skeleton – 3 placeholder rows -->
            @for (_ of skeletonRows; track $index) {
              <div
                class="h-[76px] rounded-3xl bg-ios-surface-mid animate-pulse w-full"
                aria-hidden="true"
              ></div>
            }
          } @else if (notifications().length === 0) {
            <p class="text-[16px] font-medium leading-[1.4] text-ios-fg-7 py-8 text-center">
              {{ lang.t('notifications.empty') }}
            </p>
          } @else {
            <ul class="flex flex-col gap-[13px]" role="list" aria-live="polite">
              @for (item of notifications(); track item.id) {
                <li>
                  <ios-notification-card [notification]="item" />
                </li>
              }
            </ul>
          }
        </div>
      </main>

      <!-- ── Footer ─────────────────────────────────────────────────────── -->
      <footer class="bg-ios-fg w-full py-4 shrink-0">
        <div
          class="max-w-[1400px] mx-auto px-8 flex items-center justify-center gap-2 text-ios-fg-7 text-sm"
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

  protected readonly notifications = computed(() => this.store.notifications());
  protected readonly year = new Date().getFullYear();

  /** Used to render skeleton rows while loading. */
  protected readonly skeletonRows = [1, 2, 3];

  ngOnInit(): void {
    this.store.load();
  }
}

export default NotificationsPage;
