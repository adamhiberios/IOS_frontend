import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LanguageService } from '@core/i18n';
import { CanadaFlag } from '@ui';

/**
 * `ios-landing-footer` — full website footer for the public landing page.
 *
 * Placeholder links that have no route yet use `href="#"` with a click handler
 * that prevents default navigation, instead of `routerLink="#"` which would
 * navigate to an invalid route.
 */
@Component({
  selector: 'ios-landing-footer',
  imports: [NgOptimizedImage, RouterLink, CanadaFlag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="bg-ios-brand-dark text-white">
      <div class="px-6 md:px-16 lg:px-[120px] pt-12 lg:pt-16">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-8">
          <!-- Brand + social -->
          <div class="lg:col-span-2">
            <img
              ngSrc="/assets/icons/logo_institute_of_scrum_white.png"
              alt="Institute of Scrum"
              width="368"
              height="122"
              class="h-[50px] w-auto mb-5"
            />

            <div class="flex items-center gap-3 mt-6">
              <a
                href="https://www.linkedin.com/company/institute-of-scrum"
                target="_blank"
                rel="noopener noreferrer"
                class="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center
                       hover:bg-white/20 transition-colors text-sm
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                aria-label="LinkedIn"
                >in</a
              >
              <a
                href="#"
                class="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center
                       hover:bg-white/20 transition-colors text-sm
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                aria-label="X / Twitter"
                (click)="$event.preventDefault()"
                >X</a
              >
              <a
                href="#"
                class="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center
                       hover:bg-white/20 transition-colors text-sm
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                aria-label="Facebook"
                (click)="$event.preventDefault()"
                >f</a
              >
              <a
                href="#"
                class="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center
                       hover:bg-white/20 transition-colors text-sm
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                aria-label="YouTube"
                (click)="$event.preventDefault()"
                >&#9654;</a
              >
            </div>
          </div>

          <!-- Certifications -->
          <div>
            <h3 class="font-heading font-semibold text-[15px] mb-4 text-ios-brand-gold">
              {{ lang.t('landing.footer.certifications.title') }}
            </h3>
            <ul class="space-y-3">
              <li>
                <a
                  routerLink="/certifications"
                  class="text-ios-brand-muted text-[14px] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                  >{{ lang.t('landing.footer.certifications.foundation') }}</a
                >
              </li>
              <li>
                <a
                  routerLink="/certifications"
                  class="text-ios-brand-muted text-[14px] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                  >{{ lang.t('landing.footer.certifications.practitioner') }}</a
                >
              </li>
              <li>
                <a
                  routerLink="/certifications"
                  class="text-ios-brand-muted text-[14px] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                  >{{ lang.t('landing.footer.certifications.authority') }}</a
                >
              </li>
            </ul>
          </div>

          <!-- Resources -->
          <div>
            <h3 class="font-heading font-semibold text-[15px] mb-4 text-ios-brand-gold">
              {{ lang.t('landing.footer.resources.title') }}
            </h3>
            <ul class="space-y-3">
              <li>
                <a
                  routerLink="/insights"
                  class="text-ios-brand-muted text-[14px] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                  >{{ lang.t('landing.footer.resources.journal') }}</a
                >
              </li>
              <li>
                <a
                  href="#"
                  (click)="$event.preventDefault()"
                  class="text-ios-brand-muted text-[14px] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                  >{{ lang.t('landing.footer.resources.guides') }}</a
                >
              </li>
            </ul>
          </div>

          <!-- Company -->
          <div>
            <h3 class="font-heading font-semibold text-[15px] mb-4 text-ios-brand-gold">
              {{ lang.t('landing.footer.company.title') }}
            </h3>
            <ul class="space-y-3">
              <li>
                <a
                  href="#"
                  (click)="$event.preventDefault()"
                  class="text-ios-brand-muted text-[14px] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                  >{{ lang.t('landing.footer.company.about') }}</a
                >
              </li>
              <li>
                <a
                  routerLink="/contact"
                  class="text-ios-brand-muted text-[14px] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                  >{{ lang.t('landing.footer.company.contact') }}</a
                >
              </li>
            </ul>
          </div>

          <!-- Legal -->
          <div>
            <h3 class="font-heading font-semibold text-[15px] mb-4 text-ios-brand-gold">
              {{ lang.t('landing.footer.legal.title') }}
            </h3>
            <ul class="space-y-3">
              <li>
                <a
                  routerLink="/privacy"
                  class="text-ios-brand-muted text-[14px] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                  >{{ lang.t('landing.footer.legal.privacy') }}</a
                >
              </li>
              <li>
                <a
                  routerLink="/terms"
                  class="text-ios-brand-muted text-[14px] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                  >{{ lang.t('landing.footer.legal.terms') }}</a
                >
              </li>
            </ul>
          </div>
        </div>

        <div class="my-4 border-t border-white/10"></div>
      </div>

      <!-- Bottom bar -->
      <div class="flex items-center justify-center gap-1 px-6 pb-4">
        <small class="text-ios-brand-muted text-xs">{{ lang.t('landing.footer.copyright') }}</small>
        <ios-canada-flag />
      </div>
    </footer>
  `,
})
export class LandingFooter {
  protected readonly lang = inject(LanguageService);
}
