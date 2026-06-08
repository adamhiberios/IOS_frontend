/**
 * `ios-all-certs-cta-section` — "All Scrum Certifications" CTA on brand-primary bg (section 11).
 *
 * Currently driven entirely by i18n. When the backend provides configurable
 * CTA copy, add a typed `data` input.
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDownload, LucideArrowRight } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, SectionBadge, provideIcons } from '@ui';

@Component({
  selector: 'ios-all-certs-cta-section',
  imports: [RouterLink, IosIcon, SectionBadge],
  providers: [provideIcons(LucideDownload, LucideArrowRight)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      [attr.aria-label]="lang.t('landing.sections.allCertsAtGlanceSectionAriaLabel')"
      class="relative overflow-hidden bg-ios-brand-primary py-20 lg:py-24"
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

      <div class="relative px-6 md:px-16 lg:px-[120px] text-center">
        <div class="mb-6">
          <ios-section-badge
            [text]="lang.t('landing.sections.allCertsAtGlance.badge')"
            variant="cta-dark"
          />
        </div>

        <h2 class="font-heading font-extrabold text-[clamp(2rem,4vw,3rem)] leading-tight mb-5">
          <span class="text-white">{{ lang.t('landing.sections.allCertsAtGlance.all') }}</span>
          <span class="ms-2 text-ios-brand-gold">
            {{ lang.t('landing.sections.allCertsAtGlance.scrumCertifications') }}
          </span>
        </h2>

        <p class="text-[16px] text-white/80 leading-relaxed max-w-[600px] mx-auto mb-10">
          {{ lang.t('landing.sections.allCertsAtGlance.description') }}
        </p>

        <div class="flex flex-wrap items-center justify-center gap-4">
          <a
            routerLink="/guide"
            class="bg-white text-ios-brand-primary font-heading font-semibold text-[16px]
                   h-14 px-10 rounded-xl inline-flex items-center gap-2
                   hover:bg-white/90 transition-colors
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <ios-icon name="download" class="w-5 h-5" aria-hidden="true" />
            {{ lang.t('landing.sections.allCertsAtGlance.downloadGuide') }}
          </a>
          <a
            routerLink="/certifications"
            class="bg-transparent text-white border-2 border-white/40
                   font-heading font-semibold text-[16px]
                   h-14 px-8 rounded-xl inline-flex items-center gap-2
                   hover:bg-white/10 transition-colors
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            {{ lang.t('landing.sections.allCertsAtGlance.exploreCerts') }}
            <ios-icon name="arrow-right" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  `,
})
export class AllCertsCtaSection {
  protected readonly lang = inject(LanguageService);
}
