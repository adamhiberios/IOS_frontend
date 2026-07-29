import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideArrowUpRight, LucideChevronDown, LucideMenu, LucideX } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { AuthStore } from '@core/auth';
import { IosIcon, LanguageSelector, provideIcons } from '@ui';

/**
 * `ios-landing-navbar` — public-facing navbar for the landing page.
 *
 * Distinct from `ios-auth-header` (which is minimal, used on /auth/* pages).
 * This navbar includes full navigation links (Certifications, About, Insights, Contact)
 * plus Login / Register CTAs.
 *
 * Uses backdrop-blur and a border-bottom to float above page content.
 */
@Component({
  selector: 'ios-landing-navbar',
  imports: [LanguageSelector, RouterLink, IosIcon, NgOptimizedImage],
  providers: [provideIcons(LucideArrowUpRight, LucideChevronDown, LucideMenu, LucideX)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Dismiss the About menu on an outside click or Escape. Both no-op cheaply
  // while it is already closed.
  host: {
    '(document:click)': 'closeAbout()',
    '(document:keydown.escape)': 'closeAbout()',
  },
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

        <!-- Nav links — hidden on mobile, visible on lg+ -->
        <div class="hidden lg:flex items-center gap-1">
          <a
            routerLink="/certifications"
            class="text-center px-4 py-2 rounded-lg
                   font-heading font-semibold text-[15px]
                   text-ios-fg-10 hover:bg-ios-surface-strong transition-colors"
          >
            {{ lang.t('landing.nav.certifications') }}
          </a>
          <!-- About: a menu of links, not a destination of its own -->
          <div class="relative">
            <button
              type="button"
              (click)="toggleAbout($event)"
              [attr.aria-expanded]="aboutOpen()"
              aria-haspopup="true"
              aria-controls="about-menu"
              class="inline-flex items-center gap-1 text-center px-4 py-2 rounded-lg
                     font-heading font-semibold text-[15px]
                     text-ios-fg-10 hover:bg-ios-surface-strong transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
            >
              {{ lang.t('landing.nav.about') }}
              <ios-icon
                name="chevron-down"
                class="w-4 h-4 transition-transform"
                [class.rotate-180]="aboutOpen()"
                aria-hidden="true"
              />
            </button>
            @if (aboutOpen()) {
              <div
                id="about-menu"
                [attr.aria-label]="lang.t('landing.nav.aboutMenuAriaLabel')"
                class="absolute z-50 top-full start-0 mt-1 min-w-[240px]
                       rounded-lg border border-ios-border-light bg-white shadow-lg py-2"
              >
                @for (item of aboutItems; track item.path) {
                  <a
                    [routerLink]="item.path"
                    (click)="closeAbout()"
                    class="block px-4 py-2.5 text-start
                           font-heading font-semibold text-[15px]
                           text-ios-fg-10 hover:bg-ios-surface-strong transition-colors
                           focus-visible:outline-none focus-visible:bg-ios-surface-strong"
                  >
                    {{ lang.t(item.labelKey) }}
                  </a>
                }
              </div>
            }
          </div>
          <a
            routerLink="/insights"
            class="text-center px-4 py-2 rounded-lg
                   font-heading font-semibold text-[15px]
                   text-ios-fg-10 hover:bg-ios-surface-strong transition-colors"
          >
            {{ lang.t('landing.nav.insights') }}
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

        <!-- Auth CTAs + language + hamburger -->
        <div class="flex items-center gap-3">
          @if (auth.isAuthenticated()) {
            <!-- Signed in — go to the app instead of login/register -->
            <a
              routerLink="/dashboard"
              class="hidden lg:inline-flex items-center justify-center bg-ios-brand-primary text-white
                     font-heading font-semibold text-[15px]
                     h-11 px-5 rounded-lg no-underline
                     hover:bg-ios-brand-primary-hover transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
            >
              {{ lang.t('landing.nav.dashboard') }}
              <ios-icon name="arrow-up-right" class="w-4 h-4" aria-hidden="true" />
            </a>
          } @else {
            <!-- Login — hidden on mobile, shown on lg+ -->
            <a
              routerLink="/auth/login"
              class="hidden lg:inline-flex items-center justify-center bg-ios-brand-primary-soft text-ios-brand-primary
                     font-heading font-semibold text-[15px]
                     h-11 px-5 rounded-lg no-underline
                     hover:opacity-90 transition-opacity
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
            >
              {{ lang.t('landing.nav.login') }}
            </a>
            <!-- Register — hidden on mobile, shown on lg+ -->
            <a
              routerLink="/auth/register"
              class="hidden lg:inline-flex items-center justify-center bg-ios-brand-primary text-white
                     font-heading font-semibold text-[15px]
                     h-11 px-5 rounded-lg
                     hover:bg-ios-brand-primary-hover transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
            >
              {{ lang.t('landing.nav.register') }}
              <ios-icon name="arrow-up-right" class="w-4 h-4" aria-hidden="true" />
            </a>
          }
          <ios-language-selector />

          <!-- Hamburger — visible only on mobile (< lg) -->
          <button
            type="button"
            class="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg
                   text-ios-fg-10 hover:bg-ios-surface-strong transition-colors"
            (click)="mobileOpen.set(!mobileOpen())"
            [attr.aria-expanded]="mobileOpen()"
            aria-label="Toggle navigation menu"
          >
            @if (mobileOpen()) {
              <ios-icon name="x" class="w-6 h-6" />
            } @else {
              <ios-icon name="menu" class="w-6 h-6" />
            }
          </button>
        </div>
      </div>

      <!-- Mobile menu — slides down when open -->
      @if (mobileOpen()) {
        <div
          class="lg:hidden border-t border-ios-border-light px-6 md:px-16 pb-6 pt-4 flex flex-col gap-2"
        >
          <a
            routerLink="/certifications"
            (click)="closeMobileMenu()"
            class="w-full text-start px-4 py-3 rounded-lg
                   font-heading font-semibold text-[15px]
                   text-ios-fg-10 hover:bg-ios-surface-strong transition-colors"
          >
            {{ lang.t('landing.nav.certifications') }}
          </a>
          <!-- About expands in place rather than opening an overlay on top of
               a menu that is already an overlay -->
          <button
            type="button"
            (click)="toggleAbout($event)"
            [attr.aria-expanded]="aboutOpen()"
            aria-controls="about-menu-mobile"
            class="w-full flex items-center justify-between text-start px-4 py-3 rounded-lg
                   font-heading font-semibold text-[15px]
                   text-ios-fg-10 hover:bg-ios-surface-strong transition-colors
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
          >
            {{ lang.t('landing.nav.about') }}
            <ios-icon
              name="chevron-down"
              class="w-4 h-4 transition-transform"
              [class.rotate-180]="aboutOpen()"
              aria-hidden="true"
            />
          </button>
          @if (aboutOpen()) {
            <div id="about-menu-mobile" class="flex flex-col gap-1 ps-4">
              @for (item of aboutItems; track item.path) {
                <a
                  [routerLink]="item.path"
                  (click)="closeMobileMenu()"
                  class="w-full text-start px-4 py-3 rounded-lg
                         font-heading font-medium text-[14px]
                         text-ios-fg-8 hover:bg-ios-surface-strong transition-colors"
                >
                  {{ lang.t(item.labelKey) }}
                </a>
              }
            </div>
          }
          <a
            routerLink="/insights"
            class="w-full text-start px-4 py-3 rounded-lg
                   font-heading font-semibold text-[15px]
                   text-ios-fg-10 hover:bg-ios-surface-strong transition-colors"
          >
            {{ lang.t('landing.nav.insights') }}
          </a>
          <a
            routerLink="/contact"
            class="w-full text-start px-4 py-3 rounded-lg
                   font-heading font-semibold text-[15px]
                   text-ios-fg-10 hover:bg-ios-surface-strong transition-colors"
          >
            {{ lang.t('landing.nav.contact') }}
          </a>
          <hr class="my-2 border-ios-border-light" />
          @if (auth.isAuthenticated()) {
            <a
              routerLink="/dashboard"
              class="w-full text-center py-3 px-4 rounded-lg
                     bg-ios-brand-primary text-white
                     font-heading font-semibold text-[15px]
                     no-underline hover:bg-ios-brand-primary-hover transition-colors"
            >
              {{ lang.t('landing.nav.dashboard') }}
              <ios-icon name="arrow-up-right" class="w-4 h-4" aria-hidden="true" />
            </a>
          } @else {
            <a
              routerLink="/auth/login"
              class="w-full text-center py-3 px-4 rounded-lg
                     bg-ios-brand-primary-soft text-ios-brand-primary
                     font-heading font-semibold text-[15px]
                     no-underline hover:opacity-90 transition-opacity"
            >
              {{ lang.t('landing.nav.login') }}
            </a>
            <a
              routerLink="/auth/register"
              class="w-full text-center py-3 px-4 rounded-lg
                     bg-ios-brand-primary text-white
                     font-heading font-semibold text-[15px]
                     no-underline hover:bg-ios-brand-primary-hover transition-colors"
            >
              {{ lang.t('landing.nav.register') }}
              <ios-icon name="arrow-up-right" class="w-4 h-4" aria-hidden="true" />
            </a>
          }
        </div>
      }
    </nav>
  `,
})
export class LandingNavbar {
  protected readonly lang = inject(LanguageService);
  protected readonly auth = inject(AuthStore);
  protected readonly mobileOpen = signal(false);

  /**
   * Shared by the desktop popover and the mobile in-place expansion — the two
   * live in mutually exclusive DOM (`hidden lg:flex` vs `lg:hidden`), so one
   * signal cannot show both at once.
   */
  protected readonly aboutOpen = signal(false);

  /**
   * The "About" destinations. Routes are structural constants; labels resolve
   * through `lang.t()` so they stay locale-reactive.
   */
  protected readonly aboutItems = [
    { path: '/about-mock-exam', labelKey: 'landing.nav.aboutItems.mockExam' },
    { path: '/about-scrum-master', labelKey: 'landing.nav.aboutItems.scrumMaster' },
    { path: '/about-product-owner', labelKey: 'landing.nav.aboutItems.productOwner' },
    { path: '/about-scrum-facilitator', labelKey: 'landing.nav.aboutItems.scrumFacilitator' },
  ] as const;

  /**
   * Stops propagation so the document-level dismiss handler doesn't close the
   * menu in the same click that opened it.
   */
  protected toggleAbout(event: Event): void {
    event.stopPropagation();
    this.aboutOpen.update((open) => !open);
  }

  protected closeAbout(): void {
    if (this.aboutOpen()) this.aboutOpen.set(false);
  }

  /** Navigating from the mobile sheet dismisses the sheet and the submenu. */
  protected closeMobileMenu(): void {
    this.aboutOpen.set(false);
    this.mobileOpen.set(false);
  }
}
