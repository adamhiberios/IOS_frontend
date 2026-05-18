import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideAward,
  LucideBell,
  LucideLayoutDashboard,
  LucideSettings,
  LucideUser,
} from '@lucide/angular';

import { AuthStore } from '@core/auth';
import { LanguageService } from '@core/i18n';
import { IosIcon, provideIcons } from '@ui';

import { UserMenuDropdown } from './user-menu-dropdown';

interface NavTab {
  readonly label: string;
  readonly icon: 'layout-dashboard' | 'award' | 'user' | 'settings';
  readonly route: string;
}

const _NAV_TABS: readonly NavTab[] = [
  { label: 'Overview', icon: 'layout-dashboard', route: '/dashboard' },
  { label: 'My certificates', icon: 'award', route: '/dashboard/certificates' },
  { label: 'Profile', icon: 'user', route: '/dashboard/profile' },
  { label: 'Settings', icon: 'settings', route: '/dashboard/settings' },
];

/**
 * `ios-dashboard-navbar` — top navigation bar for the student dashboard.
 *
 * Structure (full viewport width, content in max-w-[1400px] container):
 *
 *  ┌─ full-width white header ──────────────────────────────────────────┐
 *  │  [container]  [IOS Logo]              [Bell]  [User▾]             │
 *  ├─ full-width border-b ──────────────────────────────────────────── │
 *  │  [container, tabs span full width]                                 │
 *  │  │─ Overview ─│─ My certificates ─│─ Profile ─│─ Settings ─│     │
 *  │    active: 5px yellow border-b     inactive: 1px #f1f1f1 border-b │
 *  └────────────────────────────────────────────────────────────────────┘
 *
 * Exact Figma spec:
 *  · Each tab: flex-1, justify-center, gap-3, py-4, text-base font-semibold
 *  · Active:   border-b-[5px] border-[#d9bd4c] font-bold text-ios-fg-13
 *  · Inactive: border-b border-ios-surface-soft font-semibold text-ios-fg-13
 *  · Icons: 24 × 24 px
 */
@Component({
  selector: 'ios-dashboard-navbar',
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive, IosIcon, UserMenuDropdown],
  providers: [
    provideIcons(LucideLayoutDashboard, LucideBell, LucideUser, LucideSettings, LucideAward),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="bg-white w-full">
      <!-- ── Top strip: logo + icon actions ────────────────────────────── -->
      <div class="max-w-[1400px] mx-auto px-4 md:px-8 flex items-center justify-between h-16">
        <!-- Logo -->
        <a routerLink="/dashboard" [attr.aria-label]="lang.t('dashboard.nav.logoAriaLabel')">
          <img
            ngSrc="assets/icons/logo_institute_of_scrum.png"
            [attr.alt]="lang.t('dashboard.nav.dashboardLabel')"
            class="h-8 w-auto"
            width="120"
            height="32"
            loading="eager"
            decoding="async"
          />
        </a>

        <!-- Bell + User -->
        <div class="flex items-center gap-4">
          <!-- Notification bell -->
          <button
            type="button"
            class="flex items-center justify-center w-11 h-11 rounded-full bg-ios-surface-soft text-ios-fg hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
            [attr.aria-label]="lang.t('dashboard.nav.notificationsAriaLabel')"
          >
            <ios-icon name="bell" class="w-5 h-5" aria-hidden="true" />
          </button>

          <!-- User menu trigger -->
          <div class="relative">
            <button
              type="button"
              class="flex items-center justify-center w-11 h-11 rounded-full bg-ios-surface-soft text-ios-fg hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
              [attr.aria-expanded]="menuOpen()"
              aria-haspopup="true"
              [attr.aria-label]="lang.t('dashboard.menu.openUserMenu')"
              (click)="toggleMenu($event)"
            >
              <ios-icon name="user" class="w-5 h-5" aria-hidden="true" />
            </button>

            @if (menuOpen()) {
              <ios-user-menu-dropdown
                [displayName]="displayName()"
                [email]="userEmail()"
                [initials]="initials()"
                (closeMenu)="closeMenu()"
                (logout)="onLogout()"
              />
            }
          </div>
        </div>
      </div>

      <!-- ── Tab nav — tabs span full container width ───────────────────── -->
      <nav
        class="w-full border-b border-ios-surface-soft overflow-x-auto"
        [attr.aria-label]="lang.t('dashboard.nav.navigationAriaLabel')"
      >
        <div class="max-w-[1400px] mx-auto px-4 md:px-8 min-w-max">
          <ul class="flex items-stretch w-full" role="list">
            @for (tab of tabs(); track tab.route) {
              <li class="flex-1">
                <a
                  [routerLink]="tab.route"
                  [routerLinkActiveOptions]="{ exact: tab.route === '/dashboard' }"
                  routerLinkActive
                  #rla="routerLinkActive"
                  class="flex items-center justify-center gap-1 md:gap-3 w-full py-4 text-sm md:text-base text-ios-fg-13 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ios-brand-primary/50 whitespace-nowrap"
                  [class.font-bold]="rla.isActive"
                  [class.font-semibold]="!rla.isActive"
                  [class.border-b-[5px]]="rla.isActive"
                  [class.border-ios-brand-gold]="rla.isActive"
                  [class.-mb-px]="rla.isActive"
                  [attr.aria-current]="rla.isActive ? 'page' : null"
                >
                  <ios-icon
                    [name]="tab.icon"
                    class="w-5 h-5 md:w-6 md:h-6 shrink-0"
                    aria-hidden="true"
                  />
                  {{ tab.label }}
                </a>
              </li>
            }
          </ul>
        </div>
      </nav>
    </header>
  `,
})
export class DashboardNavbar {
  private readonly auth = inject(AuthStore);
  private readonly elRef = inject(ElementRef);
  protected readonly lang = inject(LanguageService);

  protected readonly tabs = computed<readonly NavTab[]>(() => [
    { label: this.lang.t('dashboard.nav.overview'), icon: 'layout-dashboard', route: '/dashboard' },
    {
      label: this.lang.t('dashboard.nav.myCertificates'),
      icon: 'award',
      route: '/dashboard/certificates',
    },
    { label: this.lang.t('dashboard.nav.profile'), icon: 'user', route: '/dashboard/profile' },
    {
      label: this.lang.t('dashboard.nav.settings'),
      icon: 'settings',
      route: '/dashboard/settings',
    },
  ]);
  protected readonly menuOpen = signal(false);

  protected readonly displayName = computed(() => {
    const u = this.auth.user();
    return u ? `${u.firstName} ${u.lastName}` : 'User';
  });

  protected readonly userEmail = computed(() => this.auth.user()?.email ?? '');

  protected readonly initials = computed(() => {
    const u = this.auth.user();
    if (!u) return 'U';
    return `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase();
  });

  protected toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.menuOpen.update((v) => !v);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected onLogout(): void {
    this.menuOpen.set(false);
    void this.auth.logout({ reason: 'user-initiated' });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as Node | null;
    const el = this.elRef.nativeElement as HTMLElement;
    if (target && !el.contains(target)) {
      this.menuOpen.set(false);
    }
  }
}
