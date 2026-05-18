/**
 * `ios-all-certifications-page` — "All Certifications" catalogue page.
 * Rebuilt pixel-faithful to Figma IOS-Prototype node-id 13030-4419.
 *
 * Sections (top → bottom):
 *   1.  Navbar
 *   2.  Page hero           — ios-cert-page-hero (#8b0000)
 *   3.  "What is this?"     — #fffcee, cert image, stat cards
 *   4.  Scrum Master Track  — #e8edf0, centered, 3 cards (navy)
 *   5.  Product Owner Track — white,   centered, 3 cards (green)
 *   6.  Scrum Facilitator   — #f4f0eb, centered, 1 card  (amber)
 *   7.  Compare table       — white, column-based flex layout
 *   8.  FAQ accordion       — #fffcee, 5 items
 *   9.  Contact             — ios-landing-contact-section
 *  10.  Footer              — ios-landing-footer
 *  11.  Scroll-to-top
 *
 * All user-visible strings are resolved through `LanguageService.t()`.
 * Keys live under `allCertifications.*` in assets/i18n/{en,ar,fr}.json.
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { LucideCheck, LucideChevronDown } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, ScrollToTop, provideIcons } from '@ui';

import { LandingNavbar } from '../components/landing-navbar';
import { LandingFooter } from '../components/landing-footer';
import { LandingContactSection } from '../components/contact-section';
import { CertificationCard } from '../components/certification-card';
import { CertPageHero } from '../components/cert-page-hero';

/** One cert column in the comparison table. */
interface CompCert {
  readonly code: string;
  readonly levelBg: string;
  readonly levelSuffix: string; // i18n key suffix in allCertifications.comparison.*
  readonly prereqSuffix: string;
  readonly prereqColor: string;
}

@Component({
  selector: 'ios-all-certifications-page',
  imports: [
    NgOptimizedImage,
    LandingNavbar,
    LandingFooter,
    LandingContactSection,
    CertificationCard,
    IosIcon,
    ScrollToTop,
    CertPageHero,
  ],
  providers: [provideIcons(LucideCheck, LucideChevronDown)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ═══════════════════════════════════════════════════════════
         1. Navbar
    ═══════════════════════════════════════════════════════════ -->
    <ios-landing-navbar />

    <!-- ═══════════════════════════════════════════════════════════
         2. Page Hero — brand primary red #8b0000
    ═══════════════════════════════════════════════════════════ -->
    <ios-cert-page-hero
      bgColor="#8b0000"
      circle1Color="#a02e2e"
      circle2Color="#760000"
      [title]="lang.t('allCertifications.hero.title')"
      [backLabel]="lang.t('allCertifications.hero.back')"
      [breadcrumbHome]="lang.t('allCertifications.hero.breadcrumb.home')"
      headingId="all-certs-hero-title"
    />

    <!-- ═══════════════════════════════════════════════════════════
         3. "What is this?" — cream bg #fffcee
              Layout (Figma 16289:56118):
                · Centered header block: badge → heading → description → gold bar
                · Below: 3 overlapping cert images with two stat cards floating
                  at bottom-left and middle-right
    ═══════════════════════════════════════════════════════════ -->
    <section
      class="bg-[#fffcee] px-6 md:px-10 lg:px-16 xl:px-[246px] py-[72px]"
      aria-labelledby="all-certs-intro-heading"
    >
      <!-- ── Centered header ──────────────────────────────────────── -->
      <div class="flex flex-col items-center gap-5 text-center mx-auto max-w-[1236px]">
        <!-- Badge pill -->
        <span
          class="inline-flex items-center px-4 py-1.5 rounded-full border
                 font-heading font-semibold text-[13px] leading-[1.4]"
          style="background-color: #faf0c8; border-color: #d9bd4c; color: #8b0000;"
        >
          {{ lang.t('allCertifications.intro.badge') }}
        </span>

        <!-- Heading -->
        <h2
          id="all-certs-intro-heading"
          class="font-heading font-extrabold text-[28px] md:text-[36px] leading-[1.2]"
        >
          <span style="color: #272827;">{{ lang.t('allCertifications.intro.headingPart1') }}</span>
          <span style="color: #8b0000;">{{ lang.t('allCertifications.intro.headingPart2') }}</span>
        </h2>

        <!-- Description -->
        <p
          class="font-body font-medium text-[15px] md:text-[16px] leading-[1.6]"
          style="color: #666766;"
        >
          {{ lang.t('allCertifications.intro.description') }}
        </p>

        <!-- Gold bar -->
        <div
          class="h-[4px] w-[180px] rounded-full"
          style="background-color: #d9bd4c;"
          aria-hidden="true"
        ></div>
      </div>

      <!-- ── Certificates display + floating stat cards ───────────── -->
      <!-- Desktop (lg+): pixel-faithful absolute overlay matching Figma -->
      <div class="hidden lg:block relative mx-auto mt-8 w-full max-w-[1168px] aspect-[1168/551]">
        <!-- Back cert (largest, centered) — Cert Template 1: 780x551 at (194, 0) -->
        <!-- Wrapper carries absolute positioning; fill img fills 100% of it -->
        <div
          class="absolute rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5"
          style="inset-inline-start: 16.61%; top: 0%; width: 66.78%; height: 100%; z-index: 2;"
        >
          <img
            ngSrc="/assets/images/certification.png"
            [alt]="lang.t('allCertifications.intro.imageAlt')"
            class="object-cover"
            fill
            loading="lazy"
            decoding="async"
          />
        </div>
        <!-- Left front cert — Cert Template 3 (SM-Practitioner): 640x452 at (74, 63) -->
        <div
          class="absolute rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5"
          style="inset-inline-start: 6.34%; top: 11.43%; width: 51.54%; height: 77.13%; z-index: 1;"
        >
          <img
            ngSrc="/assets/images/certification.png"
            [alt]="lang.t('allCertifications.intro.imageAlt')"
            class="object-cover"
            fill
            loading="lazy"
            decoding="async"
          />
        </div>
        <!-- Right front cert — Cert Template 2: 602x425 at (491, 63) -->
        <div
          class="absolute rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5"
          style="inset-inline-start: 42.04%; top: 11.43%; width: 51.54%; height: 77.13%; z-index: 1;"
        >
          <img
            ngSrc="/assets/images/certification.png"
            [alt]="lang.t('allCertifications.intro.imageAlt')"
            class="object-cover"
            fill
            loading="lazy"
            decoding="async"
          />
        </div>

        <!-- Stat 1: 12,000+ — bottom-left, 254x84 at (0, 417) -->
        <div
          class="absolute bg-white border-2 rounded-[14px] shadow-lg flex flex-col justify-center px-6"
          style="inset-inline-start: 0%; top: 75.68%; width: 21.75%; height: 15.25%; border-color: #d4a017; z-index: 4;"
        >
          <span class="font-heading font-black text-[24px] leading-[1.2]" style="color: #8b0000;">
            {{ lang.t('allCertifications.intro.stat1Value') }}
          </span>
          <span class="font-body text-[13px] leading-[1.4]" style="color: #6a7282;">
            {{ lang.t('allCertifications.intro.stat1Label') }}
          </span>
        </div>

        <!-- Stat 2: 6,000+ — middle-right, 249x84 at (919, 223) -->
        <div
          class="absolute bg-white border-2 rounded-[14px] shadow-lg flex flex-col justify-center px-6"
          style="inset-inline-start: 78.68%; top: 40.47%; width: 21.32%; height: 15.25%; border-color: #d4a017; z-index: 4;"
        >
          <span class="font-heading font-black text-[24px] leading-[1.2]" style="color: #8b0000;">
            {{ lang.t('allCertifications.intro.stat2Value') }}
          </span>
          <span class="font-body text-[13px] leading-[1.4]" style="color: #6a7282;">
            {{ lang.t('allCertifications.intro.stat2Label') }}
          </span>
        </div>
      </div>

      <!-- Mobile / tablet (< lg): stacked fallback -->
      <div class="lg:hidden mt-10 flex flex-col items-center gap-6">
        <div class="relative w-full max-w-[480px] aspect-[4/3]">
          <img
            ngSrc="/assets/images/certification.png"
            [alt]="lang.t('allCertifications.intro.imageAlt')"
            class="absolute inset-0 w-full h-full object-cover rounded-2xl shadow-2xl ring-1 ring-black/5"
            fill
            loading="lazy"
            decoding="async"
          />
        </div>
        <div class="grid grid-cols-2 gap-4 w-full max-w-[480px]">
          <div
            class="bg-white border-2 rounded-[14px] shadow-md p-4 flex flex-col gap-1"
            style="border-color: #d4a017;"
          >
            <span class="font-heading font-black text-[22px] leading-[1.2]" style="color: #8b0000;">
              {{ lang.t('allCertifications.intro.stat1Value') }}
            </span>
            <span class="font-body text-[12px] leading-[1.4]" style="color: #6a7282;">
              {{ lang.t('allCertifications.intro.stat1Label') }}
            </span>
          </div>
          <div
            class="bg-white border-2 rounded-[14px] shadow-md p-4 flex flex-col gap-1"
            style="border-color: #d4a017;"
          >
            <span class="font-heading font-black text-[22px] leading-[1.2]" style="color: #8b0000;">
              {{ lang.t('allCertifications.intro.stat2Value') }}
            </span>
            <span class="font-body text-[12px] leading-[1.4]" style="color: #6a7282;">
              {{ lang.t('allCertifications.intro.stat2Label') }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         4. Scrum Master Track — #e8edf0, navy accent #184865
    ═══════════════════════════════════════════════════════════ -->
    <section
      class="bg-[#e8edf0] border-b border-[#c4c5c4]
             px-6 md:px-10 lg:px-[120px] py-[72px]
             flex flex-col items-center gap-[24px]"
      aria-labelledby="all-certs-sm-heading"
    >
      <!-- Centered heading block -->
      <div class="flex flex-col items-center gap-4 text-center">
        <h2 id="all-certs-sm-heading" class="font-heading font-extrabold text-[36px] leading-[1.2]">
          <span style="color: #272827;">{{
            lang.t('allCertifications.tracks.scrumMaster.titlePart1')
          }}</span>
          <span style="color: #8b0000;">{{
            lang.t('allCertifications.tracks.scrumMaster.titlePart2')
          }}</span>
        </h2>
        <p
          class="font-body font-medium text-[16px] leading-[1.6] max-w-[560px]"
          style="color: #666766;"
        >
          {{ lang.t('allCertifications.tracks.scrumMaster.description') }}
        </p>
        <div
          class="h-[4px] w-[274px] rounded-full"
          style="background-color: #d9bd4c;"
          aria-hidden="true"
        ></div>
      </div>

      <!-- Three SM cards — navy theme (default certification-card colours) -->
      <div class="flex flex-col lg:flex-row gap-[24px] items-stretch w-full justify-center">
        <ios-certification-card
          class="flex-1 min-w-0"
          svgPath="/assets/badge/endorsed_scrum_master.svg"
          [level]="lang.t('allCertifications.tracks.scrumMaster.foundationLevel')"
          code="ESM"
          [fullName]="lang.t('allCertifications.tracks.scrumMaster.esmName')"
          [hours]="lang.t('allCertifications.shared.hours')"
          [onlineLabel]="lang.t('allCertifications.shared.online')"
          [questions]="lang.t('allCertifications.shared.questions')"
          [startingAtLabel]="lang.t('allCertifications.shared.startingAt')"
          [price]="lang.t('allCertifications.shared.price')"
          [downloadLabel]="lang.t('allCertifications.shared.download')"
          [enrollLabel]="lang.t('allCertifications.shared.enroll')"
          [showStartingAtPrice]="true"
        />
        <ios-certification-card
          class="flex-1 min-w-0"
          svgPath="/assets/badge/endorsed_scrum_master_practitioner.svg"
          [level]="lang.t('allCertifications.tracks.scrumMaster.practitionerLevel')"
          code="ESM-P"
          [fullName]="lang.t('allCertifications.tracks.scrumMaster.esmpName')"
          [hours]="lang.t('allCertifications.shared.hours')"
          [onlineLabel]="lang.t('allCertifications.shared.online')"
          [questions]="lang.t('allCertifications.shared.questions')"
          [startingAtLabel]="lang.t('allCertifications.shared.startingAt')"
          [price]="lang.t('allCertifications.shared.price')"
          [downloadLabel]="lang.t('allCertifications.shared.download')"
          [enrollLabel]="lang.t('allCertifications.shared.enroll')"
          [showStartingAtPrice]="true"
        />
        <ios-certification-card
          class="flex-1 min-w-0"
          svgPath="/assets/badge/endorsed_scrum_master_authority.svg"
          [level]="lang.t('allCertifications.tracks.scrumMaster.authorityLevel')"
          code="ESM-A"
          [fullName]="lang.t('allCertifications.tracks.scrumMaster.esmaName')"
          [hours]="lang.t('allCertifications.shared.hours')"
          [onlineLabel]="lang.t('allCertifications.shared.online')"
          [questions]="lang.t('allCertifications.shared.questions')"
          [startingAtLabel]="lang.t('allCertifications.shared.startingAt')"
          [price]="lang.t('allCertifications.shared.price')"
          [downloadLabel]="lang.t('allCertifications.shared.download')"
          [enrollLabel]="lang.t('allCertifications.shared.enroll')"
          [showStartingAtPrice]="true"
        />
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         5. Product Owner Track — white, green accent #515e4d
    ═══════════════════════════════════════════════════════════ -->
    <section
      class="bg-white border-b border-[#c4c5c4]
             px-6 md:px-10 lg:px-[120px] py-[72px]
             flex flex-col items-center gap-[24px]"
      aria-labelledby="all-certs-po-heading"
    >
      <!-- Centered heading block -->
      <div class="flex flex-col items-center gap-4 text-center">
        <h2 id="all-certs-po-heading" class="font-heading font-extrabold text-[36px] leading-[1.2]">
          <span style="color: #272827;">{{
            lang.t('allCertifications.tracks.productOwner.titlePart1')
          }}</span>
          <span style="color: #8b0000;">{{
            lang.t('allCertifications.tracks.productOwner.titlePart2')
          }}</span>
        </h2>
        <p
          class="font-body font-medium text-[16px] leading-[1.6] max-w-[560px]"
          style="color: #666766;"
        >
          {{ lang.t('allCertifications.tracks.productOwner.description') }}
        </p>
        <div
          class="h-[4px] w-[274px] rounded-full"
          style="background-color: #d9bd4c;"
          aria-hidden="true"
        ></div>
      </div>

      <!-- Three PO cards — green theme -->
      <div class="flex flex-col lg:flex-row gap-[24px] items-stretch w-full justify-center">
        <ios-certification-card
          class="flex-1 min-w-0"
          svgPath="/assets/badge/endorsed_product_owner.svg"
          [level]="lang.t('allCertifications.tracks.productOwner.foundationLevel')"
          code="EPO"
          [fullName]="lang.t('allCertifications.tracks.productOwner.epoName')"
          [hours]="lang.t('allCertifications.shared.hours')"
          [onlineLabel]="lang.t('allCertifications.shared.online')"
          [questions]="lang.t('allCertifications.shared.questions')"
          [startingAtLabel]="lang.t('allCertifications.shared.startingAt')"
          [price]="lang.t('allCertifications.shared.price')"
          [downloadLabel]="lang.t('allCertifications.shared.download')"
          [enrollLabel]="lang.t('allCertifications.shared.enroll')"
          levelBgColor="#515e4d"
          levelTextColor="#eef3ec"
          priceColor="#515e4d"
          downloadBgColor="#eef3ec"
          downloadTextColor="#2a3628"
          enrollBgColor="#515e4d"
        />
        <ios-certification-card
          class="flex-1 min-w-0"
          svgPath="/assets/badge/endorsed_product_owner_practitioner.svg"
          [level]="lang.t('allCertifications.tracks.productOwner.practitionerLevel')"
          code="EPO-P"
          [fullName]="lang.t('allCertifications.tracks.productOwner.epopName')"
          [hours]="lang.t('allCertifications.shared.hours')"
          [onlineLabel]="lang.t('allCertifications.shared.online')"
          [questions]="lang.t('allCertifications.shared.questions')"
          [startingAtLabel]="lang.t('allCertifications.shared.startingAt')"
          [price]="lang.t('allCertifications.shared.price')"
          [downloadLabel]="lang.t('allCertifications.shared.download')"
          [enrollLabel]="lang.t('allCertifications.shared.enroll')"
          levelBgColor="#515e4d"
          levelTextColor="#eef3ec"
          priceColor="#515e4d"
          downloadBgColor="#eef3ec"
          downloadTextColor="#2a3628"
          enrollBgColor="#515e4d"
        />
        <ios-certification-card
          class="flex-1 min-w-0"
          svgPath="/assets/badge/endorsed_product_owner_authority.svg"
          [level]="lang.t('allCertifications.tracks.productOwner.authorityLevel')"
          code="EPO-A"
          [fullName]="lang.t('allCertifications.tracks.productOwner.epoaName')"
          [hours]="lang.t('allCertifications.shared.hours')"
          [onlineLabel]="lang.t('allCertifications.shared.online')"
          [questions]="lang.t('allCertifications.shared.questions')"
          [startingAtLabel]="lang.t('allCertifications.shared.startingAt')"
          [price]="lang.t('allCertifications.shared.price')"
          [downloadLabel]="lang.t('allCertifications.shared.download')"
          [enrollLabel]="lang.t('allCertifications.shared.enroll')"
          levelBgColor="#515e4d"
          levelTextColor="#eef3ec"
          priceColor="#515e4d"
          downloadBgColor="#eef3ec"
          downloadTextColor="#2a3628"
          enrollBgColor="#515e4d"
        />
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         6. Scrum Facilitator Track — #f4f0eb, amber accent #8e6636
    ═══════════════════════════════════════════════════════════ -->
    <section
      class="bg-[#f4f0eb] border-b border-[#c4c5c4]
             px-6 md:px-10 lg:px-[120px] py-[72px]
             flex flex-col items-center gap-[24px]"
      aria-labelledby="all-certs-sf-heading"
    >
      <!-- Centered heading block -->
      <div class="flex flex-col items-center gap-4 text-center">
        <h2 id="all-certs-sf-heading" class="font-heading font-extrabold text-[36px] leading-[1.2]">
          <span style="color: #272827;">{{
            lang.t('allCertifications.tracks.scrumFacilitator.titlePart1')
          }}</span>
          <span style="color: #8b0000;">{{
            lang.t('allCertifications.tracks.scrumFacilitator.titlePart2')
          }}</span>
        </h2>
        <p
          class="font-body font-medium text-[16px] leading-[1.6] max-w-[560px]"
          style="color: #666766;"
        >
          {{ lang.t('allCertifications.tracks.scrumFacilitator.description') }}
        </p>
        <div
          class="h-[4px] w-[274px] rounded-full"
          style="background-color: #d9bd4c;"
          aria-hidden="true"
        ></div>
      </div>

      <!-- Single ESF card — centered, amber theme -->
      <div class="flex justify-center w-full">
        <ios-certification-card
          class="w-full max-w-[480px]"
          svgPath="/assets/badge/endorsed_scrum_facilitator.svg"
          [level]="lang.t('allCertifications.tracks.scrumFacilitator.foundationLevel')"
          code="ESF"
          [fullName]="lang.t('allCertifications.tracks.scrumFacilitator.esfName')"
          [hours]="lang.t('allCertifications.shared.hours')"
          [onlineLabel]="lang.t('allCertifications.shared.online')"
          [questions]="lang.t('allCertifications.shared.questions')"
          [startingAtLabel]="lang.t('allCertifications.shared.startingAt')"
          [price]="lang.t('allCertifications.shared.price')"
          [downloadLabel]="lang.t('allCertifications.shared.download')"
          [enrollLabel]="lang.t('allCertifications.shared.enroll')"
          levelBgColor="#a69075"
          levelTextColor="#ffffff"
          codeColor="#8e6636"
          fullNameColor="#654826"
          priceColor="#8e6636"
          downloadBgColor="#f4f0eb"
          downloadTextColor="#402e18"
          enrollBgColor="#8e6636"
        />
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         7. Compare All Certifications — white, column-based table
    ═══════════════════════════════════════════════════════════ -->
    <section
      class="bg-white px-6 md:px-10 lg:px-16 xl:px-[246px] py-[72px] flex flex-col gap-8"
      aria-labelledby="all-certs-comparison-heading"
    >
      <!-- Section header -->
      <div class="flex flex-col gap-4">
        <!-- Badge pill -->
        <span
          class="self-start inline-flex items-center px-4 py-1.5 rounded-full border
                 font-heading font-semibold text-[13px] leading-[1.4]"
          style="background-color: #faf0c8; border-color: #d9bd4c; color: #8b0000;"
        >
          {{ lang.t('allCertifications.comparison.badge') }}
        </span>

        <h2
          id="all-certs-comparison-heading"
          class="font-heading font-extrabold text-[36px] leading-[1.2]"
        >
          <span style="color: #272827;">{{
            lang.t('allCertifications.comparison.headingPart1')
          }}</span>
          <span style="color: #8b0000;">{{
            lang.t('allCertifications.comparison.headingPart2')
          }}</span>
        </h2>

        <div
          class="h-[4px] w-[274px] rounded-full"
          style="background-color: #d9bd4c;"
          aria-hidden="true"
        ></div>
      </div>

      <!-- Column-based comparison table -->
      <div
        class="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0"
        role="region"
        aria-label="Certification comparison table"
      >
        <div class="flex min-w-[680px] border border-[#dcdcdc] rounded-[12px] overflow-clip">
          <!-- ── Feature labels column ───────────────────────── -->
          <div class="flex flex-col w-[150px] shrink-0">
            <!-- header -->
            <div
              class="h-[50px] flex items-center px-4 border-b border-[#dcdcdc]"
              style="background-color: #8b0000;"
            >
              <span class="font-heading font-semibold text-[13px] text-white">
                {{ lang.t('allCertifications.comparison.featureLabel') }}
              </span>
            </div>
            <!-- rows -->
            <div class="h-[48px] flex items-center px-4 border-b border-[#dcdcdc]">
              <span class="font-body text-[13px]" style="color: #272827;">{{
                lang.t('allCertifications.comparison.levelLabel')
              }}</span>
            </div>
            <div class="h-[48px] flex items-center px-4 border-b border-[#dcdcdc]">
              <span class="font-body text-[13px]" style="color: #272827;">{{
                lang.t('allCertifications.comparison.durationLabel')
              }}</span>
            </div>
            <div class="h-[48px] flex items-center px-4 border-b border-[#dcdcdc]">
              <span class="font-body text-[13px]" style="color: #272827;">{{
                lang.t('allCertifications.comparison.priceLabel')
              }}</span>
            </div>
            <div class="h-[48px] flex items-center px-4 border-b border-[#dcdcdc]">
              <span class="font-body text-[13px]" style="color: #272827;">{{
                lang.t('allCertifications.comparison.certExpiryLabel')
              }}</span>
            </div>
            <div class="h-[48px] flex items-center px-4 border-b border-[#dcdcdc]">
              <span class="font-body text-[13px]" style="color: #272827;">{{
                lang.t('allCertifications.comparison.mockExamLabel')
              }}</span>
            </div>
            <div class="h-[48px] flex items-center px-4 border-b border-[#dcdcdc]">
              <span class="font-body text-[13px]" style="color: #272827;">{{
                lang.t('allCertifications.comparison.testIncludedLabel')
              }}</span>
            </div>
            <div class="h-[48px] flex items-center px-4">
              <span class="font-body text-[13px]" style="color: #272827;">{{
                lang.t('allCertifications.comparison.prerequisiteLabel')
              }}</span>
            </div>
          </div>

          <!-- ── Cert data columns (one per certification) ──── -->
          @for (cert of compCerts; track cert.code) {
            <div class="flex flex-col flex-1 border-s border-[#dcdcdc]">
              <!-- header -->
              <div
                class="h-[50px] flex items-center justify-center px-2 border-b border-[#8b0000]/30"
                style="background-color: #8b0000;"
              >
                <span class="font-heading font-semibold text-[13px] text-white text-center">{{
                  cert.code
                }}</span>
              </div>
              <!-- Level badge -->
              <div class="h-[48px] flex items-center justify-center px-2 border-b border-[#dcdcdc]">
                <span
                  class="inline-flex items-center justify-center px-2 py-0.5 rounded-full
                         font-heading font-medium text-[11px] text-white whitespace-nowrap"
                  [style.background-color]="cert.levelBg"
                >
                  {{ lang.t('allCertifications.comparison.' + cert.levelSuffix) }}
                </span>
              </div>
              <!-- Duration -->
              <div
                class="h-[48px] flex items-center justify-center px-2 border-b border-[#dcdcdc]
                          font-heading text-[13px]"
                style="color: #959695;"
              >
                16 hrs
              </div>
              <!-- Price -->
              <div
                class="h-[48px] flex items-center justify-center px-2 border-b border-[#dcdcdc]
                          font-heading font-extrabold text-[14px]"
                style="color: #8b0000;"
              >
                $299
              </div>
              <!-- Cert. Expiry ✓ -->
              <div class="h-[48px] flex items-center justify-center px-2 border-b border-[#dcdcdc]">
                <ios-icon name="check" class="w-4 h-4 text-green-600" aria-label="Included" />
              </div>
              <!-- Mock Exam ✓ -->
              <div class="h-[48px] flex items-center justify-center px-2 border-b border-[#dcdcdc]">
                <ios-icon name="check" class="w-4 h-4 text-green-600" aria-label="Included" />
              </div>
              <!-- Test Included ✓ -->
              <div class="h-[48px] flex items-center justify-center px-2 border-b border-[#dcdcdc]">
                <ios-icon name="check" class="w-4 h-4 text-green-600" aria-label="Included" />
              </div>
              <!-- Prerequisite -->
              <div class="h-[48px] flex items-center justify-center px-2 text-center">
                <span class="font-body text-[12px] leading-[1.3]" [style.color]="cert.prereqColor">
                  {{ lang.t('allCertifications.comparison.' + cert.prereqSuffix) }}
                </span>
              </div>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         8. FAQ — cream bg #fffcee, 5 accordion items
    ═══════════════════════════════════════════════════════════ -->
    <section
      class="bg-[#fffcee] px-6 md:px-10 lg:px-16 xl:px-[246px] py-[72px] flex flex-col gap-8"
      aria-labelledby="all-certs-faq-heading"
    >
      <!-- Section header -->
      <div class="flex flex-col items-center text-center gap-4">
        <!-- Badge pill -->
        <span
          class="inline-flex items-center px-4 py-1.5 rounded-full border
                 font-heading font-semibold text-[13px] leading-[1.4]"
          style="background-color: #faf0c8; border-color: #d9bd4c; color: #8b0000;"
        >
          {{ lang.t('allCertifications.faq.badge') }}
        </span>

        <h2
          id="all-certs-faq-heading"
          class="font-heading font-extrabold text-[36px] leading-[1.2]"
        >
          <span style="color: #272827;">{{ lang.t('allCertifications.faq.headingPart1') }}</span>
          <span style="color: #8b0000;">{{ lang.t('allCertifications.faq.headingPart2') }}</span>
        </h2>

        <div
          class="h-[4px] w-[274px] rounded-full"
          style="background-color: #d9bd4c;"
          aria-hidden="true"
        ></div>
      </div>

      <!-- Accordion items -->
      <div class="flex flex-col gap-3" role="list">
        @for (item of faqItems(); track $index) {
          <div
            class="bg-white border border-[#f1f1f1] rounded-[12px] overflow-hidden"
            role="listitem"
          >
            <!-- Question row (always visible) -->
            <button
              type="button"
              class="w-full h-[64px] flex items-center justify-between gap-4 px-5
                     font-heading font-semibold text-[16px] text-start
                     hover:bg-neutral-50 transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d9bd4c]"
              style="color: #272827;"
              [attr.aria-expanded]="openFaq() === $index"
              (click)="toggleFaq($index)"
            >
              <span>{{ item.q }}</span>
              <ios-icon
                name="chevron-down"
                class="w-5 h-5 shrink-0 transition-transform duration-200"
                [class.rotate-180]="openFaq() === $index"
                style="color: #272827;"
                aria-hidden="true"
              />
            </button>

            <!-- Answer (shown when open) -->
            @if (openFaq() === $index) {
              <div class="px-5 pb-5">
                <div class="h-px bg-[#f1f1f1] mb-4" aria-hidden="true"></div>
                <p class="font-body font-medium text-[15px] leading-[1.6]" style="color: #666766;">
                  {{ item.a }}
                </p>
              </div>
            }
          </div>
        }
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         9. Contact
    ═══════════════════════════════════════════════════════════ -->
    <ios-landing-contact-section namespace="allCertifications.contact" />

    <!-- ═══════════════════════════════════════════════════════════
        10. Footer
    ═══════════════════════════════════════════════════════════ -->
    <ios-landing-footer />

    <ios-scroll-to-top />
  `,
})
export class AllCertificationsPage {
  protected readonly lang = inject(LanguageService);

  /** Currently open FAQ index; -1 = all collapsed. */
  protected readonly openFaq = signal(-1);

  /**
   * Reactive FAQ items — re-computed on language switch so the questions and
   * answers are always in the currently active language.
   */
  protected readonly faqItems = computed(() => [
    { q: this.lang.t('allCertifications.faq.q1'), a: this.lang.t('allCertifications.faq.a1') },
    { q: this.lang.t('allCertifications.faq.q2'), a: this.lang.t('allCertifications.faq.a2') },
    { q: this.lang.t('allCertifications.faq.q3'), a: this.lang.t('allCertifications.faq.a3') },
    { q: this.lang.t('allCertifications.faq.q4'), a: this.lang.t('allCertifications.faq.a4') },
    { q: this.lang.t('allCertifications.faq.q5'), a: this.lang.t('allCertifications.faq.a5') },
  ]);

  /**
   * Static cert data for the comparison table.
   * `levelSuffix` and `prereqSuffix` are tailed onto
   * `allCertifications.comparison.` to form the full i18n key.
   */
  protected readonly compCerts: CompCert[] = [
    {
      code: 'ESM',
      levelBg: '#184865',
      levelSuffix: 'foundationLevel',
      prereqSuffix: 'prerequisiteNone',
      prereqColor: '#c0c0c0',
    },
    {
      code: 'ESM-P',
      levelBg: '#184865',
      levelSuffix: 'practitionerLevel',
      prereqSuffix: 'prerequisiteNone',
      prereqColor: '#c0c0c0',
    },
    {
      code: 'ESM-A',
      levelBg: '#184865',
      levelSuffix: 'authorityLevel',
      prereqSuffix: 'prerequisiteCsm',
      prereqColor: '#959695',
    },
    {
      code: 'EPO',
      levelBg: '#515e4d',
      levelSuffix: 'foundationLevel',
      prereqSuffix: 'prerequisiteNone',
      prereqColor: '#c0c0c0',
    },
    {
      code: 'EPO-P',
      levelBg: '#515e4d',
      levelSuffix: 'practitionerLevel',
      prereqSuffix: 'prerequisiteExp',
      prereqColor: '#959695',
    },
    {
      code: 'EPO-A',
      levelBg: '#515e4d',
      levelSuffix: 'authorityLevel',
      prereqSuffix: 'prerequisiteNone',
      prereqColor: '#c0c0c0',
    },
    {
      code: 'ESF',
      levelBg: '#8e6636',
      levelSuffix: 'foundationLevel',
      prereqSuffix: 'prerequisiteNone',
      prereqColor: '#c0c0c0',
    },
  ];

  protected toggleFaq(i: number): void {
    this.openFaq.update((cur) => (cur === i ? -1 : i));
  }
}
