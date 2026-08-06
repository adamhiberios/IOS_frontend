/**
 * `ios-hero-section` — landing page hero (section 1).
 *
 * Fully static — all copy rendered via `lang.t()`.
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideDownload } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, SectionBadge, provideIcons } from '@ui';

@Component({
  selector: 'ios-hero-section',
  imports: [RouterLink, IosIcon, NgOptimizedImage, SectionBadge],
  providers: [provideIcons(LucideArrowRight, LucideDownload)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      [attr.aria-label]="lang.t('landing.hero.sectionAriaLabel')"
      class="relative overflow-hidden  bg-white lg:overflow-visible min-h-[480px] lg:min-h-[482px]"
    >
      <!-- Caps the hero at a normal desktop width so it doesn't stretch edge-to-edge
           (and blow up in scale) on very large / ultrawide monitors. -->
      <div class="h-full max-w-[1440px] mx-auto flex flex-col-reverse lg:flex-row items-stretch">
        <!-- Content panel — solid white, holds badge/headline/CTAs -->
        <div
          class="relative w-full lg:w-1/2 flex items-center px-6 md:px-16 lg:px-[80px] py-10 lg:py-16"
        >
          <div class="max-w-[580px]">
            <!-- Badge -->
            <div class="mb-4">
              <ios-section-badge [text]="lang.t('landing.hero.badge')" variant="amber" />
            </div>

            <!-- Headline -->
            <h1
              class="font-heading font-bold text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.15] mb-4"
            >
              <span class="text-ios-brand-primary block">{{
                lang.t('landing.hero.headline')
              }}</span>
              <span class="text-ios-brand-dark">{{
                lang.t('landing.hero.headlineHighlight')
              }}</span>
            </h1>

            <!-- Subtext -->
            <p class="text-[15px] leading-relaxed text-ios-fg-8 mb-6">
              {{ lang.t('landing.hero.subtext') }}
            </p>

            <!-- CTAs -->
            <div class="flex flex-wrap items-center gap-3 mb-4">
              <a
                routerLink="/certifications"
                class="bg-ios-brand-primary text-white font-heading font-semibold text-[15px]
                     h-12 px-6 rounded-xl inline-flex items-center gap-2
                     hover:bg-ios-brand-primary-hover transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
              >
                {{ lang.t('landing.hero.ctaPrimary') }}
                <ios-icon name="arrow-right" class="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
              </a>
              <a
                routerLink="/guide"
                class="bg-ios-brand-primary-soft text-ios-brand-primary font-heading font-semibold text-[15px]
                     h-12 px-6 rounded-xl inline-flex items-center gap-2
                     hover:opacity-90 transition-opacity
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
              >
                {{ lang.t('landing.hero.ctaSecondary') }}
                <ios-icon name="download" class="w-4 h-4" aria-hidden="true" />
              </a>
            </div>

            <p class="text-[11px] text-ios-fg-7 leading-relaxed">
              {{ lang.t('landing.hero.source') }}
            </p>
          </div>
        </div>

        <div class="relative flex w-full lg:w-1/2 z-10">
          <img
            ngSrc="/assets/images/landing_hero_office.png"
            [alt]="lang.t('landing.hero.imageAlt')"
            width="1800"
            height="994"
            class="w-full h-[280px] sm:h-[340px] md:h-[400px] lg:h-full object-cover object-top"
            priority
          />
        </div>
      </div>
    </section>
  `,
})
export class HeroSection {
  protected readonly lang = inject(LanguageService);
}
