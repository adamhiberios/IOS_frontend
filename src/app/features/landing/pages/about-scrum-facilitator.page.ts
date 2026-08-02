/**
 * `ios-about-scrum-facilitator-page` — public "About Scrum Facilitator" page.
 *
 * Structure (top → bottom):
 *   1. Navbar            — ios-landing-navbar
 *   2. Page hero         — ios-cert-page-hero (ESF warm-brown #8E6636)
 *   3. Intro section     — single ESF badge + heading + description
 *   4. Why It Matters    — ios-cert-info-section (warm, image first)
 *   5. Who Should Learn  — ios-cert-info-section (white, card first)
 *   6. Career Opps       — ios-cert-info-section (warm, image first)
 *   7. FAQ / CTA         — ios-cert-faq-cta
 *   8. Certification Path — cream bg, single ESF certification card
 *   9. Contact section   — ios-landing-contact-section
 *  10. Footer            — ios-landing-footer
 *  11. Scroll-to-top     — ios-scroll-to-top
 *
 * All text is routed through `LanguageService.t()` for EN / AR / FR i18n.
 * Keys live under the `scrumFacilitator.*` namespace in assets/i18n/*.json.
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LucideArrowRight } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { CertificatesBadge, IosIcon, ScrollToTop, provideIcons } from '@ui';

import { LandingNavbar } from '../components/landing-navbar';
import { LandingFooter } from '../components/landing-footer';
import { LandingContactSection } from '../components/contact-section';
import { CertificationCard } from '../components/certification-card';
import { CertPageHero } from '../components/cert-page-hero';
import { CertInfoSection } from '../components/cert-info-section';
import { CertFaqCta } from '../components/cert-faq-cta';

@Component({
  selector: 'ios-about-scrum-facilitator-page',
  imports: [
    LandingNavbar,
    LandingFooter,
    LandingContactSection,
    CertificationCard,
    CertificatesBadge,
    IosIcon,
    ScrollToTop,
    CertPageHero,
    CertInfoSection,
    CertFaqCta,
  ],
  providers: [provideIcons(LucideArrowRight)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ═══════════════════════════════════════════════════════════
         1. Navbar
    ═══════════════════════════════════════════════════════════ -->
    <ios-landing-navbar />

    <!-- ═══════════════════════════════════════════════════════════
         2. Page Hero — ESF warm-brown #8E6636
    ═══════════════════════════════════════════════════════════ -->
    <ios-cert-page-hero
      bgColor="#8E6636"
      circle1Color="#A67D52"
      circle2Color="#6A4C28"
      [title]="lang.t('scrumFacilitator.hero.title')"
      [backLabel]="lang.t('scrumFacilitator.hero.back')"
      [breadcrumbHome]="lang.t('scrumFacilitator.hero.breadcrumb.home')"
      headingId="sf-hero-title"
    />

    <!-- ═══════════════════════════════════════════════════════════
         3. Intro — heading + description + ESF badge (single)
    ═══════════════════════════════════════════════════════════ -->
    <section
      class="bg-white px-6 md:px-10 lg:px-16 xl:px-[246px] py-[56px]"
      aria-labelledby="sf-intro-heading"
    >
      <div class="flex flex-col lg:flex-row items-center gap-12 xl:gap-[93px]">
        <!-- Copy -->
        <div class="flex flex-col gap-4 flex-1 min-w-0">
          <h2
            id="sf-intro-heading"
            class="font-heading text-[36px] md:text-[46px] leading-[1.2] flex flex-wrap items-baseline gap-3"
          >
            <span class="font-bold text-ios-brand-dark">
              {{ lang.t('scrumFacilitator.intro.headingPart1') }}
            </span>
            <span class="font-extrabold text-ios-brand-primary">
              {{ lang.t('scrumFacilitator.intro.headingPart2') }}
            </span>
          </h2>
          <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-muted">
            {{ lang.t('scrumFacilitator.intro.description') }}
          </p>
        </div>

        <!-- ESF Badge (single) -->
        <div
          class="relative shrink-0 flex items-end"
          role="img"
          [attr.aria-label]="lang.t('scrumFacilitator.intro.badgesAlt')"
        >
          <div
            class="absolute top-0 inset-x-0 h-4 rounded-sm bg-cer-blue-softer"
            aria-hidden="true"
          ></div>
          <div class="relative mt-4 w-[120px] md:w-[160px]">
            <ios-certificates-badge
              svgPath="/assets/badge/endorsed_scrum_facilitator.svg"
              code="ESF"
              fullName="Endorsed Scrum Facilitator"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         4. Why Scrum Facilitator Matters — warm bg, image start / card end
    ═══════════════════════════════════════════════════════════ -->
    <ios-cert-info-section
      bg="warm"
      headingId="sf-why-heading"
      [heading]="lang.t('scrumFacilitator.whyMatters.title')"
      [items]="whyItems()"
      imageSrc="/assets/images/certification_1.png"
      [imageAlt]="lang.t('scrumFacilitator.imageAlt.certificate')"
      [imageFirst]="true"
    />

    <!-- ═══════════════════════════════════════════════════════════
         5. Who Should Learn — white bg, card start / image end
    ═══════════════════════════════════════════════════════════ -->
    <ios-cert-info-section
      bg="white"
      headingId="sf-who-heading"
      [heading]="lang.t('scrumFacilitator.whoShouldLearn.title')"
      [items]="whoItems()"
      imageSrc="/assets/images/certification_1.png"
      [imageAlt]="lang.t('scrumFacilitator.imageAlt.certificate')"
      [imageFirst]="false"
    />

    <!-- ═══════════════════════════════════════════════════════════
         6. Career Opportunities — warm bg, image start / card end
    ═══════════════════════════════════════════════════════════ -->
    <ios-cert-info-section
      bg="warm"
      headingId="sf-career-heading"
      [heading]="lang.t('scrumFacilitator.careerOpportunities.title')"
      [items]="careerItems()"
      imageSrc="/assets/images/certification_1.png"
      [imageAlt]="lang.t('scrumFacilitator.imageAlt.certificate')"
      [imageFirst]="true"
    />

    <!-- ═══════════════════════════════════════════════════════════
         7. FAQ / CTA — brown bg fades into cream at image midpoint
    ═══════════════════════════════════════════════════════════ -->
    <ios-cert-faq-cta
      bgColor="#8E6636"
      headingId="sf-faq-heading"
      [badge]="lang.t('scrumFacilitator.faq.badge')"
      [heading1]="lang.t('scrumFacilitator.faq.headingPart1')"
      [heading2]="lang.t('scrumFacilitator.faq.headingPart2')"
      [description]="lang.t('scrumFacilitator.faq.description')"
      imageSrc="/assets/images/certification_1.png"
      [imageAlt]="lang.t('scrumFacilitator.imageAlt.certificate')"
    />

    <!-- ═══════════════════════════════════════════════════════════
         8. Certification Path — cream bg (single ESF card)
    ═══════════════════════════════════════════════════════════ -->
    <section
      class="bg-ios-surface-warm px-6 md:px-10 lg:px-16 xl:px-[246px] py-[72px]
             flex flex-col gap-8 items-center"
      aria-labelledby="sf-cert-heading"
    >
      <!-- Section header -->
      <div class="flex items-center justify-between w-full">
        <div class="flex flex-col gap-4 flex-1">
          <span
            class="self-start inline-flex items-center justify-center px-6 py-2 rounded-full border
                   font-heading font-semibold text-[14px] text-ios-brand-primary whitespace-nowrap
                   bg-ios-brand-gold-soft border-ios-brand-gold"
          >
            {{ lang.t('scrumFacilitator.certPath.badge') }}
          </span>

          <div class="flex flex-col gap-4">
            <h2
              id="sf-cert-heading"
              class="font-heading font-extrabold text-[32px] md:text-[36px] leading-[1.2]"
            >
              <span class="text-ios-brand-dark">
                {{ lang.t('scrumFacilitator.certPath.headingPart1') }}
              </span>
              <span class="text-ios-brand-primary">
                {{ lang.t('scrumFacilitator.certPath.headingPart2') }}
              </span>
            </h2>
            <p class="font-body font-medium text-[16px] leading-[1.4] text-ios-fg-muted">
              {{ lang.t('scrumFacilitator.certPath.description') }}
            </p>
            <div class="w-[274px] h-1 rounded-full bg-ios-brand-gold" aria-hidden="true"></div>
          </div>
        </div>
      </div>

      <!-- White card container -->
      <div
        class="bg-white border border-ios-border-light rounded-2xl p-6 w-full flex flex-col gap-6"
      >
        <p class="font-body font-medium text-[16px] leading-[1.4] text-ios-fg-muted">
          {{ lang.t('scrumFacilitator.certPath.trackDesc') }}
        </p>

        <!-- "Who Should Pursue This" info box -->
        <div class="flex items-start gap-3 p-4 rounded-2xl" style="background-color: #e9ebef;">
          <div
            class="flex-none flex items-center justify-center w-11 h-11 rounded-full shrink-0"
            style="background-color: #c9d0d9;"
            aria-hidden="true"
          >
            <span
              class="font-heading font-bold text-[16px] leading-none text-ios-fg-10"
              aria-hidden="true"
              >?</span
            >
          </div>
          <div class="flex flex-col gap-1">
            <p class="font-heading font-semibold text-[20px] leading-[1.2] text-ios-fg-10">
              {{ lang.t('scrumFacilitator.certPath.whoShouldPursue') }}
            </p>
            <p class="font-body font-medium text-[16px] leading-[1.4] text-ios-fg-muted">
              {{ lang.t('scrumFacilitator.certPath.whoShouldPursueDesc') }}
            </p>
          </div>
        </div>

        <!-- Single ESF certification card -->
        <div class="flex flex-col lg:flex-row gap-4 items-stretch">
          <ios-certification-card
            class="lg:max-w-[360px]"
            svgPath="/assets/badge/endorsed_scrum_facilitator.svg"
            [level]="lang.t('scrumFacilitator.certPath.foundationLevel')"
            code="ESF"
            [fullName]="lang.t('scrumFacilitator.certPath.esfName')"
            [hours]="lang.t('scrumFacilitator.certPath.hours')"
            [onlineLabel]="lang.t('scrumFacilitator.certPath.online')"
            [questions]="lang.t('scrumFacilitator.certPath.questions')"
            [startingAtLabel]="lang.t('scrumFacilitator.certPath.startingAt')"
            [price]="lang.t('scrumFacilitator.certPath.price')"
            [downloadLabel]="lang.t('scrumFacilitator.certPath.download')"
            [enrollLabel]="lang.t('scrumFacilitator.certPath.enroll')"
          />
        </div>
      </div>

      <!-- "Explore other Certifications" button — arrow flips in RTL -->
      <a
        href="/certifications"
        class="inline-flex items-center gap-2 px-4 py-3 h-11 rounded-xl border-[1.5px]
               font-body font-semibold text-[16px] leading-[1.4] whitespace-nowrap
               hover:opacity-80 transition-opacity
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
               bg-ios-brand-gold-soft"
        style="border-color: #ffea96; color: #736428;"
      >
        {{ lang.t('scrumFacilitator.certPath.exploreOthers') }}
        <ios-icon name="arrow-right" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
      </a>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         9. Contact
    ═══════════════════════════════════════════════════════════ -->
    <ios-landing-contact-section namespace="scrumFacilitator.contact" />

    <!-- ═══════════════════════════════════════════════════════════
        10. Footer
    ═══════════════════════════════════════════════════════════ -->
    <ios-landing-footer />

    <ios-scroll-to-top />
  `,
})
export class AboutScrumFacilitatorPage {
  protected readonly lang = inject(LanguageService);

  protected readonly whyItems = computed<readonly string[]>(() => [
    this.lang.t('scrumFacilitator.whyMatters.point1'),
    this.lang.t('scrumFacilitator.whyMatters.point2'),
    this.lang.t('scrumFacilitator.whyMatters.point3'),
    this.lang.t('scrumFacilitator.whyMatters.point4'),
  ]);

  protected readonly whoItems = computed<readonly string[]>(() => [
    this.lang.t('scrumFacilitator.whoShouldLearn.point1'),
    this.lang.t('scrumFacilitator.whoShouldLearn.point2'),
    this.lang.t('scrumFacilitator.whoShouldLearn.point3'),
    this.lang.t('scrumFacilitator.whoShouldLearn.point4'),
    this.lang.t('scrumFacilitator.whoShouldLearn.point5'),
    this.lang.t('scrumFacilitator.whoShouldLearn.point6'),
  ]);

  protected readonly careerItems = computed<readonly string[]>(() => [
    this.lang.t('scrumFacilitator.careerOpportunities.point1'),
    this.lang.t('scrumFacilitator.careerOpportunities.point2'),
    this.lang.t('scrumFacilitator.careerOpportunities.point3'),
    this.lang.t('scrumFacilitator.careerOpportunities.point4'),
    this.lang.t('scrumFacilitator.careerOpportunities.point5'),
  ]);
}
