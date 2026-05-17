import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import {
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
import { LanguageService } from '@core/i18n';

import type { Notification } from '../data-access/notification.model';

/**
 * `ios-notification-card` — single notification row.
 *
 * Figma: node 13468:11265 (notification-card)
 *
 * Layout:
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │  [icon-bg] [icon 32px]  │  title (18px SemiBold)  │  time  │
 *  │                         │  description (16px Med) │        │
 *  └─────────────────────────────────────────────────────────────┘
 *
 * Background:   #f6f6f6  rounded-3xl
 * Icon pill:    8px padding, rounded-2xl, bg controlled by `notification.iconBg`
 * Title:        18px / 600 / #272827
 * Description:  16px / 500 / #666766
 * Time:         14px / 500 / #959695
 */
@Component({
  selector: 'ios-notification-card',
  imports: [NgOptimizedImage, IosIcon],
  providers: [
    provideIcons(
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
  host: { class: 'block w-full' },
  template: `
    <article
      class="flex items-center gap-3 px-4 py-2 bg-[#f6f6f6] rounded-3xl w-full"
      [attr.aria-label]="lang.t(notification().titleKey)"
    >
      <!-- ── Icon container ──────────────────────────────────────────────── -->
      <div
        class="flex items-center justify-center p-2 rounded-2xl shrink-0"
        [class.bg-ios-brand-primary-soft]="notification().iconBg === 'bg-ios-brand-primary-soft'"
        [class.bg-white]="notification().iconBg === 'bg-white'"
        aria-hidden="true"
      >
        @if (notification().iconName === 'ios-logo') {
          <!-- IOS brand logo (welcome notification) -->
          <img
            ngSrc="assets/icons/logo_institute_of_scrum.png"
            alt=""
            class="w-8 h-8 object-contain"
            width="32"
            height="32"
            loading="lazy"
            decoding="async"
          />
        } @else {
          <ios-icon
            [name]="$any(notification().iconName)"
            class="w-8 h-8 text-[#272827]"
            aria-hidden="true"
          />
        }
      </div>

      <!-- ── Text content ────────────────────────────────────────────────── -->
      <div class="flex flex-col gap-1 flex-1 min-w-0 py-2" dir="auto">
        <p
          class="text-[18px] font-semibold leading-[1.4] text-[#272827] w-full"
          [class.font-bold]="!notification().isRead"
        >
          {{ lang.t(notification().titleKey) }}
        </p>
        <p class="text-[16px] font-medium leading-[1.4] text-[#666766] w-full">
          {{ lang.t(notification().descriptionKey) }}
        </p>
      </div>

      <!-- ── Timestamp ───────────────────────────────────────────────────── -->
      <p
        class="text-[14px] font-medium leading-[1.4] text-[#959695] whitespace-nowrap shrink-0"
        dir="auto"
      >
        {{ notification().time }}
      </p>
    </article>
  `,
})
export class NotificationCard {
  protected readonly lang = inject(LanguageService);

  readonly notification = input.required<Notification>();
}
