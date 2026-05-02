/**
 * `ios-credibility-section` — "Why Scrum Certification Matters" strip (section 3).
 *
 * Renders four credibility indicator cards on the primary-brand background.
 * Card data (icon + title) comes from the `cards` input; UI labels are i18n.
 */

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import {
  LucideFiles,
  LucideLaptop,
  LucideBadgeDollarSign,
  LucideBadgeCheck,
} from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, SectionBadge, provideIcons } from '@ui';
import type { CredibilityCard } from '../../data-access/landing.model';

@Component({
  selector: 'ios-credibility-section',
  imports: [IosIcon, SectionBadge],
  providers: [provideIcons(LucideFiles, LucideLaptop, LucideBadgeDollarSign, LucideBadgeCheck)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      aria-label="Why Scrum Certification Matters"
      class="relative overflow-hidden bg-ios-brand-primary py-8 lg:py-12"
    >
      <!-- Decorative circles -->
      <div
        class="absolute bottom-0 start-0 w-72 h-72 rounded-full bg-ios-brand-primary-deep -translate-x-1/2 translate-y-1/2"
        aria-hidden="true"
      ></div>
      <div
        class="absolute top-0 end-0 w-72 h-72 rounded-full bg-ios-brand-primary-mid translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
      ></div>

      <div class="relative px-6 md:px-16 lg:px-[120px]">
        <!-- Section header -->
        <div class="text-center max-w-[600px] mx-auto mb-6">
          <div class="mb-2">
            <ios-section-badge
              [text]="lang.t('landing.sections.credibilityIndicators')"
              variant="dark"
            />
          </div>
          <h2
            class="font-heading font-bold text-[clamp(1.5rem,3vw,2.25rem)] leading-tight text-white mb-3"
          >
            {{ lang.t('landing.sections.whyMatters') }}
          </h2>
          <div class="w-36 h-1 bg-ios-brand-gold mx-auto rounded-full"></div>
        </div>

        <!-- Four cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          @for (card of cards(); track card.title) {
            <div class="flex flex-row items-center gap-4">
              <div
                class="w-14 h-14 rounded-xl bg-white/80 flex items-center justify-center flex-shrink-0"
              >
                <ios-icon
                  [name]="card.icon"
                  class="w-7 h-7 text-ios-brand-primary"
                  aria-hidden="true"
                />
              </div>
              <p class="font-heading font-semibold text-[16px] text-white leading-snug">
                {{ card.title }}
              </p>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class CredibilitySection {
  readonly cards = input.required<CredibilityCard[]>();
  protected readonly lang = inject(LanguageService);
}
