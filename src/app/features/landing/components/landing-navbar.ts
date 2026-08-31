import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  LucideArrowUpRight,
  LucideChevronDown,
  LucideChevronRight,
  LucideMenu,
  LucideX,
} from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { AuthStore } from '@core/auth';
import { CertificatesBadge, IosIcon, provideIcons } from '@ui';
import { PublicCatalogStore } from '../data-access/catalog.store';
import { levelRank, normalizeTrack, TRACK_ORDER } from '../data-access/catalog.mappers';
import type { PublicCertificate } from '../data-access/catalog.model';

/** One certificate row rendered in the mega-menu (view model, never sent to the API). */
interface CertMenuItem {
  id: string;
  code: string;
  title: string;
  badgeImage: string;
  detailLink: string;
  level: PublicCertificate['level'];
}

/** One track column in the mega-menu — omitted entirely when it has no published certs. */
interface CertMenuGroup {
  track: string;
  tabLabel: string;
  certs: CertMenuItem[];
}

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
  imports: [RouterLink, IosIcon, NgOptimizedImage, CertificatesBadge],
  providers: [
    provideIcons(LucideArrowUpRight, LucideChevronDown, LucideChevronRight, LucideMenu, LucideX),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Dismiss the About / Certifications menus on an outside click or Escape.
  // Both no-op cheaply while already closed.
  host: {
    '(document:click)': 'closeAbout(); closeCert()',
    '(document:keydown.escape)': 'closeAbout(); closeCert()',
  },
  template: `
    <nav
      class="sticky top-0 z-50
             backdrop-blur-[9px] bg-white/95
             border-b-2 border-ios-border-light border-solid"
      [attr.aria-label]="lang.t('landing.nav.mainNavAriaLabel')"
    >
      <div
        class="max-w-[1440px] mx-auto flex items-center justify-between px-6 md:px-16 lg:px-[120px] py-4"
      >
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
          <!-- Certifications: opens a mega-menu instead of navigating directly.
               Opens on hover (desktop mouse users); click still works for
               keyboard/touch users since mouseenter never fires for them. -->
          <div class="relative" (mouseenter)="onCertMouseEnter()" (mouseleave)="onCertMouseLeave()">
            <button
              type="button"
              (click)="toggleCert($event)"
              [attr.aria-expanded]="certOpen()"
              aria-haspopup="true"
              aria-controls="cert-menu"
              class="inline-flex items-center gap-1 text-center px-4 py-2 rounded-lg
                     font-heading font-semibold text-[15px]
                     text-ios-fg-10 hover:bg-ios-surface-strong transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
            >
              {{ lang.t('landing.nav.certifications') }}
              <ios-icon
                name="chevron-down"
                class="w-4 h-4 transition-transform"
                [class.rotate-180]="certOpen()"
                aria-hidden="true"
              />
            </button>
            @if (certOpen()) {
              <!--
              Fixed (viewport-relative) and horizontally centered, not
              absolute + start-0 anchored to this trigger button. The
              Certifications button sits near the left of the navbar, so a
              920px-wide panel anchored to its left edge ran past the right
              edge of the viewport on real desktop widths (1024-1400px-ish).
              Centering under the viewport, capped at
              min(920px, 100vw - 2rem), keeps equal margin on both sides so
              it can never run off either edge, and top-[78px] lines up with
              the navbar's own fixed height (44px logo + 16px*2 padding + 2px
              border) regardless of scroll position.
            -->
              <div
                id="cert-menu"
                [attr.aria-label]="lang.t('landing.nav.certMenuAriaLabel')"
                class="fixed z-50 top-[78px] start-1/2 -translate-x-1/2 rtl:translate-x-1/2 mt-1
                       w-[min(920px,calc(100vw-2rem))]
                       rounded-2xl border border-ios-border-light bg-white shadow-lg
                       px-8 py-6 flex flex-col gap-6"
              >
                <!-- Header -->
                <div class="flex items-center justify-between">
                  <p class="font-heading font-bold text-[20px] text-ios-fg-13">
                    {{ lang.t('landing.nav.certifications') }}
                  </p>
                  <a
                    routerLink="/certifications"
                    (click)="closeCert()"
                    class="inline-flex items-center gap-2
                           font-heading font-semibold text-[15px] text-ios-brand-primary
                           hover:underline focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-ios-brand-primary/50 rounded-lg"
                  >
                    {{ lang.t('landing.nav.certMenu.seeAll') }}
                    <ios-icon
                      name="arrow-up-right"
                      class="w-4 h-4 rtl:rotate-180"
                      aria-hidden="true"
                    />
                  </a>
                </div>

                <!-- Track columns — one per published track, only rendered if it has certs -->
                <div class="flex items-start gap-8">
                  @for (group of certGroups(); track group.track) {
                    <div class="flex flex-1 flex-col gap-2 min-w-0">
                      <p class="font-heading font-semibold text-[15px] text-ios-fg-13">
                        {{ group.tabLabel }}
                      </p>
                      <div class="border-t border-ios-border-light"></div>
                      <div class="flex flex-col gap-3">
                        @for (cert of group.certs; track cert.id) {
                          <a
                            [routerLink]="cert.detailLink"
                            (click)="closeCert()"
                            class="flex items-start gap-2 rounded-lg
                                   hover:bg-ios-surface-strong transition-colors
                                   focus-visible:outline-none focus-visible:ring-2
                                   focus-visible:ring-ios-brand-primary/50"
                          >
                            <div class="w-[42px] flex-shrink-0">
                              <ios-certificates-badge
                                [svgPath]="cert.badgeImage"
                                [code]="cert.code"
                                [fullName]="cert.title"
                              />
                            </div>
                            <div class="flex flex-col min-w-0 py-0.5">
                              <span class="font-heading font-semibold text-[15px] text-ios-fg-13">
                                {{ cert.code }}
                              </span>
                              <span class="text-[13px] text-ios-fg-8 leading-snug truncate">
                                {{ cert.title }}
                              </span>
                            </div>
                            <ios-icon
                              name="chevron-right"
                              class="w-5 h-5 flex-shrink-0 text-ios-fg-7 rtl:rotate-180 ms-auto"
                              aria-hidden="true"
                            />
                          </a>
                        }
                      </div>
                    </div>
                  }
                </div>

                <div class="border-t border-ios-border-light"></div>

                <a
                  routerLink="/certifications"
                  (click)="closeCert()"
                  class="inline-flex items-center gap-2
                         font-heading font-semibold text-[15px] text-ios-brand-primary
                         hover:underline focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-ios-brand-primary/50 rounded-lg"
                >
                  {{ lang.t('landing.nav.certMenu.verify') }}
                  <ios-icon
                    name="arrow-up-right"
                    class="w-4 h-4 rtl:rotate-180"
                    aria-hidden="true"
                  />
                </a>
              </div>
            }
          </div>
          <!-- About: a menu of links, not a destination of its own.
               Opens on hover (desktop mouse users); click still works for
               keyboard/touch users since mouseenter never fires for them. -->
          <div
            class="relative"
            (mouseenter)="onAboutMouseEnter()"
            (mouseleave)="onAboutMouseLeave()"
          >
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
          <!-- <ios-language-selector /> -->

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
          <!-- Certifications expands in place, same pattern as About below -->
          <button
            type="button"
            (click)="toggleCert($event)"
            [attr.aria-expanded]="certOpen()"
            aria-controls="cert-menu-mobile"
            class="w-full flex items-center justify-between text-start px-4 py-3 rounded-lg
                   font-heading font-semibold text-[15px]
                   text-ios-fg-10 hover:bg-ios-surface-strong transition-colors
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
          >
            {{ lang.t('landing.nav.certifications') }}
            <ios-icon
              name="chevron-down"
              class="w-4 h-4 transition-transform"
              [class.rotate-180]="certOpen()"
              aria-hidden="true"
            />
          </button>
          @if (certOpen()) {
            <div id="cert-menu-mobile" class="flex flex-col gap-3 ps-4">
              <a
                routerLink="/certifications"
                (click)="closeMobileMenu()"
                class="w-full text-start px-4 py-2 rounded-lg
                       font-heading font-semibold text-[14px] text-ios-brand-primary
                       hover:bg-ios-surface-strong transition-colors"
              >
                {{ lang.t('landing.nav.certMenu.seeAll') }}
              </a>
              @for (group of certGroups(); track group.track) {
                <div class="flex flex-col gap-1">
                  <p class="px-4 font-heading font-semibold text-[13px] text-ios-fg-mid">
                    {{ group.tabLabel }}
                  </p>
                  @for (cert of group.certs; track cert.id) {
                    <a
                      [routerLink]="cert.detailLink"
                      (click)="closeMobileMenu()"
                      class="w-full text-start px-4 py-2 rounded-lg
                             font-heading font-medium text-[14px]
                             text-ios-fg-8 hover:bg-ios-surface-strong transition-colors"
                    >
                      {{ cert.code }} — {{ cert.title }}
                    </a>
                  }
                </div>
              }

              <!-- Verify Certificate — the desktop mega-menu closes with this
                   entry, but the mobile sheet stopped after the certificate
                   groups, so it was unreachable on a phone (IDD-333). Same
                   destination and label as desktop so the two stay in step. -->
              <div class="border-t border-ios-border-light mx-4"></div>
              <a
                routerLink="/certifications"
                (click)="closeMobileMenu()"
                class="inline-flex items-center gap-2 w-full px-4 py-2 rounded-lg
                       font-heading font-semibold text-[14px] text-ios-brand-primary
                       hover:bg-ios-surface-strong transition-colors"
              >
                {{ lang.t('landing.nav.certMenu.verify') }}
                <ios-icon
                  name="arrow-up-right"
                  class="w-4 h-4 shrink-0 rtl:rotate-180"
                  aria-hidden="true"
                />
              </a>
            </div>
          }
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
  private readonly catalogStore = inject(PublicCatalogStore);
  protected readonly mobileOpen = signal(false);

  /** Generic placeholder used when the backend has no `badgeImageUrl` set. */
  private static readonly FALLBACK_BADGE_IMAGE = '/assets/icons/certificate_budge.svg';

  /**
   * Shared by the desktop popover and the mobile in-place expansion — the two
   * live in mutually exclusive DOM (`hidden lg:flex` vs `lg:hidden`), so one
   * signal cannot show both at once.
   */
  protected readonly aboutOpen = signal(false);

  /**
   * Same sharing rule as {@link aboutOpen} — one signal drives both the
   * desktop mega-menu and the mobile in-place expansion.
   */
  protected readonly certOpen = signal(false);

  /**
   * Pending close timers for the hover-driven desktop dropdowns. A short
   * delay (rather than closing immediately on `mouseleave`) absorbs the
   * gap between the trigger button and the absolutely-positioned panel
   * below it, so crossing that gap doesn't flicker the menu shut before
   * the pointer reaches the panel. Cleared whenever the pointer re-enters.
   */
  private certCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private aboutCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly HOVER_CLOSE_DELAY_MS = 150;

  constructor() {
    // The mega-menu renders nothing until the catalogue resolves, so there is
    // no lazier moment to ask for it. `load()` is idempotent and shared with
    // `CertLevelsSection`, which also calls it — the store dedupes the fetch.
    void this.catalogStore.load();
  }

  /**
   * Certifications mega-menu columns — one per recognised track that has at
   * least one published certificate, in product order (Scrum Master →
   * Product Owner → Scrum Facilitator). Sourced entirely from
   * `PublicCatalogStore`; a track with no certs yet is simply omitted.
   */
  protected readonly certGroups = computed<CertMenuGroup[]>(() => {
    const byTrack = new Map<string, CertMenuItem[]>();

    for (const cert of this.catalogStore.items()) {
      const known = normalizeTrack(cert.track);
      if (!known) continue; // unrecognised/untracked certs don't appear in the mega-menu
      const list = byTrack.get(known) ?? [];
      list.push({
        id: cert.id,
        code: cert.programCode,
        title: cert.title,
        badgeImage: cert.badgeImageUrl || LandingNavbar.FALLBACK_BADGE_IMAGE,
        detailLink: `/certifications/${cert.programCode.toLowerCase()}`,
        level: cert.level,
      });
      byTrack.set(known, list);
    }

    return TRACK_ORDER.filter((track) => byTrack.has(track)).map((track) => ({
      track,
      tabLabel: this.lang.t(`landing.levels.tracks.${track}.tabLabel`),
      certs: [...byTrack.get(track)!].sort(
        (a, b) => levelRank(a.level) - levelRank(b.level) || a.code.localeCompare(b.code),
      ),
    }));
  });

  /**
   * Stops propagation so the document-level dismiss handler doesn't close the
   * menu in the same click that opened it.
   */
  protected toggleCert(event: Event): void {
    event.stopPropagation();
    this.aboutOpen.set(false);
    this.certOpen.update((open) => !open);
  }

  protected closeCert(): void {
    if (this.certCloseTimer) {
      clearTimeout(this.certCloseTimer);
      this.certCloseTimer = null;
    }
    if (this.certOpen()) this.certOpen.set(false);
  }

  /** Opens the Certifications mega-menu on mouse hover (desktop). */
  protected onCertMouseEnter(): void {
    if (this.certCloseTimer) {
      clearTimeout(this.certCloseTimer);
      this.certCloseTimer = null;
    }
    this.aboutOpen.set(false);
    this.certOpen.set(true);
  }

  /** Closes the Certifications mega-menu shortly after the pointer leaves. */
  protected onCertMouseLeave(): void {
    this.certCloseTimer = setTimeout(() => {
      this.certOpen.set(false);
      this.certCloseTimer = null;
    }, LandingNavbar.HOVER_CLOSE_DELAY_MS);
  }

  /**
   * The "About" destinations. Routes are structural constants; labels resolve
   * through `lang.t()` so they stay locale-reactive.
   *
   * The old routes/pages (`about-scrum-master`, `about-product-owner`,
   * `about-scrum-facilitator`) still exist but are no longer surfaced here.
   */
  protected readonly aboutItems = [
    { path: '/about-institute', labelKey: 'landing.nav.aboutItems.institute' },
    { path: '/about-agile', labelKey: 'landing.nav.aboutItems.agile' },
    { path: '/about-scrum', labelKey: 'landing.nav.aboutItems.scrum' },
    { path: '/about-mock-exam', labelKey: 'landing.nav.aboutItems.mockExam' },
  ] as const;

  /**
   * Stops propagation so the document-level dismiss handler doesn't close the
   * menu in the same click that opened it.
   */
  protected toggleAbout(event: Event): void {
    event.stopPropagation();
    this.certOpen.set(false);
    this.aboutOpen.update((open) => !open);
  }

  protected closeAbout(): void {
    if (this.aboutCloseTimer) {
      clearTimeout(this.aboutCloseTimer);
      this.aboutCloseTimer = null;
    }
    if (this.aboutOpen()) this.aboutOpen.set(false);
  }

  /** Opens the About menu on mouse hover (desktop). */
  protected onAboutMouseEnter(): void {
    if (this.aboutCloseTimer) {
      clearTimeout(this.aboutCloseTimer);
      this.aboutCloseTimer = null;
    }
    this.certOpen.set(false);
    this.aboutOpen.set(true);
  }

  /** Closes the About menu shortly after the pointer leaves. */
  protected onAboutMouseLeave(): void {
    this.aboutCloseTimer = setTimeout(() => {
      this.aboutOpen.set(false);
      this.aboutCloseTimer = null;
    }, LandingNavbar.HOVER_CLOSE_DELAY_MS);
  }

  /** Navigating from the mobile sheet dismisses the sheet and any open submenu. */
  protected closeMobileMenu(): void {
    this.aboutOpen.set(false);
    this.certOpen.set(false);
    this.mobileOpen.set(false);
  }
}
