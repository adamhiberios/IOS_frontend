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
      [attr.aria-label]="lang.t('landing.trustedBy.sectionAriaLabel')"
      class="bg-ios-surface-muted py-10 overflow-hidden"
    >
      <p
        class="text-center font-heading font-semibold text-[13px] tracking-widest text-ios-fg-7 uppercase mb-8 px-6"
      >
        {{ lang.t('landing.trustedBy.title') }}
      </p>

      <!--
        Marquee strip. The keyframes shift the track by -50%, so the visible
        coverage at the loop seam is half the track. Each copy renders ~1600px
        wide at h-16, so six copies keep ~4800px on screen — enough for wide
        and ultra-wide viewports without a blank gap before the loop restarts.
      -->
      <div class="overflow-hidden" aria-hidden="true">
        <div class="flex w-max animate-marquee rtl:animate-marquee-rtl">
          @for (copy of copies; track copy) {
            <img
              ngSrc="/assets/images/landing_worlds_best_teams.webp"
              alt=""
              width="3456"
              height="138"
              loading="lazy"
              decoding="async"
              class="h-16 w-auto flex-shrink-0"
            />
          }
        </div>
      </div>
    </section>
  `,
})
export class TrustedBySection {
  protected readonly lang = inject(LanguageService);
  protected readonly copies = [0, 1, 2, 3, 4, 5];
}
