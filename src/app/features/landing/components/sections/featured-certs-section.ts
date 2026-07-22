/**
 * `ios-featured-certs-section` — live "Featured certifications" grid
 * (BE-I-20, `GET /landing.featuredPrograms`).
 *
 * Presentational: the parent passes the mapped `PublicCertificate[]`. Each card
 * links to the cert detail (`/certifications/:id`) and shows the locale-resolved
 * title/description + formatted price. The whole section hides when the list is
 * empty (API not yet loaded or failed), so the page degrades gracefully.
 */

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, SectionBadge, provideIcons } from '@ui';

import { formatPrice } from '../../data-access/catalog.mappers';
import { type PublicCertificate } from '../../data-access/catalog.model';

@Component({
  selector: 'ios-featured-certs-section',
  imports: [RouterLink, IosIcon, SectionBadge],
  providers: [provideIcons(LucideArrowRight)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (programs().length > 0) {
      <section
        [attr.aria-label]="lang.t('landing.featured.sectionAriaLabel')"
        class="bg-white px-6 md:px-16 lg:px-[120px] py-16"
      >
        <!-- Header -->
        <div class="flex flex-col items-center text-center gap-3 mb-10">
          <ios-section-badge [text]="lang.t('landing.featured.badge')" variant="gold" />
          <h2 class="font-heading font-extrabold text-[clamp(1.5rem,3vw,2rem)] leading-tight">
            <span class="text-ios-brand-dark">{{ lang.t('landing.featured.title') }} </span>
            <span class="text-ios-brand-primary">{{
              lang.t('landing.featured.titleHighlight')
            }}</span>
          </h2>
          <p class="font-body text-[15px] text-ios-fg-8 max-w-2xl">
            {{ lang.t('landing.featured.subtitle') }}
          </p>
        </div>

        <!-- Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          @for (cert of programs(); track cert.id) {
            <a
              [routerLink]="['/certifications', cert.id]"
              class="group flex flex-col h-full rounded-xl border-2 border-ios-border-light bg-white p-6
                     hover:shadow-md hover:border-ios-brand-gold transition-all
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/40"
            >
              <span
                class="inline-block self-start px-2 py-0.5 rounded-full text-[11px] font-heading font-semibold uppercase tracking-wide bg-ios-brand-gold-soft text-[#736428] mb-3"
              >
                {{ cert.programCode }}
              </span>
              <h3
                class="font-heading font-extrabold text-[18px] leading-tight text-ios-fg-10 mb-2 line-clamp-2"
              >
                {{ cert.title }}
              </h3>
              @if (cert.description) {
                <p class="font-body text-[14px] leading-relaxed text-ios-fg-7 line-clamp-3 flex-1">
                  {{ cert.description }}
                </p>
              } @else {
                <span class="flex-1"></span>
              }
              <div
                class="flex items-center justify-between mt-5 pt-4 border-t border-ios-border-light"
              >
                <span class="font-heading font-bold text-[18px] text-ios-brand-primary">
                  {{ price(cert) }}
                </span>
                <span
                  class="inline-flex items-center gap-1 font-heading font-semibold text-[14px] text-ios-brand-dark group-hover:text-ios-brand-primary transition-colors"
                >
                  {{ lang.t('landing.featured.explore') }}
                  <ios-icon name="arrow-right" class="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
                </span>
              </div>
            </a>
          }
        </div>

        <!-- View all -->
        <div class="text-center mt-10">
          <a
            routerLink="/certifications"
            class="inline-flex items-center gap-2 h-12 px-6 rounded-xl border-[1.5px] border-ios-brand-gold
                   text-[#736428] font-heading font-semibold text-[15px] hover:bg-ios-brand-gold-soft transition-colors
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/40"
          >
            {{ lang.t('landing.featured.viewAll') }}
            <ios-icon name="arrow-right" class="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
          </a>
        </div>
      </section>
    }
  `,
})
export class FeaturedCertsSection {
  readonly programs = input.required<readonly PublicCertificate[]>();
  protected readonly lang = inject(LanguageService);

  protected price(cert: PublicCertificate): string {
    return formatPrice(cert.price, cert.currency, this.lang.locale());
  }
}
