/**
 * `ios-about-scrum-master-page` — public "About Scrum Master" page.
 *
 * Structure (top → bottom):
 *   1. Navbar            — ios-landing-navbar
 *   2. Page hero         — ios-cert-page-hero (ESM dark-navy #184865)
 *   3. Intro section     — badge trio + heading + description
 *   4. Why It Matters    — ios-cert-info-section (warm, image first)
 *   5. Who Should Learn  — ios-cert-info-section (white, card first)
 *   6. Career Opps       — ios-cert-info-section (warm, image first)
 *   7. FAQ / CTA         — ios-cert-faq-cta
 *   8. Certification Path — cream bg, three certification cards (ESM / ESM-P / ESM-A)
 *   9. Contact section   — ios-landing-contact-section
 *  10. Footer            — ios-landing-footer
 *  11. Scroll-to-top     — ios-scroll-to-top
 *
 * All text is routed through `LanguageService.t()` for EN / AR / FR i18n.
 * Keys live under the `scrumMaster.*` namespace in assets/i18n/*.json.
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
  selector: 'ios-about-scrum-master-page',
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
         2. Page Hero — ESM dark-navy #184865
    ═══════════════════════════════════════════════════════════ -->
    <ios-cert-page-hero
      bgColor="#184865"
      circle1Color="#426981"
      circle2Color="#143D56"
      [title]="lang.t('scrumMaster.hero.title')"
      [backLabel]="lang.t('scrumMaster.hero.back')"
      [breadcrumbHome]="lang.t('scrumMaster.hero.breadcrumb.home')"
      headingId="sm-hero-title"
    />

    <!-- ═══════════════════════════════════════════════════════════
         3. Intro — heading + description + ESM badge trio
    ═══════════════════════════════════════════════════════════ -->
    <section
      class="bg-white px-6 md:px-10 lg:px-16 xl:px-[246px] py-[56px] max-w-[1440px] mx-auto"
      aria-labelledby="sm-intro-heading"
    >
      <div class="flex flex-col lg:flex-row items-center gap-12 xl:gap-[93px]">
        <!-- Copy -->
        <div class="flex flex-col gap-4 flex-1 min-w-0">
          <h2
            id="sm-intro-heading"
            class="font-heading text-[36px] md:text-[46px] leading-[1.2] flex flex-wrap items-baseline gap-3"
          >
            <span class="font-bold text-ios-brand-dark">
              {{ lang.t('scrumMaster.intro.headingPart1') }}
            </span>
            <span class="font-extrabold text-ios-brand-primary">
              {{ lang.t('scrumMaster.intro.headingPart2') }}
            </span>
          </h2>
          <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-muted">
            {{ lang.t('scrumMaster.intro.description') }}
          </p>
        </div>

        <!-- ESM Badge trio — flex row mirrors in RTL naturally -->
        <div
          class="relative shrink-0 flex items-end gap-3 md:gap-4"
          role="img"
          [attr.aria-label]="lang.t('scrumMaster.intro.badgesAlt')"
        >
          <div
            class="absolute top-0 inset-x-0 h-4 rounded-sm bg-cer-blue-softer"
            aria-hidden="true"
          ></div>

          <div class="relative mt-4 w-[120px] md:w-[136px]">
            <ios-certificates-badge
              svgPath="/assets/badge/endorsed_scrum_master.svg"
              code="ESM"
              fullName="Endorsed Scrum Master"
            />
          </div>
          <div class="relative mt-4 w-[120px] md:w-[136px]">
            <ios-certificates-badge
              svgPath="/assets/badge/endorsed_scrum_master_practitioner.svg"
              code="ESM-P"
              fullName="Endorsed Scrum Master Practitioner"
            />
          </div>
          <div class="relative mt-4 w-[120px] md:w-[136px]">
            <ios-certificates-badge
              svgPath="/assets/badge/endorsed_scrum_master_authority.svg"
              code="ESM-A"
              fullName="Endorsed Scrum Master Authority"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         4. Why Scrum Master Matters — warm bg, image start / card end
    ═══════════════════════════════════════════════════════════ -->
    <ios-cert-info-section
      bg="warm"
      headingId="sm-why-heading"
      [heading]="lang.t('scrumMaster.whyMatters.title')"
      [items]="whyItems()"
      imageSrc="/assets/images/certification_1.png"
      [imageAlt]="lang.t('scrumMaster.imageAlt.certificate')"
      [imageFirst]="true"
    />

    <!-- ═══════════════════════════════════════════════════════════
         5. Who Should Learn — white bg, card start / image end
    ═══════════════════════════════════════════════════════════ -->
    <ios-cert-info-section
      bg="white"
      headingId="sm-who-heading"
      [heading]="lang.t('scrumMaster.whoShouldLearn.title')"
      [items]="whoItems()"
      imageSrc="/assets/images/certification_1.png"
      [imageAlt]="lang.t('scrumMaster.imageAlt.certificate')"
      [imageFirst]="false"
    />

    <!-- ═══════════════════════════════════════════════════════════
         6. Career Opportunities — warm bg, image start / card end
    ═══════════════════════════════════════════════════════════ -->
    <ios-cert-info-section
      bg="warm"
      headingId="sm-career-heading"
      [heading]="lang.t('scrumMaster.careerOpportunities.title')"
      [items]="careerItems()"
      imageSrc="/assets/images/certification_1.png"
      [imageAlt]="lang.t('scrumMaster.imageAlt.certificate')"
      [imageFirst]="true"
    />

    <!-- ═══════════════════════════════════════════════════════════
         7. FAQ / CTA — navy bg fades into cream at image midpoint
    ═══════════════════════════════════════════════════════════ -->
    <ios-cert-faq-cta
      bgColor="#184865"
      headingId="sm-faq-heading"
      [badge]="lang.t('scrumMaster.faq.badge')"
      [heading1]="lang.t('scrumMaster.faq.headingPart1')"
      [heading2]="lang.t('scrumMaster.faq.headingPart2')"
      [description]="lang.t('scrumMaster.faq.description')"
      imageSrc="/assets/images/certification_1.png"
      [imageAlt]="lang.t('scrumMaster.imageAlt.certificate')"
    />

    <!-- ═══════════════════════════════════════════════════════════
         8. Certification Path — cream bg
    ═══════════════════════════════════════════════════════════ -->
    <section
      class="bg-ios-surface-warm px-6 md:px-10 lg:px-16 xl:px-[246px] py-[72px] max-w-[1440px] mx-auto
             flex flex-col gap-8 items-center"
      aria-labelledby="sm-cert-heading"
    >
      <!-- Section header -->
      <div class="flex items-center justify-between w-full">
        <div class="flex flex-col gap-4 flex-1">
          <span
            class="self-start inline-flex items-center justify-center px-6 py-2 rounded-full border
                   font-heading font-semibold text-[14px] text-ios-brand-primary whitespace-nowrap
                   bg-ios-brand-gold-soft border-ios-brand-gold"
          >
            {{ lang.t('scrumMaster.certPath.badge') }}
          </span>

          <div class="flex flex-col gap-4">
            <h2
              id="sm-cert-heading"
              class="font-heading font-extrabold text-[32px] md:text-[36px] leading-[1.2]"
            >
              <span class="text-ios-brand-dark">
                {{ lang.t('scrumMaster.certPath.headingPart1') }}
              </span>
              <span class="text-ios-brand-primary">
                {{ lang.t('scrumMaster.certPath.headingPart2') }}
              </span>
            </h2>
            <p class="font-body font-medium text-[16px] leading-[1.4] text-ios-fg-muted">
              {{ lang.t('scrumMaster.certPath.description') }}
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
          {{ lang.t('scrumMaster.certPath.trackDesc') }}
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
              {{ lang.t('scrumMaster.certPath.whoShouldPursue') }}
            </p>
            <p class="font-body font-medium text-[16px] leading-[1.4] text-ios-fg-muted">
              {{ lang.t('scrumMaster.certPath.whoShouldPursueDesc') }}
            </p>
          </div>
        </div>

        <!-- Three certification cards -->
        <div class="flex flex-col lg:flex-row gap-4 items-stretch">
          <ios-certification-card
            class="lg:flex-1 lg:min-w-0"
            svgPath="/assets/badge/endorsed_scrum_master.svg"
            [level]="lang.t('scrumMaster.certPath.foundationLevel')"
            code="ESM"
            [fullName]="lang.t('scrumMaster.certPath.esmName')"
            [hours]="lang.t('scrumMaster.certPath.hours')"
            [onlineLabel]="lang.t('scrumMaster.certPath.online')"
            [questions]="lang.t('scrumMaster.certPath.questions')"
            [startingAtLabel]="lang.t('scrumMaster.certPath.startingAt')"
            [price]="lang.t('scrumMaster.certPath.price')"
            [downloadLabel]="lang.t('scrumMaster.certPath.download')"
            [enrollLabel]="lang.t('scrumMaster.certPath.enroll')"
          />
          <ios-certification-card
            class="lg:flex-1 lg:min-w-0"
            svgPath="/assets/badge/endorsed_scrum_master_practitioner.svg"
            [level]="lang.t('scrumMaster.certPath.practitionerLevel')"
            code="ESM-P"
            [fullName]="lang.t('scrumMaster.certPath.esmpName')"
            [hours]="lang.t('scrumMaster.certPath.hours')"
            [onlineLabel]="lang.t('scrumMaster.certPath.online')"
            [questions]="lang.t('scrumMaster.certPath.questions')"
            [startingAtLabel]="lang.t('scrumMaster.certPath.startingAt')"
            [price]="lang.t('scrumMaster.certPath.price')"
            [downloadLabel]="lang.t('scrumMaster.certPath.download')"
            [enrollLabel]="lang.t('scrumMaster.certPath.enroll')"
          />
          <ios-certification-card
            class="lg:flex-1 lg:min-w-0"
            svgPath="/assets/badge/endorsed_scrum_master_authority.svg"
            [level]="lang.t('scrumMaster.certPath.authorityLevel')"
            code="ESM-A"
            [fullName]="lang.t('scrumMaster.certPath.esmaName')"
            [hours]="lang.t('scrumMaster.certPath.hours')"
            [onlineLabel]="lang.t('scrumMaster.certPath.online')"
            [questions]="lang.t('scrumMaster.certPath.questions')"
            [startingAtLabel]="lang.t('scrumMaster.certPath.startingAt')"
            [price]="lang.t('scrumMaster.certPath.price')"
            [downloadLabel]="lang.t('scrumMaster.certPath.download')"
            [enrollLabel]="lang.t('scrumMaster.certPath.enroll')"
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
        {{ lang.t('scrumMaster.certPath.exploreOthers') }}
        <ios-icon name="arrow-right" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
      </a>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         9. Contact
    ═══════════════════════════════════════════════════════════ -->
    <ios-landing-contact-section namespace="scrumMaster.contact" />

    <!-- ═══════════════════════════════════════════════════════════
        10. Footer
    ═══════════════════════════════════════════════════════════ -->
    <ios-landing-footer />

    <ios-scroll-to-top />
  `,
})
export class AboutScrumMasterPage {
  protected readonly lang = inject(LanguageService);

  protected readonly whyItems = computed<readonly string[]>(() => [
    this.lang.t('scrumMaster.whyMatters.point1'),
    this.lang.t('scrumMaster.whyMatters.point2'),
    this.lang.t('scrumMaster.whyMatters.point3'),
    this.lang.t('scrumMaster.whyMatters.point4'),
  ]);

  protected readonly whoItems = computed<readonly string[]>(() => [
    this.lang.t('scrumMaster.whoShouldLearn.point1'),
    this.lang.t('scrumMaster.whoShouldLearn.point2'),
    this.lang.t('scrumMaster.whoShouldLearn.point3'),
    this.lang.t('scrumMaster.whoShouldLearn.point4'),
    this.lang.t('scrumMaster.whoShouldLearn.point5'),
    this.lang.t('scrumMaster.whoShouldLearn.point6'),
  ]);

  protected readonly careerItems = computed<readonly string[]>(() => [
    this.lang.t('scrumMaster.careerOpportunities.point1'),
    this.lang.t('scrumMaster.careerOpportunities.point2'),
    this.lang.t('scrumMaster.careerOpportunities.point3'),
    this.lang.t('scrumMaster.careerOpportunities.point4'),
    this.lang.t('scrumMaster.careerOpportunities.point5'),
  ]);
}
