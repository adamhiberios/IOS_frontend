import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Location, NgOptimizedImage } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LucideArrowLeft, LucideCircleCheck } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import {
  CanadaFlag,
  CertificatesBadge,
  IosIcon,
  Select,
  type SelectOption,
  provideIcons,
} from '@ui';

import { PaymentsStore } from '../data-access/payments.store';
import { PaymentSuccessDialog } from '../components/payment-success-dialog';
import { resolveTrackClass } from '../utils/track-theme';

/** Fixed list — real payment-method selection is decorative here; the actual
 *  card entry happens on Stripe's hosted page (see the `onSubmit` doc). */
const PAYMENT_METHODS = ['visa', 'mastercard', 'amex'] as const;

/**
 * `ios-place-order-page` — Checkout / "Complete payment" page.
 *
 * ┌── Layout (two columns, full-bleed right panel) ──────────────────────────┐
 * │  navbar (logo only, translucent)                                        │
 * │  [←] Complete payment                                                   │
 * │                                                                          │
 * │  ┌─ form (464px) ──────────┐   ┌─ order summary panel (track-themed) ──┐ │
 * │  │ Select payment method    │   │ Order summary                       │ │
 * │  │ Promotion code           │   │ [badge] Title / level                │ │
 * │  │ ── divider ──             │   │ items amount / tax / discount        │ │
 * │  │ Cardholder name           │   │ Total                                │ │
 * │  │ Card number                │   │                                     │ │
 * │  │ Expiration date / CVV      │   │        [Complete Payment]            │ │
 * │  └───────────────────────────┘   └──────────────────────────────────────┘ │
 * │  Accepted secure payment methods (logo strip)                            │
 * │  footer (copyright)                                                      │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * Data flow: the item being purchased (certId/title/code/price) is passed by
 * the caller as query params — this feature owns no cross-feature import into
 * `catalog`/`courses`/`dashboard` (CLAUDE.md §5), so the linking page (a future
 * "Buy now" CTA) is the source of truth for what's in the cart. Missing/invalid
 * params render an empty-cart notice instead of a fabricated order.
 *
 * PCI note: the Cardholder name / Card number / Expiration / CVV fields below
 * are rendered to match the Figma design, but their values are **never** sent
 * to our backend. `PaymentsStore.checkout()` only ever receives `certId` +
 * `promoCode` — actual card capture happens on Stripe's hosted Checkout page
 * (`checkoutUrl`), keeping raw PAN data out of our PCI scope entirely. A paid
 * charge redirects the browser there; a $0 charge (free enrollment) completes
 * immediately and opens {@link PaymentSuccessDialog}.
 *
 * Figma: node 13044:11509 (Place order).
 */
@Component({
  selector: 'ios-place-order-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NgOptimizedImage,
    IosIcon,
    CanadaFlag,
    CertificatesBadge,
    PaymentSuccessDialog,
    Select,
  ],
  providers: [provideIcons(LucideArrowLeft, LucideCircleCheck)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen flex-col bg-white">
      @if (!hasOrder()) {
        <!-- ── Focused-checkout logo bar (empty-order case only) ── -->
        <div class="w-full px-8 py-6 self-start">
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

        <!-- ── Empty-cart notice: no certId / item was passed in ── -->
        <main class="flex-1" id="main-content">
          <div class="mx-auto max-w-[1400px] px-8 py-16 text-center">
            <p class="text-[18px] font-medium text-ios-fg-8">
              {{ lang.t('payments.checkout.emptyOrder') }}
            </p>
            <a
              routerLink="/dashboard/certificates"
              class="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-ios-fg-13 px-5 font-semibold text-white transition-colors hover:bg-ios-fg"
            >
              {{ lang.t('dashboard.certs.backToCertificates') }}
            </a>
          </div>
        </main>
      } @else {
        <main class="flex flex-1 flex-col lg:flex-row" id="main-content">
          <!-- ── Left: logo + form column (white) ── -->
          <div class="flex flex-1 flex-col items-center px-6 py-6 lg:px-16 lg:py-8">
            <div class="px-8 py-6 self-start">
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

            <div class="mb-6 flex items-center gap-3">
              <button
                type="button"
                class="flex h-11 w-11 shrink-0 items-center justify-center overflow-clip rounded-xl bg-ios-surface-soft text-ios-fg transition-colors hover:bg-ios-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                [attr.aria-label]="lang.t('common.back')"
                (click)="onBack()"
              >
                <ios-icon name="arrow-left" class="size-5 rtl:rotate-180" aria-hidden="true" />
              </button>
              <h1
                class="font-heading text-[24px] font-bold leading-[1.2] text-ios-fg-13"
                dir="auto"
              >
                {{ lang.t('payments.checkout.title') }}
              </h1>
            </div>

            <form
              class="flex w-full max-w-[464px] flex-col gap-5"
              (ngSubmit)="onSubmit()"
              [formGroup]="form"
            >
              <div class="flex flex-col gap-3">
                <!-- Payment method -->
                <div class="flex flex-col items-start gap-1">
                  <label
                    for="paymentMethod"
                    class="w-full text-start font-body text-[16px] font-semibold leading-[1.4] text-ios-fg"
                  >
                    {{ lang.t('payments.checkout.selectMethodLabel') }}
                  </label>
                  <ios-select
                    id="paymentMethod"
                    label=""
                    class="w-full"
                    [options]="methodOptions()"
                    [placeholder]="lang.t('payments.checkout.selectMethodPlaceholder')"
                    [control]="form.controls.paymentMethod"
                  />
                </div>

                <!-- Promotion code -->
                <div class="flex flex-col items-start gap-1">
                  <label
                    for="promoCode"
                    class="w-full text-start font-body text-[16px] font-semibold leading-[1.4] text-ios-fg"
                  >
                    {{ lang.t('payments.checkout.promoLabel') }}
                  </label>
                  <div class="relative w-full">
                    <input
                      id="promoCode"
                      type="text"
                      formControlName="promoCode"
                      [placeholder]="lang.t('payments.checkout.promoPlaceholder')"
                      class="w-full rounded-lg border border-ios-line bg-ios-surface-mid p-3 pe-10 font-body text-[16px] font-bold leading-[1.3] text-ios-fg placeholder:font-medium placeholder:text-ios-fg-7 focus:outline-none focus:ring-2 focus:ring-ios-brand-primary/40"
                    />
                    @if (form.controls.promoCode.value.trim()) {
                      <ios-icon
                        name="circle-check"
                        class="pointer-events-none absolute end-3 top-1/2 size-6 -translate-y-1/2 text-ios-success-mid"
                        aria-hidden="true"
                      />
                    }
                  </div>
                </div>
              </div>

              <hr class="w-full border-ios-line-strong" />

              <div class="flex flex-col gap-3">
                <!-- Cardholder name -->
                <div class="flex flex-col items-start gap-1">
                  <label
                    for="cardholderName"
                    class="w-full text-start font-body text-[16px] font-semibold leading-[1.4] text-ios-fg"
                  >
                    {{ lang.t('payments.checkout.cardholderLabel') }}
                  </label>
                  <input
                    id="cardholderName"
                    type="text"
                    autocomplete="cc-name"
                    formControlName="cardholderName"
                    [placeholder]="lang.t('payments.checkout.cardholderPlaceholder')"
                    class="w-full rounded-lg border border-ios-line bg-ios-surface-mid p-3 font-body text-[16px] font-medium leading-[1.4] text-ios-fg placeholder:text-ios-fg-7 focus:outline-none focus:ring-2 focus:ring-ios-brand-primary/40"
                  />
                </div>

                <!-- Card number -->
                <div class="flex flex-col items-start gap-1">
                  <label
                    for="cardNumber"
                    class="w-full text-start font-body text-[16px] font-semibold leading-[1.4] text-ios-fg"
                  >
                    {{ lang.t('payments.checkout.cardNumberLabel') }}
                  </label>
                  <input
                    id="cardNumber"
                    type="text"
                    inputmode="numeric"
                    autocomplete="cc-number"
                    formControlName="cardNumber"
                    [placeholder]="lang.t('payments.checkout.cardNumberPlaceholder')"
                    class="w-full rounded-lg border border-ios-line bg-ios-surface-mid p-3 font-body text-[16px] font-medium leading-[1.4] text-ios-fg placeholder:text-ios-fg-7 focus:outline-none focus:ring-2 focus:ring-ios-brand-primary/40"
                  />
                </div>

                <!-- Expiration + CVV -->
                <div class="flex w-full items-start gap-3">
                  <div class="flex min-w-0 flex-1 flex-col items-start gap-1">
                    <label
                      for="expiry"
                      class="w-full text-start font-body text-[16px] font-semibold leading-[1.4] text-ios-fg"
                    >
                      {{ lang.t('payments.checkout.expiryLabel') }}
                    </label>
                    <input
                      id="expiry"
                      type="text"
                      inputmode="numeric"
                      autocomplete="cc-exp"
                      formControlName="expiry"
                      placeholder="MM/YY"
                      class="w-full rounded-lg border border-ios-line bg-ios-surface-mid p-3 font-body text-[16px] font-medium leading-[1.4] text-ios-fg placeholder:text-ios-fg-7 focus:outline-none focus:ring-2 focus:ring-ios-brand-primary/40"
                    />
                  </div>
                  <div class="flex min-w-0 flex-1 flex-col items-start gap-1">
                    <label
                      for="cvv"
                      class="w-full text-start font-body text-[16px] font-semibold leading-[1.4] text-ios-fg"
                    >
                      {{ lang.t('payments.checkout.cvvLabel') }}
                    </label>
                    <input
                      id="cvv"
                      type="text"
                      inputmode="numeric"
                      autocomplete="cc-csc"
                      formControlName="cvv"
                      [placeholder]="lang.t('payments.checkout.cvvPlaceholder')"
                      class="w-full rounded-lg border border-ios-line bg-ios-surface-mid p-3 font-body text-[16px] font-medium leading-[1.4] text-ios-fg placeholder:text-ios-fg-7 focus:outline-none focus:ring-2 focus:ring-ios-brand-primary/40"
                    />
                  </div>
                </div>
              </div>

              @if (payments.actionError(); as message) {
                <p role="alert" class="font-body text-[14px] font-medium text-ios-danger-mid">
                  {{ message }}
                </p>
              }
            </form>

            <!-- Accepted payment methods -->
            <div class="mt-6 flex w-full max-w-[464px] flex-col items-start gap-2">
              <p
                class="w-full text-start font-body text-[16px] font-medium leading-[1.4] text-ios-fg"
                dir="auto"
              >
                {{ lang.t('payments.checkout.acceptedMethods') }}
              </p>
              <img
                ngSrc="assets/icons/payments/accepted-payment-methods.png"
                [alt]="lang.t('payments.checkout.acceptedMethods')"
                width="503"
                height="25"
                class="h-6 w-auto"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>

          <!-- ── Right: order summary panel, track-themed, full-bleed from the top ── -->
          <div [class]="summaryPanelClass()">
            <div class="mx-auto flex w-full max-w-[440px] flex-col gap-16 py-8 lg:py-10">
              <p
                class="w-full font-heading text-[20px] font-semibold leading-[1.2] text-ios-fg-13"
                dir="auto"
              >
                {{ lang.t('payments.checkout.orderSummary') }}
              </p>

              <div class="flex w-full flex-col items-start gap-2">
                <div class="flex w-full items-center gap-6 py-3">
                  <ios-certificates-badge
                    [svgPath]="order()!.badgeSvgPath"
                    [code]="order()!.code"
                    [fullName]="order()!.title"
                    class="block h-[79px] w-[63px] shrink-0"
                  />
                  <div class="flex flex-col items-start gap-1">
                    <p
                      class="font-heading text-[20px] font-bold leading-[1.2] text-track-strong"
                      dir="auto"
                    >
                      {{ order()!.title }}
                    </p>
                    <p
                      class="font-body text-[16px] font-medium leading-[1.4] text-ios-fg-8"
                      dir="auto"
                    >
                      {{ order()!.subtitle }}
                    </p>
                  </div>
                </div>

                <hr class="w-full rotate-180 border-ios-line" />

                <div class="flex w-full flex-col items-start">
                  <div class="flex w-full flex-col items-start py-1">
                    <div class="flex w-full items-center px-6 py-2">
                      <p
                        class="w-[275px] font-body text-[16px] font-medium leading-[1.4] text-ios-fg"
                        dir="auto"
                      >
                        {{ lang.t('payments.checkout.itemsAmount') }}
                      </p>
                      <p
                        class="flex-1 text-end font-body text-[18px] font-bold leading-[1.2] text-ios-fg-11"
                      >
                        {{ formatMoney(order()!.itemAmount) }}
                      </p>
                    </div>
                    <div class="flex w-full items-center px-6 py-2">
                      <p
                        class="w-[275px] font-body text-[16px] font-medium leading-[1.4] text-ios-fg"
                        dir="auto"
                      >
                        {{ lang.t('payments.checkout.tax') }}
                      </p>
                      <p
                        class="flex-1 text-end font-body text-[18px] font-bold leading-[1.2] text-ios-fg-11"
                      >
                        {{ formatMoney(order()!.tax) }}
                      </p>
                    </div>
                    <div class="flex w-full items-center px-6 py-2">
                      <p
                        class="w-[275px] font-body text-[16px] font-medium leading-[1.4] text-ios-fg"
                        dir="auto"
                      >
                        {{ lang.t('payments.checkout.discount') }}
                      </p>
                      <p
                        class="flex-1 text-end font-body text-[18px] font-bold leading-[1.2] text-ios-fg-11"
                      >
                        {{ formatMoney(-order()!.discount) }}
                      </p>
                    </div>
                  </div>
                  <div
                    class="flex w-full items-center justify-between bg-track-soft px-6 py-3 text-track-strong"
                  >
                    <p
                      class="w-[275px] font-body text-[18px] font-semibold leading-[1.4]"
                      dir="auto"
                    >
                      {{ lang.t('payments.checkout.total') }}
                    </p>
                    <p class="font-heading text-[20px] font-bold leading-[1.2]">
                      {{ formatMoney(total()) }}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                class="mt-2 flex h-14 w-full items-center justify-center gap-3 overflow-clip rounded-xl bg-track-bg px-6 py-4 font-body text-[18px] font-semibold leading-[1.4] text-white transition-colors hover:bg-track-strong disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                [disabled]="payments.actionPending()"
                [attr.aria-busy]="payments.actionPending() || null"
                (click)="onSubmit()"
              >
                @if (payments.actionPending()) {
                  <span
                    class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                    aria-hidden="true"
                  ></span>
                }
                {{ lang.t('payments.checkout.completePayment') }}
              </button>
            </div>
          </div>
        </main>
      }

      <footer class="w-full bg-ios-brand-dark py-4">
        <div
          class="mx-auto flex max-w-[1400px] items-center justify-center gap-2 px-4 text-xs text-ios-brand-muted md:px-8"
        >
          <ios-canada-flag aria-hidden="true" />
          <span>{{ lang.t('common.copyright', { year: yearStr }) }}</span>
        </div>
      </footer>
    </div>

    @if (successDialogOpen()) {
      <ios-payment-success-dialog
        [certTitle]="order()?.title ?? ''"
        (dismissed)="successDialogOpen.set(false)"
        (goToDashboard)="successDialogOpen.set(false)"
      />
    }
  `,
})
export class PlaceOrderPage {
  protected readonly lang = inject(LanguageService);
  protected readonly payments = inject(PaymentsStore);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly fb = inject(NonNullableFormBuilder);

  /** `ios-select` options for the payment-method field, re-translated on locale change. */
  protected readonly methodOptions = computed<SelectOption[]>(() =>
    PAYMENT_METHODS.map((method) => ({
      value: method,
      label: this.lang.t('payments.checkout.method.' + method),
    })),
  );

  protected readonly currentYear = new Date().getFullYear();
  protected readonly yearStr = String(this.currentYear);
  protected readonly successDialogOpen = signal(false);

  /**
   * The item being purchased — sourced entirely from query params the linking
   * page supplies (`certId`, `title`, `code`, `subtitle`, `price`, `badge`).
   * Never fabricated: absent/invalid params fall through to the empty-cart
   * notice rather than showing an invented price (CLAUDE.md — backend is
   * authoritative for charges; this is a *display* estimate only, reconciled
   * server-side by `PaymentsStore.checkout()`).
   */
  protected readonly order = computed(() => {
    const q = this.route.snapshot.queryParamMap;
    const certId = q.get('certId');
    const title = q.get('title');
    const priceRaw = q.get('price');
    const itemAmount = priceRaw !== null ? Number(priceRaw) : NaN;
    if (!certId || !title || !Number.isFinite(itemAmount)) return null;

    const code = q.get('code') ?? '';
    const currency = q.get('currency') ?? 'USD';
    const tax = Number(q.get('tax') ?? '0') || 0;
    const discount = Number(q.get('discount') ?? '0') || 0;
    const badge = q.get('badge');

    return {
      certId,
      title,
      code,
      subtitle: q.get('subtitle') ?? code,
      currency,
      itemAmount,
      tax,
      discount,
      badgeSvgPath: badge ?? `assets/badge/${this.slugify(title)}.svg`,
    };
  });

  protected readonly hasOrder = computed(() => this.order() !== null);

  protected readonly total = computed(() => {
    const o = this.order();
    if (!o) return 0;
    return Math.max(0, o.itemAmount + o.tax - o.discount);
  });

  protected readonly summaryPanelClass = computed(
    () =>
      `${resolveTrackClass(this.order()?.code)} flex flex-1 items-center bg-track-softer px-6 lg:px-8`,
  );

  protected readonly form = this.fb.group({
    paymentMethod: this.fb.control(''),
    promoCode: this.fb.control(''),
    cardholderName: this.fb.control(''),
    cardNumber: this.fb.control(''),
    expiry: this.fb.control(''),
    cvv: this.fb.control(''),
  });

  protected formatMoney(amount: number): string {
    const currency = this.order()?.currency ?? 'USD';
    try {
      return new Intl.NumberFormat(this.lang.locale(), { style: 'currency', currency }).format(
        amount,
      );
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  private slugify(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  protected onBack(): void {
    this.location.back();
  }

  /**
   * "Complete Payment" — calls `PaymentsStore.checkout()` with only `certId`
   * and `promoCode`. Card fields on this page are never read here; see the
   * PCI note in the class doc above.
   */
  protected async onSubmit(): Promise<void> {
    const o = this.order();
    if (!o || this.payments.actionPending()) return;

    this.payments.clearActionError();
    const promoCode = this.form.controls.promoCode.value.trim() || undefined;
    const result = await this.payments.checkout({ certId: o.certId, promoCode });
    if (!result) return; // actionError() now carries the reason.

    if (result.status === 'redirect') {
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
      return;
    }

    // 'enrolled' — a $0 charge completed server-side; nothing to redirect to.
    this.successDialogOpen.set(true);
  }
}

export default PlaceOrderPage;
