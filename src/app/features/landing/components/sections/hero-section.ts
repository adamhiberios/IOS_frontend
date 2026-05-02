/**
 * `ios-hero-section` — landing page hero (section 1).
 *
 * Renders the headline, subtext, CTAs, cohort badge, graduate count badge,
 * and the hero image. All content strings come from the `data` input so the
 * section is fully data-driven and backend-ready.
 */

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideDownload, LucideCalendar } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, SectionBadge, provideIcons } from '@ui';
import type { HeroData } from '../../data-access/landing.model';

@Component({
  selector: 'ios-hero-section',
  imports: [RouterLink, IosIcon, NgOptimizedImage, SectionBadge],
  providers: [provideIcons(LucideArrowRight, LucideDownload, LucideCalendar)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-label="Hero" class="relative overflow-hidden">
      <!-- Decorative blobs -->
      <div
        class="absolute -top-32 end-0 w-80 h-80 rounded-full opacity-10 bg-ios-brand-primary blur-3xl"
        aria-hidden="true"
      ></div>
      <div
        class="absolute bottom-0 start-0 w-64 h-64 rounded-full opacity-10 bg-ios-brand-yellow blur-3xl"
        aria-hidden="true"
      ></div>

      <div class="relative px-6 md:px-16 lg:px-[120px] pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div class="flex flex-col lg:flex-row items-start lg:items-center gap-12 lg:gap-16">
          <!-- Copy -->
          <div class="flex-1 max-w-[560px]">
            <div class="mb-6">
              <ios-section-badge [text]="data().badge" variant="amber" />
            </div>

            <h1 class="font-heading font-bold text-[clamp(2rem,4vw,3rem)] leading-[1.15] mb-5">
              <span class="text-ios-brand-primary block">{{ data().headline }}</span>
              <span class="text-ios-brand-dark">{{ data().headlineHighlight }}</span>
            </h1>

            <p class="text-[17px] leading-relaxed text-ios-fg-8 mb-8 max-w-[520px]">
              {{ data().subtext }}
            </p>

            <!-- CTAs -->
            <div class="flex flex-wrap items-center gap-4 mb-6">
              <a
                routerLink="/certifications"
                class="bg-ios-brand-primary text-white font-heading font-semibold text-[16px]
                       h-14 px-8 rounded-xl inline-flex items-center gap-2
                       hover:bg-ios-brand-primary-hover transition-colors
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
              >
                {{ lang.t('landing.hero.ctaPrimary') }}
                <ios-icon name="arrow-right" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
              </a>
              <a
                routerLink="/guide"
                class="bg-ios-brand-primary-soft text-ios-brand-primary font-heading font-semibold text-[16px]
                       h-14 px-8 rounded-xl inline-flex items-center gap-2
                       hover:opacity-90 transition-opacity
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
              >
                {{ lang.t('landing.hero.ctaSecondary') }}
                <ios-icon name="download" class="w-5 h-5" aria-hidden="true" />
              </a>
            </div>

            <p class="text-[12px] text-ios-fg-7 leading-relaxed">{{ data().source }}</p>
          </div>

          <!-- Hero image + floating badges -->
          <div class="hidden lg:block flex-1 relative">
            <div class="relative rounded-2xl overflow-hidden aspect-[16/9]">
              <img
                ngSrc="/assets/images/landing_hero.png"
                alt="A professional earning their Scrum certification"
                width="1672"
                height="941"
                class="w-full h-full object-cover rounded-2xl"
                priority
              />
            </div>

            <!-- Cohort date badge -->
            <div
              class="absolute -bottom-4 start-6 bg-white rounded-xl shadow-lg p-4 flex items-center gap-3"
            >
              <div
                class="w-12 h-12 rounded-lg bg-ios-brand-primary/10 flex items-center justify-center flex-shrink-0"
              >
                <ios-icon
                  name="calendar"
                  class="w-6 h-6 text-ios-brand-primary"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p class="font-heading font-semibold text-[14px] text-ios-fg-10">
                  {{ data().cohortLabel }}
                </p>
                <p class="text-[15px] text-ios-fg-13 font-semibold">{{ data().cohortDate }}</p>
              </div>
            </div>

            <!-- Graduate count badge -->
            <div
              class="absolute -top-4 -end-4 bg-ios-brand-primary text-white rounded-xl shadow-lg p-4 text-center"
            >
              <p class="font-heading font-bold text-[28px] leading-none">
                {{ data().graduatesCount }}
              </p>
              <p class="text-[13px] font-medium mt-1 opacity-90">{{ data().graduatesLabel }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class HeroSection {
  readonly data = input.required<HeroData>();
  protected readonly lang = inject(LanguageService);
}
