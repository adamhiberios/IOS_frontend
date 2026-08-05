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
      <div class="max-w-[1440px] mx-auto px-6 md:px-16 lg:px-[120px] pt-12 lg:pt-14">
        <div class="flex flex-col lg:flex-row gap-10 lg:gap-16">
          <!-- Brand + social -->
          <div class="flex-shrink-0 lg:w-[240px]">
            <img
              ngSrc="/assets/icons/logo_institute_of_scrum_white.png"
              [attr.alt]="lang.t('landing.footer.logoAlt')"
              width="368"
              height="122"
              class="h-[50px] w-auto mb-5"
            />
            <div class="flex items-center gap-3 mt-6">
              <a
                href="https://www.linkedin.com/company/institute-of-scrum"
                target="_blank"
                rel="noopener noreferrer"
                class="w-9 h-9 rounded-[10px] bg-[#fff9f0] flex items-center justify-center
                       hover:opacity-80 transition-opacity text-ios-brand-dark text-sm font-bold
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                [attr.aria-label]="lang.t('landing.footer.linkedinAriaLabel')"
                >in</a
              >
              <a
                href="#"
                class="w-9 h-9 rounded-[10px] bg-[#fff9f0] flex items-center justify-center
                       hover:opacity-80 transition-opacity text-ios-brand-dark text-sm font-bold
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                [attr.aria-label]="lang.t('landing.footer.xAriaLabel')"
                (click)="$event.preventDefault()"
                >X</a
              >
              <a
                href="#"
                class="w-9 h-9 rounded-[10px] bg-[#fff9f0] flex items-center justify-center
                       hover:opacity-80 transition-opacity text-ios-brand-dark text-sm font-bold
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                [attr.aria-label]="lang.t('landing.footer.facebookAriaLabel')"
                (click)="$event.preventDefault()"
                >f</a
              >
              <a
                href="#"
                class="w-9 h-9 rounded-[10px] bg-[#fff9f0] flex items-center justify-center
                       hover:opacity-80 transition-opacity text-ios-brand-dark text-sm font-bold
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                [attr.aria-label]="lang.t('landing.footer.youtubeAriaLabel')"
                (click)="$event.preventDefault()"
                >&#9654;</a
              >
            </div>
          </div>

          <!-- Nav columns — fill remaining space -->
          <div class="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-8">
            <!-- Certifications -->
            <div>
              <h3
                class="font-heading font-extrabold text-[16px] leading-[1.2] mb-3 text-ios-brand-gold"
              >
                {{ lang.t('landing.footer.certifications.title') }}
              </h3>
              <ul class="space-y-3">
                <li>
                  <a
                    routerLink="/certifications"
                    class="text-ios-line text-[14px] font-medium leading-[1.4] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                    >{{ lang.t('landing.footer.certifications.scrumMaster') }}</a
                  >
                </li>
                <li>
                  <a
                    routerLink="/certifications"
                    class="text-ios-line text-[14px] font-medium leading-[1.4] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                    >{{ lang.t('landing.footer.certifications.productOwner') }}</a
                  >
                </li>
                <li>
                  <a
                    routerLink="/certifications"
                    class="text-ios-line text-[14px] font-medium leading-[1.4] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                    >{{ lang.t('landing.footer.certifications.scrumFacilitator') }}</a
                  >
                </li>
              </ul>
            </div>

            <!-- Company -->
            <div>
              <h3
                class="font-heading font-extrabold text-[16px] leading-[1.2] mb-3 text-ios-brand-gold"
              >
                {{ lang.t('landing.footer.company.title') }}
              </h3>
              <ul class="space-y-3">
                <li>
                  <a
                    href="#"
                    (click)="$event.preventDefault()"
                    class="text-ios-line text-[14px] font-medium leading-[1.4] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                    >{{ lang.t('landing.footer.company.about') }}</a
                  >
                </li>
                <li>
                  <a
                    routerLink="/certifications"
                    class="text-ios-line text-[14px] font-medium leading-[1.4] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                    >{{ lang.t('landing.footer.company.whyScrum') }}</a
                  >
                </li>
                <li>
                  <a
                    routerLink="/contact"
                    class="text-ios-line text-[14px] font-medium leading-[1.4] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                    >{{ lang.t('landing.footer.company.support') }}</a
                  >
                </li>
              </ul>
            </div>

            <!-- Resources -->
            <div>
              <h3
                class="font-heading font-extrabold text-[16px] leading-[1.2] mb-3 text-ios-brand-gold"
              >
                {{ lang.t('landing.footer.resources.title') }}
              </h3>
              <ul class="space-y-3">
                <li>
                  <a
                    routerLink="/insights"
                    class="text-ios-line text-[14px] font-medium leading-[1.4] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                    >{{ lang.t('landing.footer.resources.insights') }}</a
                  >
                </li>
                <li>
                  <a
                    href="#"
                    (click)="$event.preventDefault()"
                    class="text-ios-line text-[14px] font-medium leading-[1.4] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                    >{{ lang.t('landing.footer.resources.studentPortal') }}</a
                  >
                </li>
              </ul>
            </div>

            <!-- Legal -->
            <div>
              <h3
                class="font-heading font-extrabold text-[16px] leading-[1.2] mb-3 text-ios-brand-gold"
              >
                {{ lang.t('landing.footer.legal.title') }}
              </h3>
              <ul class="space-y-3">
                <li>
                  <a
                    routerLink="/privacy-policy"
                    class="text-ios-line text-[14px] font-medium leading-[1.4] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                    >{{ lang.t('landing.footer.legal.privacy') }}</a
                  >
                </li>
                <li>
                  <a
                    routerLink="/terms-of-use"
                    class="text-ios-line text-[14px] font-medium leading-[1.4] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                    >{{ lang.t('landing.footer.legal.terms') }}</a
                  >
                </li>
              </ul>
            </div>
          </div>
          <!-- /nav columns grid -->
        </div>
        <!-- /flex row -->

        <div class="mt-10 mb-4 border-t border-white/10"></div>
      </div>

      <!-- Bottom bar -->
      <div class="flex items-center justify-center gap-2 px-6 pb-6">
        <ios-canada-flag />
        <p class="text-ios-brand-muted text-[14px] font-medium leading-[1.4]">
          {{ lang.t('landing.footer.copyright', { year: currentYear }) }}
        </p>
      </div>
    </footer>
  `,
})
export class LandingFooter {
  protected readonly lang = inject(LanguageService);
  protected readonly currentYear = new Date().getFullYear();
}
