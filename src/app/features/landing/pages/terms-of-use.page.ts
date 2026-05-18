/**
 * `ios-terms-of-use-page` — public Terms of Use page.
 *
 * Structure (top → bottom):
 *   1. Navbar  — ios-landing-navbar
 *   2. Hero    — ios-page-hero (dark crimson background)
 *   3. Content — all terms sections (Eligibility → Governing Law)
 *   4. Footer  — ios-landing-footer
 *   5. Scroll-to-top — ios-scroll-to-top
 *
 * All strings are resolved through LanguageService.t() for EN / AR / FR i18n.
 * Translation keys live under the `termsOfUse.*` namespace in assets/i18n/*.json.
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { LanguageService } from '@core/i18n';
import { ScrollToTop } from '@ui';

import { LandingNavbar } from '../components/landing-navbar';
import { LandingFooter } from '../components/landing-footer';
import { PageHero } from '../components/page-hero';

@Component({
  selector: 'ios-terms-of-use-page',
  imports: [LandingNavbar, LandingFooter, PageHero, ScrollToTop],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- 1. Navbar -->
    <ios-landing-navbar />

    <!-- 2. Hero banner -->
    <ios-page-hero
      [title]="lang.t('termsOfUse.hero.title')"
      [showBreadcrumb]="true"
      [breadcrumbLabel]="lang.t('termsOfUse.hero.breadcrumb.home')"
      breadcrumbLink="/"
      backLink="/"
      [ariaBackLabel]="lang.t('termsOfUse.hero.back')"
    />

    <!-- 3. Terms content -->
    <main id="main-content" class="bg-white px-6 md:px-16 lg:px-[246px] py-14 lg:py-[72px]">
      <div class="flex flex-col gap-6 max-w-[1236px] mx-auto">
        <!-- Eligibility -->
        <section aria-labelledby="terms-eligibility">
          <h2
            id="terms-eligibility"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('termsOfUse.sections.eligibility.heading') }}
          </h2>
          <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            {{ lang.t('termsOfUse.sections.eligibility.body') }}
          </p>
        </section>

        <!-- Account Registration -->
        <section aria-labelledby="terms-account">
          <h2
            id="terms-account"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('termsOfUse.sections.accountRegistration.heading') }}
          </h2>
          <div class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            <p class="mb-2">{{ lang.t('termsOfUse.sections.accountRegistration.intro') }}</p>
            <ul class="list-disc ps-7 flex flex-col gap-1 mb-2">
              @for (
                item of lang.tArray('termsOfUse.sections.accountRegistration.items');
                track item
              ) {
                <li>{{ item }}</li>
              }
            </ul>
            <p>{{ lang.t('termsOfUse.sections.accountRegistration.outro') }}</p>
          </div>
        </section>

        <!-- Use of Services -->
        <section aria-labelledby="terms-use">
          <h2
            id="terms-use"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('termsOfUse.sections.useOfServices.heading') }}
          </h2>
          <div class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            <p class="mb-2">{{ lang.t('termsOfUse.sections.useOfServices.intro') }}</p>
            <ul class="list-disc ps-7 flex flex-col gap-1 mb-2">
              @for (item of lang.tArray('termsOfUse.sections.useOfServices.items'); track item) {
                <li>{{ item }}</li>
              }
            </ul>
            <p>{{ lang.t('termsOfUse.sections.useOfServices.outro') }}</p>
          </div>
        </section>

        <!-- Certification and Examinations -->
        <section aria-labelledby="terms-certification">
          <h2
            id="terms-certification"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('termsOfUse.sections.certification.heading') }}
          </h2>
          <div class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            <p class="mb-2">{{ lang.t('termsOfUse.sections.certification.intro') }}</p>
            <p class="mb-2">{{ lang.t('termsOfUse.sections.certification.reserveIntro') }}</p>
            <ul class="list-disc ps-7 flex flex-col gap-1 mb-2">
              @for (item of lang.tArray('termsOfUse.sections.certification.items'); track item) {
                <li>{{ item }}</li>
              }
            </ul>
            <p>{{ lang.t('termsOfUse.sections.certification.outro') }}</p>
          </div>
        </section>

        <!-- Payments and Refunds -->
        <section aria-labelledby="terms-payments">
          <h2
            id="terms-payments"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('termsOfUse.sections.payments.heading') }}
          </h2>
          <div class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            <p class="mb-2">{{ lang.t('termsOfUse.sections.payments.intro') }}</p>
            <p>{{ lang.t('termsOfUse.sections.payments.body') }}</p>
          </div>
        </section>

        <!-- Intellectual Property -->
        <section aria-labelledby="terms-ip">
          <h2
            id="terms-ip"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('termsOfUse.sections.intellectualProperty.heading') }}
          </h2>
          <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            {{ lang.t('termsOfUse.sections.intellectualProperty.body') }}
          </p>
        </section>

        <!-- Limitation of Liability -->
        <section aria-labelledby="terms-liability">
          <h2
            id="terms-liability"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('termsOfUse.sections.liability.heading') }}
          </h2>
          <div class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            <p class="mb-2">{{ lang.t('termsOfUse.sections.liability.intro') }}</p>
            <p class="mb-2">{{ lang.t('termsOfUse.sections.liability.reserveIntro') }}</p>
            <ul class="list-disc ps-7 flex flex-col gap-1">
              @for (item of lang.tArray('termsOfUse.sections.liability.items'); track item) {
                <li>{{ item }}</li>
              }
            </ul>
          </div>
        </section>

        <!-- Indemnification -->
        <section aria-labelledby="terms-indemnification">
          <h2
            id="terms-indemnification"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('termsOfUse.sections.indemnification.heading') }}
          </h2>
          <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            {{ lang.t('termsOfUse.sections.indemnification.body') }}
          </p>
        </section>

        <!-- Termination -->
        <section aria-labelledby="terms-termination">
          <h2
            id="terms-termination"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('termsOfUse.sections.termination.heading') }}
          </h2>
          <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            {{ lang.t('termsOfUse.sections.termination.body') }}
          </p>
        </section>

        <!-- Governing Law -->
        <section aria-labelledby="terms-governing">
          <h2
            id="terms-governing"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('termsOfUse.sections.governingLaw.heading') }}
          </h2>
          <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            {{ lang.t('termsOfUse.sections.governingLaw.body') }}
          </p>
        </section>
      </div>
    </main>

    <!-- 4. Footer -->
    <ios-landing-footer />

    <!-- 5. Scroll-to-top -->
    <ios-scroll-to-top />
  `,
})
export class TermsOfUsePage {
  protected readonly lang = inject(LanguageService);
}
