/**
 * `ios-how-it-works-section` — "Certification Road Map" zigzag timeline (section 9).
 *
 * ## Data ownership
 * All step data is static. Step numbers and icon names are structural constants;
 * titles and descriptions are locale-reactive via `lang.t()`.
 * No store input needed.
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideTarget,
  LucideBookOpenText,
  LucideListChecks,
  LucideKey,
  LucideSquareCheck,
  LucideBadgeCheck,
} from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, SectionBadge, provideIcons } from '@ui';
import type { LucideIconName } from '@ui';

interface HowItWorksStep {
  number: string;
  icon: LucideIconName;
  title: string;
  description: string;
}

@Component({
  selector: 'ios-how-it-works-section',
  imports: [RouterLink, IosIcon, SectionBadge],
  providers: [
    provideIcons(
      LucideArrowRight,
      LucideTarget,
      LucideBookOpenText,
      LucideListChecks,
      LucideKey,
      LucideSquareCheck,
      LucideBadgeCheck,
    ),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      [attr.aria-label]="lang.t('landing.sections.howItWorksSectionAriaLabel')"
      class="bg-ios-surface-warm py-[72px]"
    >
      <div class="max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px]">
        <!-- Header -->
        <div class="flex flex-col items-center gap-3 mb-16">
          <ios-section-badge [text]="lang.t('landing.sections.howItWorks')" variant="warm-red" />
          <h2
            class="font-heading font-extrabold text-[36px] text-center leading-tight text-ios-fg-10"
          >
            <span>{{ lang.t('landing.sections.pathToCertification') }}</span>
            <span class="text-ios-brand-primary ms-1">
              {{ lang.t('landing.sections.pathToCertificationSuffixes') }}
            </span>
          </h2>
          <div class="w-[270px] h-1 bg-ios-brand-gold rounded-full" aria-hidden="true"></div>
        </div>

        <!-- Zigzag timeline -->
        <!-- Rows sit much closer together on phones: the shrunken icons and
             top-aligned copy already read as separate steps without 64px of air. -->
        <div class="relative mx-auto flex flex-col gap-4 md:gap-8">
          @for (step of steps(); track step.number; let even = $even) {
            <!-- items-start on mobile so the icon lines up with the first line
                 of the title rather than the middle of a tall text block. -->
            <div class="relative flex items-start md:items-center" style="z-index: 1;">
              <!-- Left panel: text for odd steps (even=false → idx 1, 3, 5) -->
              <div [class]="panelClass('start', !even)">
                @if (!even) {
                  <div class="text-end">
                    <h3
                      class="font-heading font-extrabold text-[18px] mb-2 leading-snug text-ios-fg-10"
                    >
                      {{ step.title }}
                    </h3>
                    <p class="font-heading text-[14px] leading-relaxed text-ios-fg-7">
                      {{ step.description }}
                    </p>
                  </div>
                }
              </div>

              <!-- Central icon box (smaller on mobile to leave room for the copy) -->
              <div class="relative flex-shrink-0" style="z-index: 10;">
                <!-- Number badge -->
                <div
                  class="absolute w-8 h-8 md:w-10 md:h-10 rounded-full bg-ios-brand-gold border-2 border-white
                         flex items-center justify-center font-heading font-bold text-[12px] md:text-[14px] text-white
                         -top-3 -start-3 md:-top-[18px] md:-start-[18px] z-[11]"
                  aria-hidden="true"
                >
                  {{ step.number }}
                </div>
                <!-- Icon square -->
                <div
                  class="w-14 h-14 md:w-20 md:h-20 rounded-lg bg-ios-brand-primary flex items-center justify-center shadow-md"
                >
                  <ios-icon
                    [name]="step.icon"
                    class="w-6 h-6 md:w-8 md:h-8 text-white"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <!-- Right panel: text for even steps (even=true → idx 0, 2, 4) -->
              <div [class]="panelClass('end', even)">
                @if (even) {
                  <div>
                    <h3
                      class="font-heading font-extrabold text-[18px] mb-2 leading-snug text-ios-fg-10"
                    >
                      {{ step.title }}
                    </h3>
                    <p class="font-heading text-[14px] leading-relaxed text-ios-fg-7">
                      {{ step.description }}
                    </p>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- CTA -->
        <div class="flex justify-center mt-16">
          <a
            routerLink="/certifications"
            class="inline-flex items-center justify-center gap-3
                   font-heading font-semibold text-[18px] text-white
                   bg-ios-brand-primary px-6 py-4 rounded-xl min-w-[280px]
                   hover:bg-ios-brand-primary-hover transition-colors
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
          >
            {{ lang.t('landing.howItWorks.cta') }}
            <ios-icon name="arrow-right" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  `,
})
export class HowItWorksSection {
  protected readonly lang = inject(LanguageService);

  /**
   * Classes for one side of a timeline row.
   *
   * Every row has a text panel on one side and an empty spacer on the other.
   * The desktop split is fixed (5/12 text, 6/12 spacer) so the icons line up
   * in a column down the middle. That does not survive a phone: 5/12 of a
   * 327px content box leaves the copy in a ~136px ribbon.
   *
   * Below `md` the spacer collapses to a 12px gutter — pushing the icon hard
   * against the start edge on even rows and the end edge on odd ones — and the
   * text panel takes everything left over via `flex-1`.
   */
  protected panelClass(side: 'start' | 'end', hasText: boolean): string {
    if (!hasText) return 'w-3 md:w-6/12';
    return side === 'start'
      ? 'flex justify-end flex-1 min-w-0 md:flex-none md:w-5/12 pe-3 md:pe-8'
      : 'flex-1 min-w-0 md:flex-none md:w-5/12 ps-3 md:ps-8';
  }

  /**
   * Static step definitions. Numbers and icon names are structural constants;
   * titles and descriptions are locale-reactive via `lang.t()`.
   */
  protected readonly steps = computed<HowItWorksStep[]>(() => [
    {
      number: '01',
      icon: 'target',
      title: this.lang.t('landing.howItWorks.choose.title'),
      description: this.lang.t('landing.howItWorks.choose.description'),
    },
    {
      number: '02',
      icon: 'book-open-text',
      title: this.lang.t('landing.howItWorks.review.title'),
      description: this.lang.t('landing.howItWorks.review.description'),
    },
    {
      number: '03',
      icon: 'list-checks',
      title: this.lang.t('landing.howItWorks.practice.title'),
      description: this.lang.t('landing.howItWorks.practice.description'),
    },
    {
      number: '04',
      icon: 'key',
      title: this.lang.t('landing.howItWorks.access.title'),
      description: this.lang.t('landing.howItWorks.access.description'),
    },
    {
      number: '05',
      icon: 'square-check',
      title: this.lang.t('landing.howItWorks.complete.title'),
      description: this.lang.t('landing.howItWorks.complete.description'),
    },
    {
      number: '06',
      icon: 'badge-check',
      title: this.lang.t('landing.howItWorks.earn.title'),
      description: this.lang.t('landing.howItWorks.earn.description'),
    },
  ]);
}
