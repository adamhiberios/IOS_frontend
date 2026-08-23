/**
 * `ios-about-institute-page` — public "About Institute of Scrum" page.
 *
 * Structure (top → bottom) — pixel-aligned to Figma node `18665:40340`:
 *   1. Navbar
 *   2. Hero            — cream bg, badge + title + gold bar + full-width image + intro copy
 *   3. Mission & Vision — two cards (dark-red mission / white vision)
 *   4. Track registration — badge "Mission & Values" + 4 cards + full-width mock-test card
 *   5. What We Offer    — three certification cards (ESM / EPO / ESF) with images
 *   6. What Sets Us Apart — #F6F6F6 bg, five cards
 *   7. Who We Serve     — three icon rows
 *   8. A Note on Trust  — #F6F6F6 bg, two paragraphs
 *   9. Training CTA     — full-width image + CTA copy below
 *  10. FAQ              — dark-red bg, 4-item accordion
 *  11. Ready to join    — cream bg, two CTA buttons
 *  12. Footer
 *
 * All text is routed through `LanguageService.t()` under the `aboutInstitute.*`
 * namespace in assets/i18n/{en,ar,fr}.json.
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  LucideAnchor,
  LucideArrowRight,
  LucideArrowUpRight,
  LucideAward,
  LucideCircleDollarSign,
  LucideCloud,
  LucideFileText,
  LucideFlag,
  LucideLanguages,
  LucideMinus,
  LucidePen,
  LucidePencil,
  LucidePlus,
  LucidePuzzle,
  LucideRoute,
  LucideShare2,
  LucideSquarePen,
  LucideUsersRound,
} from '@lucide/angular';

import { AuthStore } from '@core/auth';
import { LanguageService } from '@core/i18n';
import { IosIcon, ScrollToTop, provideIcons } from '@ui';
import type { LucideIconName } from '@ui/icon/icon-names';

import { LandingNavbar } from '../components/landing-navbar';
import { LandingFooter } from '../components/landing-footer';
import { PageHero } from '../components/page-hero';

/** Gold underline bars — widths match each Figma section-header variant. */
const GOLD_BAR = 'w-[180px] h-1 rounded-full bg-ios-brand-gold';
const GOLD_BAR_LG = 'w-[274px] h-1 rounded-full bg-ios-brand-gold';
const GOLD_BAR_SM = 'w-[172px] h-1 rounded-full bg-ios-brand-gold';

/**
 * One icon + i18n-index pairing so the template can resolve text
 * (`aboutInstitute.<ns>.items.<index>.*`) while binding a Lucide icon name.
 */
interface IconRow {
  icon: LucideIconName;
  index: number;
}

@Component({
  selector: 'ios-about-institute-page',
  imports: [
    NgOptimizedImage,
    RouterLink,
    IosIcon,
    LandingNavbar,
    LandingFooter,
    ScrollToTop,
    PageHero,
  ],
  providers: [
    provideIcons(
      LucideShare2,
      LucideFileText,
      LucideAward,
      LucidePen,
      LucidePencil,
      LucideArrowRight,
      LucideArrowUpRight,
      LucideUsersRound,
      LucideLanguages,
      LucideRoute,
      LucideCircleDollarSign,
      LucideCloud,
      LucideAnchor,
      LucidePuzzle,
      LucideFlag,
      LucideSquarePen,
      LucidePlus,
      LucideMinus,
    ),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ios-landing-navbar />

    <ios-page-hero
      [title]="lang.t('aboutInstitute.hero.title')"
      [showBreadcrumb]="true"
      [breadcrumbLabel]="lang.t('aboutInstitute.hero.breadcrumb.home')"
      breadcrumbLink="/"
      backLink="/"
      [ariaBackLabel]="lang.t('aboutInstitute.hero.back')"
    />

    <!-- ═══════════════════════════════════════════════════════════
         2. Hero
    ═══════════════════════════════════════════════════════════ -->
    <section aria-labelledby="about-hero-heading" class="bg-ios-surface-warm pt-[72px]">
      <div class="max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px]">
        <!-- Badge + heading + gold bar -->
        <div class="flex flex-col items-center text-center gap-5">
        <span
          class="inline-flex items-center justify-center px-6 py-2 rounded-full
                 bg-ios-brand-yellow-soft border border-ios-brand-gold
                 font-body font-semibold text-[14px] text-ios-brand-primary"
        >
          {{ lang.t('aboutInstitute.intro.eyebrow') }}
        </span>

        <div class="flex flex-col gap-4 items-center w-full">
          <h1
            id="about-hero-heading"
            class="font-heading font-extrabold text-[clamp(1.75rem,4vw,36px)] leading-[1.2]"
          >
            <span class="text-ios-brand-dark">{{ lang.t('aboutInstitute.intro.title') }} </span>
            <span class="text-ios-brand-primary">{{
              lang.t('aboutInstitute.intro.titleHighlight')
            }}</span>
          </h1>
          <p class="font-body font-medium text-[16px] leading-[1.4] text-ios-fg-8 max-w-2xl">
            {{ lang.t('aboutInstitute.intro.subtitle') }}
          </p>
        </div>

        <div class="${GOLD_BAR}" aria-hidden="true"></div>
      </div>

      <!-- Hero image -->
      <div class="relative mt-10 rounded-2xl overflow-hidden h-[300px] md:h-[440px]">
        <img
          ngSrc="/assets/images/landing_hero.png"
          [attr.alt]="lang.t('aboutInstitute.intro.imageAlt')"
          fill
          class="object-cover object-top"
          priority
          decoding="async"
        />
      </div>

      <!-- Intro copy -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 py-[72px]">
        <p class="font-body text-[16px] leading-[1.6] text-ios-fg-mid">
          {{ lang.t('aboutInstitute.intro.paragraph1') }}
        </p>
        <p class="font-body text-[16px] leading-[1.6] text-ios-fg-mid">
          {{ lang.t('aboutInstitute.intro.paragraph2') }}
        </p>
      </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         3. Mission & Vision
    ═══════════════════════════════════════════════════════════ -->
    <section
      [attr.aria-label]="lang.t('aboutInstitute.mission.sectionLabel')"
      class="bg-ios-surface-warm pb-[72px]"
    >
      <div
        class="max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px] grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <!-- Mission card -->
        <div
          class="relative overflow-hidden bg-ios-brand-primary-deep rounded-lg p-8 flex flex-col gap-5"
        >
          <div
            class="absolute top-[-80px] end-[-80px] w-40 h-40 rounded-full bg-[rgba(212,160,23,0.12)]"
            aria-hidden="true"
          ></div>
          <div
            class="relative flex items-center justify-center w-14 h-14 rounded-[10px] bg-ios-brand-primary-soft"
            aria-hidden="true"
          >
            <ios-icon name="flag" class="w-7 h-7 text-ios-brand-primary" />
          </div>
          <h2 class="font-heading font-extrabold text-[20px] leading-[1.2] text-white">
            {{ lang.t('aboutInstitute.mission.title') }}
          </h2>
          <div class="flex flex-col gap-3 text-[#dcdcdc] font-body text-[16px] leading-[1.4]">
            <p>{{ lang.t('aboutInstitute.mission.body1') }}</p>
            <p>{{ lang.t('aboutInstitute.mission.body2') }}</p>
            <p>{{ lang.t('aboutInstitute.mission.body3') }}</p>
          </div>
        </div>

        <!-- Vision card -->
        <div class="bg-white border-2 border-[#ffe477] rounded-lg p-8 flex flex-col gap-5">
          <div
            class="flex items-center justify-center w-14 h-14 rounded-[10px] bg-ios-brand-gold-soft"
            aria-hidden="true"
          >
            <ios-icon name="square-pen" class="w-7 h-7 text-ios-brand-primary" />
          </div>
          <h2 class="font-heading font-extrabold text-[20px] leading-[1.2] text-ios-brand-dark">
            {{ lang.t('aboutInstitute.vision.title') }}
          </h2>
          <div class="flex flex-col gap-3 text-ios-fg-7 font-body text-[16px] leading-[1.4]">
            <p>{{ lang.t('aboutInstitute.vision.body1') }}</p>
            <p>{{ lang.t('aboutInstitute.vision.body2') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         4. Track registration
    ═══════════════════════════════════════════════════════════ -->
    <section aria-labelledby="track-included-heading" class="bg-ios-surface-warm pb-[72px]">
      <div class="max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px]">
        <!-- Section header -->
        <div class="flex flex-col items-center text-center gap-5 mb-10">
        <span
          class="inline-flex items-center justify-center px-6 py-2 rounded-full
                 bg-ios-brand-yellow-soft border border-ios-brand-gold
                 font-body font-semibold text-[14px] text-ios-brand-primary"
        >
          {{ lang.t('aboutInstitute.trackIncluded.eyebrow') }}
        </span>

        <div class="flex flex-col gap-4 items-center w-full">
          <h2
            id="track-included-heading"
            class="font-heading font-extrabold text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.2]"
          >
            <span class="text-ios-brand-dark"
              >{{ lang.t('aboutInstitute.trackIncluded.title') }}
            </span>
            <span class="text-ios-brand-primary">{{
              lang.t('aboutInstitute.trackIncluded.titleHighlight')
            }}</span>
          </h2>
          <p class="font-body font-medium text-[16px] leading-[1.4] text-ios-fg-8 max-w-2xl">
            {{ lang.t('aboutInstitute.trackIncluded.subtitle') }}
          </p>
        </div>

        <div class="${GOLD_BAR_LG}" aria-hidden="true"></div>
      </div>

      <!-- 4 cards + full-width mock test card -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        @for (row of trackRows(); track row.index) {
          <div class="bg-white border-2 border-[#ffe477] rounded-lg p-6 flex flex-col gap-4">
            <div
              class="flex items-center justify-center w-14 h-14 rounded-lg bg-ios-brand-gold-soft border border-ios-brand-gold"
              aria-hidden="true"
            >
              <ios-icon [name]="row.icon" class="w-8 h-8 text-ios-brand-primary" />
            </div>
            <h3 class="font-heading font-bold text-[18px] leading-[1.3] text-ios-fg-10">
              {{ lang.t('aboutInstitute.trackIncluded.items.' + row.index + '.title') }}
            </h3>
            <p class="font-body text-[16px] leading-[1.4] text-ios-fg-mid flex-1">
              {{ lang.t('aboutInstitute.trackIncluded.items.' + row.index + '.body') }}
            </p>
          </div>
        }
      </div>

      <!-- Full-width mock test card -->
      <div
        class="mt-6 bg-white border-2 border-[#ffe477] rounded-lg p-6 md:p-8
               flex flex-col md:flex-row items-start md:items-center gap-5"
      >
        <div
          class="flex items-center justify-center w-14 h-14 rounded-lg bg-ios-brand-gold-soft border border-ios-brand-gold shrink-0"
          aria-hidden="true"
        >
          <ios-icon name="pencil" class="w-8 h-8 text-ios-brand-primary" />
        </div>
        <div class="flex flex-col gap-2">
          <h3 class="font-heading font-bold text-[18px] leading-[1.3] text-ios-fg-10">
            {{ lang.t('aboutInstitute.trackIncluded.items.4.title') }}
          </h3>
          <p class="font-body text-[16px] leading-[1.4] text-ios-fg-mid">
            {{ lang.t('aboutInstitute.trackIncluded.items.4.body') }}
          </p>
        </div>
      </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         5. What We Offer
    ═══════════════════════════════════════════════════════════ -->
    <section aria-labelledby="offer-heading" class="bg-white py-[72px]">
      <div class="max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px]">
        <!-- Section header -->
        <div class="flex flex-col items-center text-center gap-5 mb-10">
          <span
            class="inline-flex items-center justify-center px-6 py-2 rounded-full
                 bg-ios-brand-yellow-soft border border-ios-brand-gold
                 font-body font-semibold text-[14px] text-ios-brand-primary"
          >
            {{ lang.t('aboutInstitute.offer.eyebrow') }}
          </span>

        <div class="flex flex-col gap-4 items-center w-full">
          <h2
            id="offer-heading"
            class="font-heading font-extrabold text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.2]"
          >
            <span class="text-ios-brand-dark">{{ lang.t('aboutInstitute.offer.title') }} </span>
            <span class="text-ios-brand-primary">{{
              lang.t('aboutInstitute.offer.titleHighlight')
            }}</span>
          </h2>
          <p class="font-body font-medium text-[16px] leading-[1.4] text-ios-fg-8 max-w-2xl">
            {{ lang.t('aboutInstitute.offer.subtitle') }}
          </p>
        </div>

        <div class="${GOLD_BAR_LG}" aria-hidden="true"></div>
      </div>

      <!-- Certification cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        @for (card of offerCards(); track card.index) {
          <div
            class="bg-white border border-ios-border-light rounded-lg overflow-hidden flex flex-col"
          >
            <div class="relative">
              <img
                [ngSrc]="card.imageSrc"
                [attr.alt]="lang.t('aboutInstitute.offer.cards.' + card.index + '.title')"
                [width]="card.imageWidth"
                [height]="card.imageHeight"
                class="w-full h-[200px] object-cover"
                loading="lazy"
                decoding="async"
              />
              <div class="absolute top-3 start-3 flex items-center gap-2">
                @for (badge of card.badges; track badge) {
                  <span
                    class="inline-flex items-center px-[7px] py-1 rounded-full border
                           font-heading font-bold text-[12px] leading-none"
                    [class]="card.badgeClass"
                  >
                    {{ badge }}
                  </span>
                }
              </div>
            </div>
            <div class="p-6 flex flex-col gap-3 flex-1">
              <h3 class="font-heading font-extrabold text-[20px] leading-[1.3] text-ios-brand-dark">
                {{ lang.t('aboutInstitute.offer.cards.' + card.index + '.title') }}
              </h3>
              <p class="font-body text-[14px] leading-[1.4] text-ios-fg-mid flex-1">
                {{ lang.t('aboutInstitute.offer.cards.' + card.index + '.body') }}
              </p>
              <a
                [routerLink]="card.link"
                class="self-start inline-flex items-center gap-2 mt-2 px-8 h-[52px] rounded-lg
                       font-heading font-semibold text-[16px] transition-colors
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                [class]="card.buttonClass"
              >
                {{ lang.t('aboutInstitute.offer.cards.' + card.index + '.learnMore') }}
                <ios-icon name="arrow-right" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
              </a>
            </div>
          </div>
        }
      </div>

      <!-- See all -->
      <div class="text-center mt-10">
        <a
          routerLink="/certifications"
          class="inline-flex items-center gap-3 h-14 pl-6 pr-4 rounded-xl border-[1.5px] border-ios-brand-gold
                 text-[#736428] font-heading font-semibold text-[18px]
                 hover:bg-ios-brand-gold-soft transition-colors
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/40"
        >
          {{ lang.t('aboutInstitute.offer.seeAll') }}
          <ios-icon name="arrow-right" class="w-6 h-6 rtl:rotate-180" aria-hidden="true" />
        </a>
      </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         6. What Sets Us Apart
    ═══════════════════════════════════════════════════════════ -->
    <section aria-labelledby="apart-heading" class="bg-ios-surface-mid py-[72px]">
      <div class="max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px]">
        <!-- Section header -->
        <div class="flex flex-col items-center text-center gap-5 mb-10">
          <span
            class="inline-flex items-center justify-center px-6 py-2 rounded-full
                 bg-ios-brand-yellow-soft border border-ios-brand-gold
                 font-body font-semibold text-[14px] text-ios-brand-primary"
          >
            {{ lang.t('aboutInstitute.apart.eyebrow') }}
          </span>

        <div class="flex flex-col gap-4 items-center w-full">
          <h2
            id="apart-heading"
            class="font-heading font-extrabold text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.2]"
          >
            <span class="text-ios-brand-dark">{{ lang.t('aboutInstitute.apart.title') }} </span>
            <span class="text-ios-brand-primary">{{
              lang.t('aboutInstitute.apart.titleHighlight')
            }}</span>
          </h2>
          <p class="font-body font-medium text-[16px] leading-[1.4] text-ios-fg-8 max-w-2xl">
            {{ lang.t('aboutInstitute.apart.subtitle') }}
          </p>
        </div>

        <div class="${GOLD_BAR_LG}" aria-hidden="true"></div>
      </div>

      <!-- 5 cards (3 on the first row, 2 wider on the second) -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        @for (row of apartRows(); track row.index) {
          <div
            class="bg-white border-2 border-ios-brand-primary-mid rounded-lg p-6 flex flex-col gap-4"
            [class.lg:col-span-2]="row.index < 3"
            [class.lg:col-span-3]="row.index >= 3"
          >
            <div
              class="flex items-center justify-center w-14 h-14 rounded-lg bg-ios-brand-primary-soft"
              aria-hidden="true"
            >
              <ios-icon [name]="row.icon" class="w-7 h-7 text-ios-brand-primary" />
            </div>
            <h3 class="font-heading font-bold text-[18px] leading-[1.3] text-ios-fg-10">
              {{ lang.t('aboutInstitute.apart.items.' + row.index + '.title') }}
            </h3>
            <p class="font-body text-[14px] leading-[1.6] text-ios-fg-mid flex-1">
              {{ lang.t('aboutInstitute.apart.items.' + row.index + '.body') }}
            </p>
          </div>
        }
      </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         7. Who We Serve
    ═══════════════════════════════════════════════════════════ -->
    <section aria-labelledby="serve-heading" class="bg-white py-[72px]">
      <div class="max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px]">
        <!-- Section header -->
        <div class="flex flex-col items-center text-center gap-5 mb-10">
          <span
            class="inline-flex items-center justify-center px-6 py-2 rounded-full
                 bg-ios-brand-yellow-soft border border-ios-brand-gold
                 font-body font-semibold text-[14px] text-ios-brand-primary"
          >
            {{ lang.t('aboutInstitute.serve.eyebrow') }}
          </span>

        <div class="flex flex-col gap-4 items-center w-full">
          <h2
            id="serve-heading"
            class="font-heading font-extrabold text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.2]"
          >
            <span class="text-ios-brand-dark">{{ lang.t('aboutInstitute.serve.title') }} </span>
            <span class="text-ios-brand-primary">{{
              lang.t('aboutInstitute.serve.titleHighlight')
            }}</span>
          </h2>
          <p class="font-body font-medium text-[16px] leading-[1.4] text-ios-fg-8 max-w-2xl">
            {{ lang.t('aboutInstitute.serve.subtitle') }}
          </p>
        </div>

        <div class="${GOLD_BAR_LG}" aria-hidden="true"></div>
      </div>

      <!-- Icon rows -->
      <div class="flex flex-col gap-8">
        @for (row of serveRows(); track row.index) {
          <div class="flex items-start gap-6">
            <div
              class="flex items-center justify-center w-16 h-16 rounded-lg bg-ios-brand-primary-soft shrink-0"
              aria-hidden="true"
            >
              <ios-icon [name]="row.icon" class="w-8 h-8 text-ios-brand-primary" />
            </div>
            <p class="font-body text-[16px] leading-[1.6] text-ios-fg-mid">
              {{ lang.t('aboutInstitute.serve.paragraphs.' + row.index) }}
            </p>
          </div>
        }
      </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         8. A Note on Trust
    ═══════════════════════════════════════════════════════════ -->
    <section aria-labelledby="trust-heading" class="bg-ios-surface-mid py-[72px]">
      <div class="max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px]">
        <!-- Section header -->
        <div class="flex flex-col items-center text-center gap-5 mb-10">
          <span
            class="inline-flex items-center justify-center px-6 py-2 rounded-full
                 bg-ios-brand-yellow-soft border border-ios-brand-gold
                 font-body font-semibold text-[14px] text-ios-brand-primary"
          >
            {{ lang.t('aboutInstitute.trust.eyebrow') }}
          </span>

        <div class="flex flex-col gap-4 items-center w-full">
          <h2
            id="trust-heading"
            class="font-heading font-extrabold text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.2]"
          >
            <span class="text-ios-brand-dark">{{ lang.t('aboutInstitute.trust.title') }} </span>
            <span class="text-ios-brand-primary">{{
              lang.t('aboutInstitute.trust.titleHighlight')
            }}</span>
          </h2>
          <p class="font-body font-medium text-[16px] leading-[1.4] text-ios-fg-8 max-w-2xl">
            {{ lang.t('aboutInstitute.trust.subtitle') }}
          </p>
        </div>

        <div class="${GOLD_BAR_LG}" aria-hidden="true"></div>
      </div>

      <!-- Two paragraphs -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
        <p class="font-body text-[16px] leading-[1.6] text-ios-fg-mid">
          {{ lang.t('aboutInstitute.trust.paragraphs.0') }}
        </p>
        <p class="font-body text-[16px] leading-[1.6] text-ios-fg-mid">
          {{ lang.t('aboutInstitute.trust.paragraphs.1') }}
        </p>
      </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         9. Training CTA
    ═══════════════════════════════════════════════════════════ -->
    <section aria-labelledby="training-cta-heading" class="bg-white py-[72px]">
      <div class="relative max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px]">
        <!-- Background image -->
        <div class="relative rounded-2xl overflow-hidden h-[420px] lg:h-[500px]">
          <img
            [ngSrc]="'/assets/images/training_cta.png'"
            alt=""
            aria-hidden="true"
            fill
            class="object-cover object-center"
            loading="lazy"
            decoding="async"
          />
        </div>

        <!-- CTA copy, below the image -->
        <div class="relative mt-8 rounded-2xl px-6 py-10">
          <div class="flex flex-col items-center gap-5 text-center">
            <div class="flex flex-col gap-3 items-center">
              <h2
                id="training-cta-heading"
                class="font-heading font-extrabold text-[clamp(1.75rem,3.5vw,36px)] leading-[1.2]"
              >
                <span class="text-ios-brand-dark"
                  >{{ lang.t('aboutInstitute.trainingCta.title') }}
                </span>
                <span class="text-ios-brand-primary">{{
                  lang.t('aboutInstitute.trainingCta.titleHighlight')
                }}</span>
              </h2>
              <p class="font-body font-medium text-[16px] leading-[1.5] text-ios-fg-8 max-w-2xl">
                {{ lang.t('aboutInstitute.trainingCta.subtitle') }}
              </p>
            </div>

            <div class="${GOLD_BAR_SM}" aria-hidden="true"></div>

            <a
              routerLink="/about-mock-exam"
              class="inline-flex items-center gap-2 px-8 py-4 rounded-2xl
                     bg-ios-brand-primary-soft text-ios-brand-primary-deep
                     font-heading font-semibold text-[16px]
                     hover:bg-ios-brand-primary hover:text-white transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
            >
              {{ lang.t('aboutInstitute.trainingCta.learnMore') }}
              <ios-icon name="arrow-right" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         10. FAQ
    ═══════════════════════════════════════════════════════════ -->
    <section aria-labelledby="faq-heading" class="bg-ios-brand-primary py-[72px]">
      <div class="max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px]">
        <!-- Section header -->
        <div class="flex flex-col items-center text-center gap-5 mb-10">
          <span
            class="inline-flex items-center justify-center px-6 py-2 rounded-full
                 bg-ios-brand-yellow-soft border border-ios-brand-gold
                 font-body font-semibold text-[14px] text-ios-brand-primary"
          >
            {{ lang.t('aboutInstitute.faq.eyebrow') }}
          </span>

        <div class="flex flex-col gap-4 items-center w-full">
          <h2
            id="faq-heading"
            class="font-heading font-extrabold text-[clamp(1.5rem,3vw,36px)] leading-[1.2]"
          >
            <span class="text-white">{{ lang.t('aboutInstitute.faq.title') }} </span>
            <span class="text-[#ffe477]">{{ lang.t('aboutInstitute.faq.titleHighlight') }}</span>
          </h2>
          <p class="font-body font-medium text-[16px] leading-[1.4] text-[#f6f6f6] max-w-2xl">
            {{ lang.t('aboutInstitute.faq.subtitle') }}
          </p>
        </div>

        <div class="${GOLD_BAR_LG}" aria-hidden="true"></div>
      </div>

      <!-- Accordion -->
      <div class="flex flex-col gap-3 max-w-[984px] mx-auto">
        @for (item of faqItems(); track item) {
          <div
            class="rounded-lg overflow-hidden border"
            [class]="
              openFaq() === item
                ? 'bg-[#630000] border-[#b65e5e]'
                : 'bg-ios-brand-primary-deep border-ios-brand-primary-mid'
            "
          >
            <h3>
              <button
                type="button"
                class="w-full flex items-center gap-4 px-6 py-5 text-start
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50"
                [attr.aria-expanded]="openFaq() === item"
                [attr.aria-controls]="'faq-panel-' + item"
                (click)="toggleFaq(item)"
              >
                <ios-icon
                  [name]="openFaq() === item ? 'plus' : 'minus'"
                  class="shrink-0 w-6 h-6 text-white"
                  aria-hidden="true"
                />
                <span class="flex-1 font-heading font-bold text-[18px] leading-[1.2] text-white">
                  {{ lang.t('aboutInstitute.faq.items.' + item + '.question') }}
                </span>
              </button>
            </h3>
            @if (openFaq() === item) {
              <div [id]="'faq-panel-' + item" class="px-6 pb-5 -mt-1 ps-[52px]">
                <p class="font-body text-[16px] leading-[1.4] text-[#c4c5c4]">
                  {{ lang.t('aboutInstitute.faq.items.' + item + '.answer') }}
                </p>
              </div>
            }
          </div>
        }
      </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         11. Ready to join
    ═══════════════════════════════════════════════════════════ -->
    <section aria-labelledby="ready-heading" class="bg-ios-surface-warm py-[72px]">
      <div class="max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px]">
        <div class="flex flex-col items-center text-center gap-8 max-w-[984px] mx-auto">
        <ios-icon
          name="award"
          class="w-[42px] h-[42px] text-ios-brand-primary"
          aria-hidden="true"
        />

        <div class="flex flex-col gap-4 items-center w-full">
          <h2
            id="ready-heading"
            class="font-heading font-extrabold text-[clamp(1.75rem,3.5vw,36px)] leading-[1.2]"
          >
            <span class="text-ios-brand-dark">{{ lang.t('aboutInstitute.ready.title') }} </span>
            <span class="text-ios-brand-primary">{{
              lang.t('aboutInstitute.ready.titleHighlight')
            }}</span>
          </h2>
          <p class="font-body font-medium text-[16px] leading-[1.4] text-ios-fg-8 max-w-2xl">
            {{ lang.t('aboutInstitute.ready.subtitle') }}
          </p>
        </div>

        <div class="${GOLD_BAR_SM}" aria-hidden="true"></div>

        <div class="flex flex-wrap items-center justify-center gap-4">
          <a
            routerLink="/certifications"
            class="inline-flex items-center gap-2 h-14 px-8 rounded-lg
                   bg-ios-brand-yellow-soft
                   text-[#736428] font-heading font-semibold text-[16px]
                   hover:bg-ios-brand-gold-soft transition-colors
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
          >
            {{ lang.t('aboutInstitute.ready.exploreCertificates') }}
            <ios-icon name="arrow-right" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
          </a>
          <a
            [routerLink]="getStartedLink()"
            class="inline-flex items-center gap-2 h-14 px-8 rounded-lg
                   bg-ios-brand-primary text-ios-brand-primary-soft
                   font-heading font-semibold text-[16px]
                   hover:bg-ios-brand-primary-deep transition-colors
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
          >
            {{ lang.t('aboutInstitute.ready.startNow') }}
            <ios-icon name="arrow-up-right" class="w-5 h-5" aria-hidden="true" />
          </a>
        </div>
      </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         12. Footer
    ═══════════════════════════════════════════════════════════ -->
    <ios-landing-footer />
    <ios-scroll-to-top />
  `,
})
export class AboutInstitutePage {
  protected readonly lang = inject(LanguageService);
  private readonly auth = inject(AuthStore);

  /**
   * "Get Started" target. Signed-in visitors go straight to their portal;
   * everyone else starts at registration, which links on to `/auth/login`
   * for visitors who already hold an account (the client cannot tell the
   * two anonymous cases apart).
   */
  protected readonly getStartedLink = computed(() =>
    this.auth.isAuthenticated() ? '/dashboard' : '/auth/register',
  );

  /** Open FAQ item index; `-1` closes every item. First item open by default. */
  protected readonly openFaq = signal(0);

  /** Track-registration cards (4 in a row). Item 4 (mock test) is rendered separately full-width. */
  protected readonly trackRows = signal<IconRow[]>([
    { icon: 'share-2', index: 0 },
    { icon: 'file-text', index: 1 },
    { icon: 'award', index: 2 },
    { icon: 'pen', index: 3 },
  ]);

  /** Certification offer cards — image, badge chips, and detail route per program. */
  protected readonly offerCards = signal<
    {
      imageSrc: string;
      imageWidth: number;
      imageHeight: number;
      badges: string[];
      badgeClass: string;
      buttonClass: string;
      link: string;
      index: number;
    }[]
  >([
    {
      imageSrc: '/assets/images/esm.png',
      imageWidth: 1536,
      imageHeight: 1024,
      badges: ['ESM', 'ESM-P', 'ESM-A'],
      badgeClass: 'bg-cer-blue text-cer-blue-soft border-[#9cb0bd]',
      buttonClass: 'bg-cer-blue-soft text-cer-blue hover:bg-cer-blue hover:text-cer-blue-soft',
      link: '/certifications/esm',
      index: 0,
    },
    {
      imageSrc: '/assets/images/epo.png',
      imageWidth: 3072,
      imageHeight: 2048,
      badges: ['EPO', 'EPO-P', 'EPO-A'],
      badgeClass: 'bg-cer-green text-cer-green-soft border-[#b4bab2]',
      buttonClass: 'bg-cer-green-soft text-cer-green hover:bg-cer-green hover:text-cer-green-soft',
      link: '/certifications/epo',
      index: 1,
    },
    {
      imageSrc: '/assets/images/esf.png',
      imageWidth: 2896,
      imageHeight: 2172,
      badges: ['ESF'],
      badgeClass: 'bg-[#79572e] text-cer-brown-soft border-[#cebda9]',
      buttonClass: 'bg-cer-brown-soft text-[#79572e] hover:bg-[#79572e] hover:text-cer-brown-soft',
      link: '/certifications/esf',
      index: 2,
    },
  ]);

  /** What Sets Us Apart cards (5 total). */
  protected readonly apartRows = signal<IconRow[]>([
    { icon: 'users-round', index: 0 },
    { icon: 'languages', index: 1 },
    { icon: 'route', index: 2 },
    { icon: 'award', index: 3 },
    { icon: 'circle-dollar-sign', index: 4 },
  ]);

  /** Who We Serve rows (3). */
  protected readonly serveRows = signal<IconRow[]>([
    { icon: 'cloud', index: 0 },
    { icon: 'anchor', index: 1 },
    { icon: 'puzzle', index: 2 },
  ]);

  /** FAQ item indices. */
  protected readonly faqItems = signal([0, 1, 2, 3]);

  protected toggleFaq(index: number): void {
    this.openFaq.update((current) => (current === index ? -1 : index));
  }
}
