import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  LucideAward,
  LucideBadgeCheck,
  LucideBell,
  LucideCheck,
  LucideCircleCheck,
  LucideDollarSign,
  LucideExternalLink,
  LucideFilePlus,
  LucideGraduationCap,
  LucideKey,
  LucidePercent,
  LucideShieldAlert,
  LucideTicket,
  LucideUserRoundCheck,
} from '@lucide/angular';

import { IosIcon, provideIcons } from '@ui';
import { LanguageService } from '@core/i18n';

import {
  type Notification,
  notificationIcon,
  notificationLink,
} from '../data-access/notification.model';

/**
 * `ios-notification-card` — single notification row (BE-I-18 / A4).
 *
 * `title`/`body` are rendered as-is (already localized by the backend). Unread
 * items are emphasised with a dot + bolder title and expose a "Mark as read"
 * action; a deep link (from `data`, e.g. `verifyUrl`) surfaces as a "View" link.
 * Both actions emit `markRead(id)` so the parent store can persist + sync.
 */
@Component({
  selector: 'ios-notification-card',
  imports: [DatePipe, IosIcon],
  providers: [
    provideIcons(
      LucideAward,
      LucideBadgeCheck,
      LucideBell,
      LucideCheck,
      LucideCircleCheck,
      LucideDollarSign,
      LucideExternalLink,
      LucideFilePlus,
      LucideGraduationCap,
      LucideKey,
      LucidePercent,
      LucideShieldAlert,
      LucideTicket,
      LucideUserRoundCheck,
    ),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  template: `
    <article
      class="flex items-center gap-3 px-4 py-2 rounded-3xl w-full"
      [class.bg-ios-surface-mid]="notification().read"
      [class.bg-ios-brand-primary-soft]="!notification().read"
    >
      <!-- ── Icon ────────────────────────────────────────────────────────── -->
      <div
        class="flex items-center justify-center p-2 rounded-2xl shrink-0 bg-white"
        aria-hidden="true"
      >
        <ios-icon [name]="icon()" class="w-8 h-8 text-ios-fg" />
      </div>

      <!-- ── Text content ────────────────────────────────────────────────── -->
      <div class="flex flex-col gap-1 flex-1 min-w-0 py-2" dir="auto">
        <div class="flex items-center gap-2">
          @if (!notification().read) {
            <span
              class="inline-block w-2 h-2 rounded-full bg-ios-brand-primary shrink-0"
              aria-hidden="true"
            ></span>
          }
          <p
            class="text-[18px] leading-[1.4] text-ios-fg w-full"
            [class.font-bold]="!notification().read"
            [class.font-semibold]="notification().read"
          >
            {{ notification().title }}
          </p>
        </div>
        <p class="text-[16px] font-medium leading-[1.4] text-ios-fg-8 w-full">
          {{ notification().body }}
        </p>

        <!-- Actions -->
        <div class="flex items-center gap-4 mt-1">
          @if (link(); as href) {
            <a
              [href]="href"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 text-sm font-semibold text-ios-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 rounded"
              (click)="markRead.emit(notification().id)"
            >
              <ios-icon name="external-link" class="w-4 h-4" aria-hidden="true" />
              {{ lang.t('notifications.view') }}
            </a>
          }
          @if (!notification().read) {
            <button
              type="button"
              class="inline-flex items-center gap-1.5 text-sm font-semibold text-ios-fg-8 hover:text-ios-fg-13 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 rounded"
              (click)="markRead.emit(notification().id)"
            >
              <ios-icon name="check" class="w-4 h-4" aria-hidden="true" />
              {{ lang.t('notifications.markRead') }}
            </button>
          }
        </div>
      </div>

      <!-- ── Timestamp ───────────────────────────────────────────────────── -->
      <p
        class="text-[14px] font-medium leading-[1.4] text-ios-fg-7 whitespace-nowrap shrink-0 self-start pt-2"
        dir="auto"
      >
        {{ notification().createdAt | date: 'MMM d, h:mm a' }}
      </p>
    </article>
  `,
})
export class NotificationCard {
  protected readonly lang = inject(LanguageService);

  readonly notification = input.required<Notification>();
  readonly markRead = output<string>();

  protected readonly icon = computed(() => notificationIcon(this.notification().type));
  protected readonly link = computed(() => notificationLink(this.notification().data));
}
