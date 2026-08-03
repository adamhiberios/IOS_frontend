import { ChangeDetectionStrategy, Component, type OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';

import { LanguageService } from '@core/i18n';
import { CanadaFlag } from '@ui';

import { PaymentsStore } from '../data-access/payments.store';

/**
 * `ios-payment-success-page` — landing page for Stripe's `successUrl`.
 *
 * The backend's `PaymentService.createEnrollmentCheckout` / `createRetakeCheckout`
 * hardcode the Stripe redirect target to
 * `{FRONTEND_BASE_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`
 * (`IOS_Backend/src/modules/payment/payment.service.ts`). This route is that
 * exact target — without it, every *paid* (non-$0) checkout landed on a 404
 * after a successful Stripe payment.
 *
 * There is no `GET /payments/session/:id` (or similar) endpoint to confirm the
 * `session_id` server-side, so this page does not claim the charge is
 * reconciled — only Stripe's webhook flips the transaction `pending →
 * completed` and unlocks the certificate, asynchronously, moments after this
 * redirect. The copy is deliberately hedged ("may take a moment") rather than
 * a flat "success", and the CTA sends the student to My Certificates where the
 * real (server-confirmed) enrollment will actually show up.
 *
 * Not gated behind a modal like {@link PaymentSuccessDialog} — Stripe's return
 * is always a full top-level navigation (the SPA reboots), so a route, not a
 * component the running app opens, is the only thing that can catch it.
 */
@Component({
  selector: 'ios-payment-success-page',
  imports: [RouterLink, NgOptimizedImage, CanadaFlag],
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
            class="flex shrink-0 items-center rounded-full bg-ios-success-50 p-4"
            aria-hidden="true"
          >
            <div class="flex size-16 items-center justify-center rounded-full bg-ios-success-mid">
              <svg viewBox="0 0 24 24" fill="none" class="size-8" aria-hidden="true">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="white"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
          </div>

          <h1
            class="font-heading text-[24px] font-semibold leading-[1.2] text-ios-fg-11"
            dir="auto"
          >
            {{ lang.t('payments.checkout.success.title') }}
          </h1>
          <p class="font-body text-[16px] font-medium leading-[1.5] text-ios-fg-8" dir="auto">
            {{ lang.t('payments.checkout.success.body') }}
          </p>

          <a
            routerLink="/dashboard/certificates"
            class="mt-4 inline-flex h-12 items-center justify-center rounded-xl bg-ios-fg-13 px-6 font-body text-[16px] font-semibold text-white transition-colors hover:bg-ios-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
          >
            {{ lang.t('payments.checkout.success.viewCertificates') }}
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
export class PaymentSuccessPage implements OnInit {
  protected readonly lang = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  private readonly payments = inject(PaymentsStore);

  protected readonly yearStr = String(new Date().getFullYear());

  /**
   * Stripe's `{CHECKOUT_SESSION_ID}` placeholder, present for logging/support
   * purposes only — there is no frontend endpoint to look it up, so it is
   * never displayed or used to drive UI state.
   */
  private readonly sessionId = this.route.snapshot.queryParamMap.get('session_id');

  ngOnInit(): void {
    if (!this.sessionId) return;
    // Best-effort refresh of the transaction list so a subsequent visit to
    // "My Certificates" / transaction history is as fresh as possible. Not
    // awaited or surfaced here — this page never blocks on it or claims
    // certainty from it (see class doc: no session-status endpoint exists).
    void this.payments.load();
  }
}

export default PaymentSuccessPage;
