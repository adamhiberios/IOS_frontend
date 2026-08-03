import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';

import { LanguageService } from '@core/i18n';

/**
 * `ios-payment-success-dialog` — shown after `PaymentsStore.checkout()` /
 * `retake()` completes without a Stripe redirect (a $0 charge — the enrollment
 * or unlock already happened server-side, so there is nothing left to confirm).
 *
 * ┌── Layout (724px, white, rounded-8, centered overlay) ─────────────────┐
 * │                                                                        │
 * │                    ┌───────────────────────┐                          │
 * │                    │   (pale-green circle)  │                         │
 * │                    │      ✓ check (148px)    │                         │
 * │                    └───────────────────────┘                          │
 * │                                                                        │
 * │        You now joined the {{ certTitle }} course                     │
 * │        You can open your shopping cart to continue your purchase.    │
 * │                                                                        │
 * │      ┌─────────────────┐        ┌───────────────────────┐            │
 * │      │ Continue explore │        │  Ok, Go to dashboard  │           │
 * │      └─────────────────┘        └───────────────────────┘            │
 * │                                                                        │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Figma: node 13049:12413 (joined-success).
 */
@Component({
  selector: 'ios-payment-success-dialog',
  standalone: true,
  imports: [RouterLink, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      aria-hidden="true"
    >
      <div
        class="relative flex w-[724px] max-w-full flex-col items-center gap-9 rounded-lg bg-white p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-success-title"
      >
        <!-- Checkmark badge -->
        <div
          class="flex shrink-0 items-center rounded-full bg-ios-success-50 p-4"
          aria-hidden="true"
        >
          <img
            ngSrc="assets/icons/payments/payment-success-check.svg"
            alt=""
            width="96"
            height="96"
            class="size-[96px]"
            loading="eager"
            decoding="async"
          />
        </div>

        <div class="flex w-full flex-col items-center gap-[42px]">
          <div class="flex w-full flex-col items-center gap-1 text-center">
            <p
              id="payment-success-title"
              class="w-full font-heading text-[24px] font-semibold leading-[1.2] text-ios-fg-11"
              dir="auto"
            >
              {{ lang.t('payments.checkout.successDialog.title', { certTitle: certTitle() }) }}
            </p>
            <p
              class="w-full font-body text-[18px] font-medium leading-[1.4] text-ios-fg-10"
              dir="auto"
            >
              {{ lang.t('payments.checkout.successDialog.body') }}
            </p>
          </div>

          <div class="flex w-full items-center justify-center gap-6">
            <button
              type="button"
              class="flex h-14 flex-1 items-center justify-center gap-3 rounded-xl bg-ios-surface-soft px-6 py-4 font-body text-[18px] font-semibold leading-[1.4] text-ios-fg transition-colors hover:bg-ios-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
              (click)="dismissed.emit()"
            >
              {{ lang.t('payments.checkout.successDialog.continueExplore') }}
            </button>
            <a
              routerLink="/dashboard"
              class="flex h-14 flex-1 items-center justify-center gap-3 rounded-xl bg-ios-fg-13 px-6 py-4 font-body text-[18px] font-semibold leading-[1.4] text-white transition-colors hover:bg-ios-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
              (click)="goToDashboard.emit()"
            >
              {{ lang.t('payments.checkout.successDialog.goToDashboard') }}
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class PaymentSuccessDialog {
  protected readonly lang = inject(LanguageService);

  /** The certificate's display title, interpolated into the heading. */
  readonly certTitle = input.required<string>();

  /** "Continue explore" — caller closes the dialog and stays on the page. */
  readonly dismissed = output<void>();

  /** "Ok, Go to dashboard" — RouterLink navigates; this fires alongside for cleanup. */
  readonly goToDashboard = output<void>();
}
