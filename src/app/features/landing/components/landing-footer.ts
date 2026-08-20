import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthStore } from '@core/auth';
import { LanguageService } from '@core/i18n';
import { CanadaFlag } from '@ui';

/**
 * `ios-landing-footer` — full website footer for the public landing page.
 *
 * Placeholder links that have no route yet use `href="#"` with a click handler
 * that prevents default navigation, instead of `routerLink="#"` which would
 * navigate to an invalid route.
 *
 * The Certifications column deep-links into the per-track sections of the All
 * Certifications page via `[fragment]` rather than dropping the visitor at the
 * top of it. The anchors are the track heading ids owned by
 * `pages/all-certifications.page.ts`; the router's `anchorScrolling` (see
 * `app.config.ts`) does the scrolling. Same convention as the "Explore" links
 * in `components/sections/cert-levels-section.ts`.
 *
 * "Student Portal" under Resources routes on session state — the portal for a
 * signed-in visitor, the login form otherwise. Same precedent as the navbar's
 * auth CTA (`components/landing-navbar.ts`). RBAC here is presentation only;
 * `/dashboard` is still gated by `authGuard` (CLAUDE.md §8).
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
          <div class="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-8">
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
                    fragment="all-certs-sm-heading"
                    class="text-ios-line text-[14px] font-medium leading-[1.4] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                    >{{ lang.t('landing.footer.certifications.scrumMaster') }}</a
                  >
                </li>
                <li>
                  <a
                    routerLink="/certifications"
                    fragment="all-certs-po-heading"
                    class="text-ios-line text-[14px] font-medium leading-[1.4] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                    >{{ lang.t('landing.footer.certifications.productOwner') }}</a
                  >
                </li>
                <li>
                  <a
                    routerLink="/certifications"
                    fragment="all-certs-sf-heading"
                    class="text-ios-line text-[14px] font-medium leading-[1.4] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                    >{{ lang.t('landing.footer.certifications.scrumFacilitator') }}</a
                  >
                </li>
              </ul>
            </div>

            <!-- About -->
            <div>
              <h3
                class="font-heading font-extrabold text-[16px] leading-[1.2] mb-3 text-ios-brand-gold"
              >
                {{ lang.t('landing.footer.about.title') }}
              </h3>
              <ul class="space-y-3">
                <li>
                  <a
                    routerLink="/about-institute"
                    class="text-ios-line text-[14px] font-medium leading-[1.4] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                    >{{ lang.t('landing.footer.about.institute') }}</a
                  >
                </li>
                <li>
                  <a
                    routerLink="/about-agile"
                    class="text-ios-line text-[14px] font-medium leading-[1.4] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                    >{{ lang.t('landing.footer.about.agile') }}</a
                  >
                </li>
                <li>
                  <a
                    routerLink="/about-scrum"
                    class="text-ios-line text-[14px] font-medium leading-[1.4] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                    >{{ lang.t('landing.footer.about.scrum') }}</a
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
                    [routerLink]="studentPortalLink()"
                    class="text-ios-line text-[14px] font-medium leading-[1.4] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                    >{{ lang.t('landing.footer.resources.studentPortal') }}</a
                  >
                </li>
                <li>
                  <a
                    routerLink="/contact"
                    class="text-ios-line text-[14px] font-medium leading-[1.4] hover:text-white transition-colors
                         focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
                    >{{ lang.t('landing.footer.resources.support') }}</a
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

      <!-- Bottom bar — copyright with the legal links alongside it. Stacks on
           phones, sits on one centred row from sm up. -->
      <div
        class="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-x-6 gap-y-3 px-6 pb-6"
      >
        <div class="flex items-center gap-2">
          <ios-canada-flag />
          <p class="text-ios-brand-muted text-[14px] font-medium leading-[1.4]">
            {{ lang.t('landing.footer.copyright', { year: currentYear }) }}
          </p>
        </div>
        <nav
          class="flex items-center gap-x-6"
          [attr.aria-label]="lang.t('landing.footer.legalLinksTitle')"
        >
          <a
            routerLink="/privacy-policy"
            class="text-ios-brand-muted text-[14px] font-medium leading-[1.4] hover:text-white transition-colors
                   focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
            >{{ lang.t('landing.footer.privacy') }}</a
          >
          <a
            routerLink="/terms-of-use"
            class="text-ios-brand-muted text-[14px] font-medium leading-[1.4] hover:text-white transition-colors
                   focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ios-brand-primary/50 rounded"
            >{{ lang.t('landing.footer.terms') }}</a
          >
        </nav>
      </div>
    </footer>
  `,
})
export class LandingFooter {
  protected readonly lang = inject(LanguageService);
  private readonly auth = inject(AuthStore);
  protected readonly currentYear = new Date().getFullYear();

  /** Student Portal target — the portal itself when signed in, else login. */
  protected readonly studentPortalLink = computed(() =>
    this.auth.isAuthenticated() ? '/dashboard' : '/auth/login',
  );
}
