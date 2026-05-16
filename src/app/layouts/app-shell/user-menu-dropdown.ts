import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideChevronRight } from '@lucide/angular';

import { LanguageService, type AppLocale } from '@core/i18n';
import { IosIcon, provideIcons } from '@ui';

interface MenuItem {
  readonly labelKey: string;
  readonly route: string;
}

const MENU_ITEMS: readonly MenuItem[] = [
  { labelKey: 'dashboard.menu.dashboard', route: '/dashboard' },
  { labelKey: 'dashboard.menu.certificates', route: '/dashboard/certificates' },
  { labelKey: 'dashboard.menu.log', route: '/dashboard/log' },
  { labelKey: 'dashboard.menu.profile', route: '/dashboard/profile' },
  { labelKey: 'dashboard.menu.settings', route: '/dashboard/settings' },
];

/**
 * `ios-user-menu-dropdown` — profile card that slides from the user icon.
 *
 * ┌────────────────────────────┐
 * │       [AA]  avatar         │
 * │   Adam Adam                │
 * │   adam@example.com         │
 * ├────────────────────────────┤
 * │ Dashboard               >  │
 * │ Certificates            >  │
 * │ Log                     >  │
 * │ Profile                 >  │
 * │ Settings                >  │
 * ├────────────────────────────┤
 * │ Language  [EN] [AR] [FR]   │
 * ├────────────────────────────┤
 * │  Logout                 >  │  (red, light red bg)
 * └────────────────────────────┘
 *
 * Positioned absolutely via the parent; parent listens for `closeMenu` output.
 */
@Component({
  selector: 'ios-user-menu-dropdown',
  imports: [RouterLink, IosIcon],
  providers: [provideIcons(LucideChevronRight)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="absolute end-0 top-[calc(100%+8px)] z-50 w-[280px] bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-ios-surface-soft overflow-hidden"
      role="menu"
      [attr.aria-label]="lang.t('dashboard.menu.userMenuLabel')"
    >
      <!-- Avatar + name + email -->
      <div class="flex flex-col items-center gap-2 py-6 px-4">
        <!-- Initials avatar -->
        <div
          class="w-16 h-16 rounded-full bg-ios-surface-soft flex items-center justify-center text-xl font-semibold text-ios-fg-8 select-none"
          aria-hidden="true"
        >
          {{ initials() }}
        </div>
        <p class="font-bold text-ios-brand-dark text-base leading-tight">{{ displayName() }}</p>
        <p class="text-sm text-ios-fg-7 leading-tight">{{ email() }}</p>
      </div>

      <!-- Divider -->
      <div class="h-px bg-ios-surface-soft mx-4"></div>

      <!-- Menu items -->
      <ul class="py-2" role="none">
        @for (item of menuItems; track item.route) {
          <li role="none">
            <a
              [routerLink]="item.route"
              role="menuitem"
              class="flex items-center justify-between px-5 py-3 text-sm text-ios-brand-dark hover:bg-ios-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ios-brand-primary/50"
              (click)="closeMenu.emit()"
            >
              <span>{{ lang.t(item.labelKey) }}</span>
              <ios-icon name="chevron-right" class="w-4 h-4 text-ios-fg-7" aria-hidden="true" />
            </a>
          </li>
        }
      </ul>

      <!-- Divider -->
      <div class="h-px bg-ios-surface-soft mx-4"></div>

      <!-- Language switcher -->
      <div class="px-5 py-3" role="group" [attr.aria-label]="lang.t('common.selectLanguage')">
        <p class="text-xs font-medium text-ios-fg-7 mb-2">{{ lang.t('common.selectLanguage') }}</p>
        <div class="flex items-center gap-2">
          @for (option of lang.supportedLocales; track option.code) {
            <button
              type="button"
              role="menuitem"
              [attr.aria-pressed]="option.code === locale()"
              (click)="setLocale(option.code)"
              class="flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
              [class.bg-ios-brand-primary]="option.code === locale()"
              [class.text-white]="option.code === locale()"
              [class.bg-ios-surface-soft]="option.code !== locale()"
              [class.text-ios-fg-8]="option.code !== locale()"
            >
              {{ option.label }}
            </button>
          }
        </div>
      </div>

      <!-- Divider -->
      <div class="h-px bg-ios-surface-soft mx-4"></div>

      <!-- Logout -->
      <div class="p-3">
        <button
          type="button"
          role="menuitem"
          class="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-ios-brand-primary-soft text-ios-brand-primary font-medium text-sm hover:bg-ios-brand-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
          (click)="logout.emit()"
        >
          <span>{{ lang.t('dashboard.menu.logout') }}</span>
          <ios-icon name="chevron-right" class="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  `,
})
export class UserMenuDropdown {
  protected readonly lang = inject(LanguageService);
  readonly displayName = input.required<string>();
  readonly email = input.required<string>();
  readonly initials = input.required<string>();

  readonly closeMenu = output<void>();
  readonly logout = output<void>();

  protected readonly menuItems = MENU_ITEMS;
  protected readonly locale = this.lang.locale;

  protected setLocale(code: AppLocale): void {
    void this.lang.setLocale(code);
  }
}
