import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CanadaFlag } from '@ui';
import { LanguageService } from '@core/i18n';
import { DashboardNavbar } from '@layouts';

/**
 * `ios-subscription-cancelled-page` — Confirmation screen shown after
 * the newsletter subscription has been cancelled.
 *
 * Figma: node 13474-27079 (subscription cancelled state).
 *
 * Layout:
 *   ┌─ navbar ──────────────────────────────────────────────────────────┐
 *   │                                                                    │
 *   │  :(                           (large muted text)                  │
 *   │  Your subscription has been cancelled.                            │
 *   │  We heard you cancelled your subscription, which is unfortunate.  │
 *   │  We wish you a pleasant journey.                                  │
 *   │                                                                    │
 *   │  [    Subscription again    ]  (dark-red full-width button)       │
 *   │  [         Go Home          ]  (text-only button)                 │
 *   │                                                                    │
 *   ├─ footer ──────────────────────────────────────────────────────────┤
 *   └────────────────────────────────────────────────────────────────────┘
 */
@Component({
  selector: 'ios-subscription-cancelled-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DashboardNavbar, RouterLink, CanadaFlag],
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <!-- ── Main content ───────────────────────────────────────────────── -->
      <main class="flex-1 bg-white flex flex-col" id="main-content">
        <div class="max-w-[1400px] mx-auto px-8 py-12 flex flex-col gap-6 w-full">
          <!-- ":(" emoji heading -->
          <p class="font-semibold text-[46px] leading-[1.2] text-[#959695]" aria-hidden="true">
            :(
          </p>

          <!-- Message block -->
          <div class="flex flex-col gap-1 max-w-[608px]">
            <h1 class="font-bold text-[20px] leading-[1.2] text-[#272827]">
              {{ lang.t('settings.cancelled.heading') }}
            </h1>
            <p class="font-medium text-[16px] leading-[1.4] text-[#666766]">
              {{ lang.t('settings.cancelled.line1') }}
            </p>
            <p class="font-medium text-[16px] leading-[1.4] text-[#666766]">
              {{ lang.t('settings.cancelled.line2') }}
            </p>
          </div>

          <!-- Action buttons -->
          <div class="flex flex-col gap-6 max-w-[482px]">
            <!-- Subscription again — primary dark red -->
            <a
              routerLink="/dashboard/settings"
              class="flex items-center justify-center w-full h-14 rounded-xl bg-[#8b0000] text-[#f1e6e8] text-[18px] font-semibold leading-[1.4] hover:bg-[#6f0000] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b0000]/50"
            >
              {{ lang.t('settings.cancelled.resubscribe') }}
            </a>

            <!-- Go home — ghost / text-only -->
            <a
              routerLink="/dashboard"
              class="flex items-center justify-center w-full h-14 rounded-xl text-[#373837] text-[18px] font-semibold leading-[1.4] hover:bg-[#f1f1f1] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#272827]/20"
            >
              {{ lang.t('settings.cancelled.goHome') }}
            </a>
          </div>
        </div>
      </main>

      <!-- ── Footer ─────────────────────────────────────────────────────── -->
      <footer class="bg-ios-brand-dark w-full py-4">
        <div
          class="max-w-[1400px] mx-auto px-8 flex items-center justify-center gap-2 text-ios-brand-muted text-xs"
        >
          <ios-canada-flag aria-hidden="true" />
          <span>{{ lang.t('common.copyright', { year: year }) }}</span>
        </div>
      </footer>
    </div>
  `,
})
export class SubscriptionCancelledPage {
  protected readonly lang = inject(LanguageService);
  protected readonly year = new Date().getFullYear().toString();
}

export default SubscriptionCancelledPage;
