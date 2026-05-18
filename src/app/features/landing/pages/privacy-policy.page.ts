/**
 * `ios-privacy-policy-page` — public Privacy Policy page.
 *
 * Structure (top → bottom):
 *   1. Navbar  — ios-landing-navbar
 *   2. Hero    — ios-page-hero (dark crimson background)
 *   3. Content — all privacy sections (Information We Collect → Contact Us)
 *   4. Footer  — ios-landing-footer
 *   5. Scroll-to-top — ios-scroll-to-top
 *
 * All strings are resolved through LanguageService.t() / tArray() for
 * EN / AR / FR i18n. Translation keys live under the `privacyPolicy.*`
 * namespace in assets/i18n/*.json.
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { LanguageService } from '@core/i18n';
import { ScrollToTop } from '@ui';

import { LandingNavbar } from '../components/landing-navbar';
import { LandingFooter } from '../components/landing-footer';
import { PageHero } from '../components/page-hero';

@Component({
  selector: 'ios-privacy-policy-page',
  imports: [LandingNavbar, LandingFooter, PageHero, ScrollToTop],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- 1. Navbar -->
    <ios-landing-navbar />

    <!-- 2. Hero banner -->
    <ios-page-hero
      [title]="lang.t('privacyPolicy.hero.title')"
      [showBreadcrumb]="true"
      [breadcrumbLabel]="lang.t('privacyPolicy.hero.breadcrumb.home')"
      breadcrumbLink="/"
      backLink="/"
      [ariaBackLabel]="lang.t('privacyPolicy.hero.back')"
    />

    <!-- 3. Privacy Policy content -->
    <main id="main-content" class="bg-white px-6 md:px-16 lg:px-[246px] py-14 lg:py-[72px]">
      <div class="flex flex-col gap-6 max-w-[1236px] mx-auto">
        <!-- Information We Collect -->
        <section aria-labelledby="privacy-collect">
          <h2
            id="privacy-collect"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('privacyPolicy.sections.infoWeCollect.heading') }}
          </h2>
          <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            {{ lang.t('privacyPolicy.sections.infoWeCollect.body') }}
          </p>
        </section>

        <!-- Personal Information -->
        <section aria-labelledby="privacy-personal">
          <h2
            id="privacy-personal"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('privacyPolicy.sections.personalInfo.heading') }}
          </h2>
          <ul
            class="list-disc ps-7 flex flex-col gap-1 font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid"
          >
            @for (item of lang.tArray('privacyPolicy.sections.personalInfo.items'); track item) {
              <li>{{ item }}</li>
            }
          </ul>
        </section>

        <!-- Learning & Certification Data -->
        <section aria-labelledby="privacy-learning">
          <h2
            id="privacy-learning"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('privacyPolicy.sections.learningData.heading') }}
          </h2>
          <ul
            class="list-disc ps-7 flex flex-col gap-1 font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid"
          >
            @for (item of lang.tArray('privacyPolicy.sections.learningData.items'); track item) {
              <li>{{ item }}</li>
            }
          </ul>
        </section>

        <!-- Technical Information -->
        <section aria-labelledby="privacy-technical">
          <h2
            id="privacy-technical"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('privacyPolicy.sections.technicalInfo.heading') }}
          </h2>
          <ul
            class="list-disc ps-7 flex flex-col gap-1 font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid"
          >
            @for (item of lang.tArray('privacyPolicy.sections.technicalInfo.items'); track item) {
              <li>{{ item }}</li>
            }
          </ul>
        </section>

        <!-- How We Use Your Information -->
        <section aria-labelledby="privacy-how-use">
          <h2
            id="privacy-how-use"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('privacyPolicy.sections.howWeUse.heading') }}
          </h2>
          <div class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            <p class="mb-2">{{ lang.t('privacyPolicy.sections.howWeUse.intro') }}</p>
            <ul class="list-disc ps-7 flex flex-col gap-1 mb-2">
              @for (item of lang.tArray('privacyPolicy.sections.howWeUse.items'); track item) {
                <li>{{ item }}</li>
              }
            </ul>
            <p>{{ lang.t('privacyPolicy.sections.howWeUse.outro') }}</p>
          </div>
        </section>

        <!-- Data Retention Policy -->
        <section aria-labelledby="privacy-retention">
          <h2
            id="privacy-retention"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('privacyPolicy.sections.dataRetention.heading') }}
          </h2>
          <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            {{ lang.t('privacyPolicy.sections.dataRetention.body') }}
          </p>
        </section>

        <!-- Third-Party Sharing -->
        <section aria-labelledby="privacy-third-party">
          <h2
            id="privacy-third-party"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('privacyPolicy.sections.thirdParty.heading') }}
          </h2>
          <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            {{ lang.t('privacyPolicy.sections.thirdParty.body') }}
          </p>
        </section>

        <!-- Security Measures -->
        <section aria-labelledby="privacy-security">
          <h2
            id="privacy-security"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('privacyPolicy.sections.security.heading') }}
          </h2>
          <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            {{ lang.t('privacyPolicy.sections.security.body') }}
          </p>
        </section>

        <!-- Your Rights -->
        <section aria-labelledby="privacy-rights">
          <h2
            id="privacy-rights"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('privacyPolicy.sections.yourRights.heading') }}
          </h2>
          <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            {{ lang.t('privacyPolicy.sections.yourRights.body') }}
          </p>
        </section>

        <!-- Cookies and Tracking Technologies -->
        <section aria-labelledby="privacy-cookies">
          <h2
            id="privacy-cookies"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('privacyPolicy.sections.cookies.heading') }}
          </h2>
          <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            {{ lang.t('privacyPolicy.sections.cookies.body') }}
          </p>
        </section>

        <!-- International Data Transfers -->
        <section aria-labelledby="privacy-international">
          <h2
            id="privacy-international"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('privacyPolicy.sections.international.heading') }}
          </h2>
          <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            {{ lang.t('privacyPolicy.sections.international.body') }}
          </p>
        </section>

        <!-- Changes to This Policy -->
        <section aria-labelledby="privacy-changes">
          <h2
            id="privacy-changes"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('privacyPolicy.sections.changes.heading') }}
          </h2>
          <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            {{ lang.t('privacyPolicy.sections.changes.body') }}
          </p>
        </section>

        <!-- Contact Us -->
        <section aria-labelledby="privacy-contact">
          <h2
            id="privacy-contact"
            class="font-heading font-bold text-[28px] leading-[1.2] text-ios-fg-10 mb-2"
          >
            {{ lang.t('privacyPolicy.sections.contactUs.heading') }}
          </h2>
          <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid">
            {{ lang.t('privacyPolicy.sections.contactUs.body') }}
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
export class PrivacyPolicyPage {
  protected readonly lang = inject(LanguageService);
}
