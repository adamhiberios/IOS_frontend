import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';

import { LanguageService } from '@core/i18n';
import { CanadaFlag, IosIcon, provideIcons } from '@ui';
import { LucideCircleX } from '@lucide/angular';

/**
 * `ios-payment-cancel-page` — landing page for Stripe's `cancelUrl`.
 *
 * Mirrors {@link PaymentSuccessPage}: the backend hardcodes the Stripe
 * "cancel" redirect to `{FRONTEND_BASE_URL}/payments/cancel`
 * (`IOS_Backend/src/modules/payment/payment.service.ts`, both
 * `createEnrollmentCheckout` and `createRetakeCheckout`). No transaction was
 * created for a cancelled session — nothing to fetch or reconcile here, just
 * a way back into the app.
 */
@Component({
  selector: 'ios-payment-cancel-page',
  imports: [RouterLink, NgOptimizedImage, CanadaFlag, IosIcon],
  providers: [provideIcons(LucideCircleX)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen flex-col bg-white">
      <div class="w-full px-8 py-6">
        <a routerLink="/dashboard" [attr.aria-label]="lang.t('dashboard.nav.dashboardLabel')">
          <img
            ngSrc="assets/icons/logo_institute_of_scrum.png"
            [alt]="lang.t('dashboard.nav.dashboardLabel')"
            class="h-8 w-auto"
            width="120"
            height="32"
            loading="eager"
            decoding="async"
          />
        </a>
      </div>

      <main class="flex flex-1 items-center justify-center px-6 py-16" id="main-content">
        <div class="flex w-full max-w-[520px] flex-col items-center gap-4 text-center">
          <div
            class="flex shrink-0 items-center rounded-full bg-ios-surface-soft p-4"
            aria-hidden="true"
          >
            <ios-icon name="circle-x" class="size-16 text-ios-fg-8" aria-hidden="true" />
          </div>

          <h1
            class="font-heading text-[24px] font-semibold leading-[1.2] text-ios-fg-11"
            dir="auto"
          >
            {{ lang.t('payments.checkout.cancel.title') }}
          </h1>
          <p class="font-body text-[16px] font-medium leading-[1.5] text-ios-fg-8" dir="auto">
            {{ lang.t('payments.checkout.cancel.body') }}
          </p>

          <a
            routerLink="/dashboard/certificates"
            class="mt-4 inline-flex h-12 items-center justify-center rounded-xl bg-ios-fg-13 px-6 font-body text-[16px] font-semibold text-white transition-colors hover:bg-ios-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
          >
            {{ lang.t('payments.checkout.cancel.backToCertificates') }}
          </a>
        </div>
      </main>

      <footer class="w-full bg-ios-brand-dark py-4">
        <div
          class="mx-auto flex max-w-[1400px] items-center justify-center gap-2 px-4 text-xs text-ios-brand-muted md:px-8"
        >
          <ios-canada-flag aria-hidden="true" />
          <span>{{ lang.t('common.copyright', { year: yearStr }) }}</span>
        </div>
      </footer>
    </div>
  `,
})
export class PaymentCancelPage {
  protected readonly lang = inject(LanguageService);
  protected readonly yearStr = String(new Date().getFullYear());
}

export default PaymentCancelPage;
