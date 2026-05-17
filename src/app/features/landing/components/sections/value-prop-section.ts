/**
 * `ios-value-prop-section` — "Scrum Certification Built for the Role You Actually Play" (section 4).
 *
 * Displays a full-width image beside three value proposition cards.
 *
 * ## Data ownership
 * All content is static. Card icons are structural constants; titles and
 * descriptions are translated via `lang.t()`. No store input needed.
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { LucideStar } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, SectionBadge, provideIcons } from '@ui';
import type { LucideIconName } from '@ui';

interface ValuePropCard {
  icon: LucideIconName;
  title: string;
  description: string;
}

@Component({
  selector: 'ios-value-prop-section',
  imports: [NgOptimizedImage, IosIcon, SectionBadge],
  providers: [provideIcons(LucideStar)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      [attr.aria-label]="lang.t('landing.sections.valuePropSectionAriaLabel')"
      class="bg-ios-surface-muted py-18 lg:py-16"
    >
      <div class="px-6 md:px-16 lg:px-[120px]">
        <!-- Section header -->
        <div class="text-center max-w-[1100px] mx-auto mb-14">
          <div class="mb-6">
            <ios-section-badge
              [text]="lang.t('landing.sections.valueProposition')"
              variant="amber"
            />
          </div>
          <h2 class="font-heading font-bold text-[clamp(1.5rem,3vw,2.25rem)] leading-tight mb-4">
            <span class="text-ios-brand-primary me-1">{{
              lang.t('landing.sections.rolePlay')
            }}</span>
            <span class="text-ios-brand-dark">{{
              lang.t('landing.sections.rolePlayHighlight')
            }}</span>
          </h2>
          <p class="text-[16px] text-ios-fg-8 leading-relaxed mb-5">
            {{ lang.t('landing.sections.rolePlaySubtitle') }}
          </p>
          <div class="w-36 h-1 bg-ios-brand-gold mx-auto rounded-full"></div>
        </div>

        <!-- Image + cards -->
        <div class="flex flex-col lg:flex-row items-stretch gap-6">
          <!-- Image -->
          <div class="lg:w-[45%] flex-shrink-0 rounded-2xl overflow-hidden">
            <img
              ngSrc="/assets/images/landing_value_proposition.png"
              [alt]="lang.t('landing.sections.valuePropImageAlt')"
              width="2400"
              height="1792"
              class="w-full h-full object-cover"
            />
          </div>

          <!-- Value prop cards -->
          <div class="flex flex-col flex-1 gap-4">
            @for (card of cards(); track card.title) {
              <div
                class="flex-1 flex flex-col gap-3 border border-ios-border-light rounded-xl p-6 bg-white"
              >
                <div
                  class="w-11 h-11 rounded-lg bg-ios-brand-gold-soft border border-ios-brand-gold
                         flex items-center justify-center flex-shrink-0"
                >
                  <ios-icon
                    [name]="card.icon"
                    class="w-5 h-5 text-ios-brand-gold"
                    aria-hidden="true"
                  />
                </div>
                <h3 class="font-heading font-bold text-[17px] text-ios-fg-13">{{ card.title }}</h3>
                <p class="text-[14px] text-ios-fg-8 leading-relaxed">{{ card.description }}</p>
              </div>
            }
          </div>
        </div>
      </div>
    </section>
  `,
})
export class ValuePropSection {
  protected readonly lang = inject(LanguageService);

  /**
   * Static card definitions. Icon name is a structural constant; title and
   * description are locale-reactive via `lang.t()`.
   */
  protected readonly cards = computed<ValuePropCard[]>(() => [
    {
      icon: 'star',
      title: this.lang.t('landing.valueProp.roleSpecialized.title'),
      description: this.lang.t('landing.valueProp.roleSpecialized.description'),
    },
    {
      icon: 'star',
      title: this.lang.t('landing.valueProp.masteryPath.title'),
      description: this.lang.t('landing.valueProp.masteryPath.description'),
    },
    {
      icon: 'star',
      title: this.lang.t('landing.valueProp.practicalFocus.title'),
      description: this.lang.t('landing.valueProp.practicalFocus.description'),
    },
  ]);
}
