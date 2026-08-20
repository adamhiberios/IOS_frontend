/**
 * `ios-why-choose-us-section` — "Why Institute of Scrum" dark-red section (section 6).
 *
 * Currently driven entirely by i18n. When the backend provides configurable
 * marketing copy, add a `data` input of type `WhyChooseUsData`.
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { LanguageService } from '@core/i18n';

@Component({
  selector: 'ios-why-choose-us-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      [attr.aria-label]="lang.t('landing.sections.whyChooseUsSectionAriaLabel')"
      class="relative overflow-hidden bg-ios-brand-primary py-16 lg:py-20"
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

      <div class="relative max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px]">
        <div class="flex flex-col items-center text-center gap-5">
          <!-- Heading: "Why" (white) + "Institute of Scrum" (yellow-bright) -->
          <h2 class="font-heading font-bold text-[clamp(1.75rem,4vw,2.75rem)] leading-tight">
            <span class="text-white">{{ lang.t('landing.sections.whyChooseUs.why') }}</span>
            <span class="ms-2 text-ios-brand-yellow-bright">
              {{ lang.t('landing.sections.whyChooseUs.instituteOfScrum') }}
            </span>
          </h2>

          <div class="w-[270px] h-1 bg-ios-brand-gold rounded-full" aria-hidden="true"></div>

          <p class="text-[16px] leading-relaxed max-w-[720px] text-ios-border-light">
            {{ lang.t('landing.sections.whyChooseUs.description') }}
          </p>
        </div>
      </div>
    </section>
  `,
})
export class WhyChooseUsSection {
  protected readonly lang = inject(LanguageService);
}
