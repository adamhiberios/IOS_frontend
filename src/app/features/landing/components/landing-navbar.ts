import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideArrowUpRight } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, LanguageSelector, provideIcons } from '@ui';

/**
 * `ios-landing-navbar` — public-facing navbar for the landing page.
 *
 * Distinct from `ios-auth-header` (which is minimal, used on /auth/* pages).
 * This navbar includes full navigation links (Certifications, About, Blog, Contact)
 * plus Login / Register CTAs.
 *
 * Uses backdrop-blur and a border-bottom to float above page content.
 */
@Component({
  selector: 'ios-landing-navbar',
  imports: [LanguageSelector, RouterLink, IosIcon, NgOptimizedImage],
  providers: [provideIcons(LucideArrowUpRight)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav
      class="sticky top-0 z-50
             backdrop-blur-[9px] bg-white/95
             border-b-2 border-ios-border-light border-solid"
      [attr.aria-label]="lang.t('landing.nav.mainNavAriaLabel')"
    >
      <div class="flex items-center justify-between px-6 md:px-16 lg:px-[120px] py-4">
        <!-- Brand -->
        <a
          routerLink="/"
          [attr.aria-label]="lang.t('landing.nav.homeAriaLabel')"
          class="flex-shrink-0"
        >
          <img
            ngSrc="/assets/icons/logo_institute_of_scrum.png"
            [attr.alt]="lang.t('landing.nav.logoAlt')"
            width="368"
            height="122"
            class="h-[44px] w-auto"
            priority
          />
        </a>

        <!-- Nav links — hidden on mobile -->
        <div class="hidden lg:flex items-center gap-1">
          <button
            class="text-center px-4 py-2 rounded-lg
                   font-heading font-semibold text-[15px]
                   text-ios-fg-10 hover:bg-ios-surface-strong transition-colors"
          >
            {{ lang.t('landing.nav.certifications') }}
          </button>
          <button
            class="text-center px-4 py-2 rounded-lg
                   font-heading font-semibold text-[15px]
                   text-ios-fg-10 hover:bg-ios-surface-strong transition-colors"
          >
            {{ lang.t('landing.nav.about') }}
          </button>
          <a
            routerLink="/insights"
            class="text-center px-4 py-2 rounded-lg
                   font-heading font-semibold text-[15px]
                   text-ios-fg-10 hover:bg-ios-surface-strong transition-colors"
          >
            {{ lang.t('landing.nav.blog') }}
          </a>
          <a
            routerLink="/contact"
            class="text-center px-4 py-2 rounded-lg
                   font-heading font-semibold text-[15px]
                   text-ios-fg-10 hover:bg-ios-surface-strong transition-colors"
          >
            {{ lang.t('landing.nav.contact') }}
          </a>
        </div>

        <!-- Auth CTAs + language -->
        <div class="flex items-center gap-3">
          <a
            routerLink="/auth/login"
            class="inline-flex items-center justify-center bg-ios-brand-primary-soft text-ios-brand-primary
                   font-heading font-semibold text-[15px]
                   h-10 px-5 rounded-lg no-underline
                   hover:opacity-90 transition-opacity
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
          >
            {{ lang.t('landing.nav.login') }}
          </a>
          <a
            routerLink="/auth/register"
            class="inline-flex items-center justify-center bg-ios-brand-primary text-white
                   font-heading font-semibold text-[15px]
                   h-10 px-5 rounded-lg
                   hover:bg-ios-brand-primary-hover transition-colors
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
          >
            {{ lang.t('landing.nav.register') }}
            <ios-icon name="arrow-up-right" class="w-4 h-4" aria-hidden="true" />
          </a>
          <ios-language-selector />
        </div>
      </div>
    </nav>
  `,
})
export class LandingNavbar {
  protected readonly lang = inject(LanguageService);
}
