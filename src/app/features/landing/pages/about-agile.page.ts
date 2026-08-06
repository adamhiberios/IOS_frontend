/**
 * `ios-about-agile-page` — public "About Agile" page.
 *
 * Structure (top → bottom) — pixel-aligned to Figma node `17304:49170`:
 *   1. Navbar
 *   2. Hero              — dark-red bg, breadcrumb + "About Agile" title
 *   3. Intro             — cream bg, badge + title + gold bar + full-bleed image + "What Is Agile?" + 2-col copy
 *   4. Frameworks        — white bg, section header + 4 cards (Scrum / Kanban / XP / Lean)
 *   5. Why Agile Is Important — cream bg, text card + illustration
 *   6. When and Where to Use Agile — white bg, illustration + text card (mirrored)
 *   7. Key Benefits      — cream bg, intro column + 6 benefit cards
 *   8. Agile Core Values — white bg, 4 values around a decorative emblem
 *   9. Final Thoughts    — near-black bg, title + body
 *  10. Ready to join     — cream bg, award icon + two CTA buttons
 *  11. Footer
 *
 * All text is routed through `LanguageService.t()` under the `aboutAgile.*`
 * namespace in assets/i18n/{en,ar,fr}.json.
 */

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideArrowUpRight,
  LucideAward,
  LucideMedal,
  LucideMessageCircle,
  LucideMoveRight,
  LucideRocket,
  LucideSparkles,
  LucideTriangleAlert,
} from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, ScrollToTop, provideIcons } from '@ui';
import type { LucideIconName } from '@ui/icon/icon-names';

import { LandingNavbar } from '../components/landing-navbar';
import { LandingFooter } from '../components/landing-footer';
import { PageHero } from '../components/page-hero';

/**
 * One icon + i18n-index pairing so the template can resolve text
 * (`aboutAgile.<ns>.<list>.<index>.*`) while binding a Lucide icon name.
 */
interface IconRow {
  icon: LucideIconName;
  index: number;
}

/** Gold underline bars — widths match each Figma section-header variant. */
const GOLD_BAR = 'w-[180px] h-1 rounded-full bg-ios-brand-gold';
const GOLD_BAR_SM = 'w-[172px] h-1 rounded-full bg-ios-brand-gold';

@Component({
  selector: 'ios-about-agile-page',
  imports: [
    NgOptimizedImage,
    RouterLink,
    IosIcon,
    LandingNavbar,
    LandingFooter,
    PageHero,
    ScrollToTop,
  ],
  providers: [
    provideIcons(
      LucideMedal,
      LucideMoveRight,
      LucideRocket,
      LucideMessageCircle,
      LucideSparkles,
      LucideTriangleAlert,
      LucideAward,
      LucideArrowRight,
      LucideArrowUpRight,
    ),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ═══════════════════════════════════════════════════════════
         1. Navbar
    ═══════════════════════════════════════════════════════════ -->
    <ios-landing-navbar />

    <!-- ═══════════════════════════════════════════════════════════
         2. Hero banner
    ═══════════════════════════════════════════════════════════ -->
    <ios-page-hero
      [title]="lang.t('aboutAgile.hero.title')"
      [showBreadcrumb]="true"
      [breadcrumbLabel]="lang.t('aboutAgile.hero.breadcrumb.home')"
      breadcrumbLink="/"
      backLink="/"
      [ariaBackLabel]="lang.t('aboutAgile.hero.back')"
    />

    <!-- ═══════════════════════════════════════════════════════════
         3. Intro — badge + title + gold bar + full-bleed image + What Is Agile?
    ═══════════════════════════════════════════════════════════ -->
    <section class="bg-ios-surface-warm" aria-labelledby="what-is-agile-heading">
      <!-- Section header -->
      <div
        class="max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px]
               pt-[72px] flex flex-col items-center text-center gap-5"
      >
        <span
          class="inline-flex items-center justify-center px-6 py-2 rounded-full
                 bg-ios-brand-yellow-soft border border-ios-brand-gold
                 font-body font-semibold text-[14px] text-ios-brand-primary"
        >
          {{ lang.t('aboutAgile.intro.badge') }}
        </span>

        <div class="flex flex-col gap-4 items-center w-full">
          <h1 class="font-heading font-extrabold text-[clamp(1.75rem,4vw,36px)] leading-[1.2]">
            <span class="text-ios-brand-dark">{{ lang.t('aboutAgile.intro.title') }} </span>
            <span class="text-ios-brand-primary">{{
              lang.t('aboutAgile.intro.titleHighlight')
            }}</span>
          </h1>
          <p class="font-body font-medium text-[16px] leading-[1.4] text-ios-fg-8 max-w-2xl">
            {{ lang.t('aboutAgile.intro.subtitle') }}
          </p>
        </div>

        <div class="${GOLD_BAR}" aria-hidden="true"></div>
      </div>

      <!-- Intro image — capped at the same 1440px column as the rest of the
           page content so it doesn't blow up past the container on huge screens. -->
      <div class="relative mt-10 w-full max-w-[1440px] mx-auto h-[300px] md:h-[521px]">
        <img
          ngSrc="/assets/images/about_agile_hero.png"
          [attr.alt]="lang.t('aboutAgile.intro.imageAlt')"
          fill
          class="object-cover object-top"
          priority
          decoding="async"
        />
      </div>

      <!-- What Is Agile? -->
      <div
        class="max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px] py-[72px]
               flex flex-col gap-5"
      >
        <h2
          id="what-is-agile-heading"
          class="font-heading text-[clamp(1.75rem,4vw,36px)] leading-[1.2]"
        >
          <span class="font-bold text-ios-brand-dark"
            >{{ lang.t('aboutAgile.intro.whatIsTitle') }}
          </span>
          <span class="font-extrabold text-ios-brand-primary">{{
            lang.t('aboutAgile.intro.whatIsHeading')
          }}</span>
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
          <p class="font-body text-[18px] leading-[1.4] text-ios-fg-mid">
            {{ lang.t('aboutAgile.intro.paragraph1') }}
          </p>
          <p class="font-body text-[18px] leading-[1.4] text-ios-fg-mid">
            {{ lang.t('aboutAgile.intro.paragraph2') }}
          </p>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         4. The Main Agile Frameworks
    ═══════════════════════════════════════════════════════════ -->
    <section class="bg-white" aria-labelledby="frameworks-heading">
      <div class="max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px] py-[72px]">
        <!-- Section header -->
        <div class="flex flex-col items-center text-center gap-5 mb-10">
          <div class="flex flex-col gap-4 items-center w-full">
            <h2
              id="frameworks-heading"
              class="font-heading text-[clamp(1.75rem,4vw,36px)] leading-[1.2]"
            >
              <span class="font-bold text-ios-brand-dark">{{
                lang.t('aboutAgile.frameworks.heading1')
              }}</span>
              <span class="font-extrabold text-ios-brand-primary">{{
                lang.t('aboutAgile.frameworks.heading2')
              }}</span>
            </h2>
            <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid max-w-3xl">
              {{ lang.t('aboutAgile.frameworks.subtitle') }}
            </p>
          </div>

          <div class="${GOLD_BAR}" aria-hidden="true"></div>
        </div>

        <div class="flex flex-col gap-6">
          <!-- ── Scrum step ─────────────────────────────────────────── -->
          <img
            [src]="'/assets/images/agile/step-1.svg'"
            [alt]="lang.t('aboutAgile.frameworks.scrum.title')"
            class="w-full h-auto"
            loading="lazy"
          />

          <!-- ── Kanban step ────────────────────────────────────────── -->
          <img
            [src]="'/assets/images/agile/step-2.svg'"
            [alt]="lang.t('aboutAgile.frameworks.kanban.title')"
            class="w-full h-auto"
            loading="lazy"
          />

          <!-- ── XP + Lean steps ────────────────────────────────────── -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <img
              [src]="'/assets/images/agile/step-3.svg'"
              [alt]="lang.t('aboutAgile.frameworks.xp.title')"
              class="w-full h-auto"
              loading="lazy"
            />
            <img
              [src]="'/assets/images/agile/step-4.svg'"
              [alt]="lang.t('aboutAgile.frameworks.lean.title')"
              class="w-full h-auto"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         5. Why Agile Is Important
    ═══════════════════════════════════════════════════════════ -->
    <section class="bg-ios-surface-warm" aria-labelledby="why-agile-heading">
      <div class="max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px] py-[72px]">
        <div class="flex flex-col lg:flex-row items-stretch gap-8">
          <div
            class="flex flex-col justify-center gap-3 p-6 md:p-[21px] lg:w-[724px] min-w-0
                   bg-white border border-ios-border-light rounded-lg"
          >
            <h2 id="why-agile-heading" class="font-heading text-[24px] leading-[1.2]">
              <span class="font-bold text-ios-brand-dark"
                >{{ lang.t('aboutAgile.why.title') }}
              </span>
              <span class="font-extrabold text-ios-brand-primary">{{
                lang.t('aboutAgile.why.titleHighlight')
              }}</span>
            </h2>
            <div class="flex flex-col gap-4">
              <p class="font-body text-[18px] leading-[1.4] text-ios-fg-mid">
                {{ lang.t('aboutAgile.why.paragraph1') }}
              </p>
              <p class="font-body text-[18px] leading-[1.4] text-ios-fg-mid">
                {{ lang.t('aboutAgile.why.paragraph2') }}
              </p>
            </div>
          </div>

          <div class="relative lg:w-[480px] min-h-[280px] lg:min-h-0 rounded-lg overflow-hidden">
            <img
              [ngSrc]="'/assets/images/about_agile_1.png'"
              [attr.alt]="lang.t('aboutAgile.why.imageAlt')"
              fill
              class="object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         6. When and Where to Use Agile
    ═══════════════════════════════════════════════════════════ -->
    <section class="bg-white" aria-labelledby="when-where-heading">
      <div class="max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px] py-[72px]">
        <div class="flex flex-col-reverse lg:flex-row items-stretch gap-8">
          <div class="relative lg:w-[480px] min-h-[280px] lg:min-h-0 rounded-lg overflow-hidden">
            <img
              [ngSrc]="'/assets/images/about_agile_2.png'"
              [attr.alt]="lang.t('aboutAgile.whenWhere.imageAlt')"
              fill
              class="object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>

          <div
            class="flex flex-col justify-center gap-3 p-6 md:p-[21px] lg:w-[724px] min-w-0
                   bg-white border border-ios-border-light rounded-lg"
          >
            <h2 id="when-where-heading" class="font-heading text-[24px] leading-[1.2]">
              <span class="font-bold text-ios-brand-dark"
                >{{ lang.t('aboutAgile.whenWhere.title') }}
              </span>
              <span class="font-extrabold text-ios-brand-primary">{{
                lang.t('aboutAgile.whenWhere.titleHighlight')
              }}</span>
            </h2>
            <div class="flex flex-col gap-4">
              <p class="font-body text-[18px] leading-[1.4] text-ios-fg-mid">
                {{ lang.t('aboutAgile.whenWhere.paragraph1') }}
              </p>
              <p class="font-body text-[18px] leading-[1.4] text-ios-fg-mid">
                {{ lang.t('aboutAgile.whenWhere.paragraph2') }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         7. Key Benefits of Agile
    ═══════════════════════════════════════════════════════════ -->
    <section class="bg-ios-surface-warm" aria-labelledby="benefits-heading">
      <div class="max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px] py-[72px]">
        <div class="flex flex-col lg:flex-row items-start gap-6">
          <!-- Intro column -->
          <div class="flex flex-col gap-3 lg:w-[438px] shrink-0">
            <h2 id="benefits-heading" class="font-heading text-[24px] leading-[1.2]">
              <span class="font-bold text-ios-brand-dark"
                >{{ lang.t('aboutAgile.benefits.title') }}
              </span>
              <span class="font-extrabold text-ios-brand-primary">{{
                lang.t('aboutAgile.benefits.titleHighlight')
              }}</span>
            </h2>
            <p class="font-body text-[18px] leading-[1.4] text-ios-fg-mid">
              {{ lang.t('aboutAgile.benefits.intro') }}
            </p>
          </div>

          <!-- Benefit cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            @for (benefit of benefits(); track benefit.index) {
              <div
                class="bg-white border border-ios-border-light rounded-lg p-4 flex flex-col gap-4"
              >
                <div
                  class="flex items-center justify-center w-[46px] h-[46px] rounded-lg bg-ios-brand-gold-soft border border-ios-brand-gold shrink-0"
                  aria-hidden="true"
                >
                  <ios-icon [name]="benefit.icon" class="w-7 h-7 text-ios-brand-gold" />
                </div>
                <h3 class="font-heading font-bold text-[16px] leading-[1.2] text-ios-brand-dark">
                  {{ lang.t('aboutAgile.benefits.items.' + benefit.index + '.title') }}
                </h3>
                <p class="font-body text-[14px] leading-[1.4] text-ios-fg-mid">
                  {{ lang.t('aboutAgile.benefits.items.' + benefit.index + '.body') }}
                </p>
              </div>
            }
          </div>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         8. Advance Your Career with Agile Core Values
    ═══════════════════════════════════════════════════════════ -->
    <section class="bg-white" aria-labelledby="core-values-heading">
      <div class="max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px] py-[72px]">
        <!-- Section header -->
        <div class="flex flex-col items-center text-center gap-5 mb-12">
          <div class="flex flex-col gap-4 items-center w-full">
            <h2
              id="core-values-heading"
              class="font-heading text-[clamp(1.75rem,4vw,36px)] leading-[1.2]"
            >
              <span class="font-bold text-ios-brand-dark">{{
                lang.t('aboutAgile.coreValues.heading1')
              }}</span>
              <span class="font-extrabold text-ios-brand-primary">{{
                lang.t('aboutAgile.coreValues.heading2')
              }}</span>
            </h2>
            <p class="font-body font-medium text-[18px] leading-[1.4] text-ios-fg-mid max-w-2xl">
              {{ lang.t('aboutAgile.coreValues.subtitle') }}
            </p>
          </div>

          <div class="${GOLD_BAR}" aria-hidden="true"></div>
        </div>

        <!-- Core values illustration -->
        <img
          [src]="'/assets/images/agile/core-value.svg'"
          [alt]="lang.t('aboutAgile.coreValues.heading2')"
          class="w-full h-auto"
          loading="lazy"
        />
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         9. Final Thoughts
    ═══════════════════════════════════════════════════════════ -->
    <section
      class="bg-ios-fg-13 px-6 md:px-16 lg:px-[120px] py-16"
      aria-labelledby="final-thoughts-heading"
    >
      <div class="max-w-[1140px] mx-auto flex flex-col items-center text-center gap-3">
        <h2 id="final-thoughts-heading" class="font-heading text-[24px] leading-[1.2]">
          <span class="font-bold text-white">{{ lang.t('aboutAgile.finalThoughts.title') }} </span>
          <span class="font-extrabold text-[#ffe477]">{{
            lang.t('aboutAgile.finalThoughts.titleHighlight')
          }}</span>
        </h2>
        <p class="font-body text-[18px] leading-[1.4] text-ios-border-light">
          {{ lang.t('aboutAgile.finalThoughts.body') }}
        </p>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         10. Ready to join
    ═══════════════════════════════════════════════════════════ -->
    <section
      class="bg-ios-surface-warm px-6 md:px-16 lg:px-[120px] py-[72px]"
      aria-labelledby="ready-heading"
    >
      <div class="flex flex-col items-center text-center gap-6 max-w-[984px] mx-auto">
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
            <span class="text-ios-brand-dark">{{ lang.t('aboutAgile.ready.title') }} </span>
            <span class="text-ios-brand-primary">{{
              lang.t('aboutAgile.ready.titleHighlight')
            }}</span>
          </h2>
          <p class="font-body font-medium text-[16px] leading-[1.4] text-ios-fg-8 max-w-2xl">
            {{ lang.t('aboutAgile.ready.subtitle') }}
          </p>
        </div>

        <div class="${GOLD_BAR_SM}" aria-hidden="true"></div>

        <div class="flex flex-wrap items-center justify-center gap-4">
          <a
            routerLink="/certifications"
            class="inline-flex items-center gap-2 h-14 px-8 rounded-lg
                   bg-ios-brand-yellow-soft text-[#736428] font-heading font-semibold text-[16px]
                   hover:bg-ios-brand-gold-soft transition-colors
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
          >
            {{ lang.t('aboutAgile.ready.exploreCertificates') }}
            <ios-icon name="arrow-right" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
          </a>
          <a
            routerLink="/register"
            class="inline-flex items-center gap-2 h-14 px-8 rounded-lg
                   bg-ios-brand-primary text-ios-brand-primary-soft
                   font-heading font-semibold text-[16px]
                   hover:bg-ios-brand-primary-deep transition-colors
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
          >
            {{ lang.t('aboutAgile.ready.startNow') }}
            <ios-icon name="arrow-up-right" class="w-5 h-5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         11. Footer
    ═══════════════════════════════════════════════════════════ -->
    <ios-landing-footer />
    <ios-scroll-to-top />
  `,
})
export class AboutAgilePage {
  protected readonly lang = inject(LanguageService);

  // ── Benefits ───────────────────────────────────────────────────────────────

  protected readonly benefits = signal<IconRow[]>([
    { icon: 'rocket', index: 0 },
    { icon: 'move-right', index: 1 },
    { icon: 'medal', index: 2 },
    { icon: 'message-circle', index: 3 },
    { icon: 'sparkles', index: 4 },
    { icon: 'triangle-alert', index: 5 },
  ]);
}
