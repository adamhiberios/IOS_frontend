/**
 * `ios-trusted-by-section` — "Certified Scrum — powering the world's best teams" marquee (section 2).
 *
 * The marquee image is static. The section title is i18n-driven.
 * When the backend provides a list of logos, this component can be extended
 * with a `logos` input.
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

import { LanguageService } from '@core/i18n';

@Component({
  selector: 'ios-trusted-by-section',
  imports: [NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      aria-label="Certified Scrum powering the world's best teams"
      class="bg-ios-surface-muted py-10 overflow-hidden"
    >
      <p
        class="text-center font-heading font-semibold text-[13px] tracking-widest text-ios-fg-7 uppercase mb-8 px-6"
      >
        {{ lang.t('landing.trustedBy.title') }}
      </p>

      <!-- Marquee strip — two copies for seamless infinite loop -->
      <div class="overflow-hidden" aria-hidden="true">
        <div class="flex w-max animate-marquee">
          <img
            ngSrc="/assets/images/landing_worlds_best_teams.png"
            alt=""
            width="3456"
            height="138"
            loading="eager"
            decoding="async"
            class="h-16 w-auto flex-shrink-0"
          />
          <img
            ngSrc="/assets/images/landing_worlds_best_teams.png"
            alt=""
            width="3456"
            height="138"
            loading="eager"
            decoding="async"
            class="h-16 w-auto flex-shrink-0"
          />
        </div>
      </div>
    </section>
  `,
})
export class TrustedBySection {
  protected readonly lang = inject(LanguageService);
}
