import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideChevronRight } from '@lucide/angular';

import { IosIcon, provideIcons } from '@ui';

interface MenuItem {
  readonly label: string;
  readonly route: string;
}

const MENU_ITEMS: readonly MenuItem[] = [
  { label: 'Dashboard', route: '/dashboard' },
  { label: 'Certificates', route: '/dashboard/certificates' },
  { label: 'Log', route: '/dashboard/log' },
  { label: 'Profile', route: '/dashboard/profile' },
  { label: 'Settings', route: '/dashboard/settings' },
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
      class="absolute end-0 top-[calc(100%+8px)] z-50 w-[280px] bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden"
      role="menu"
      aria-label="User menu"
    >
      <!-- Avatar + name + email -->
      <div class="flex flex-col items-center gap-2 py-6 px-4">
        <!-- Initials avatar -->
        <div
          class="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-xl font-semibold text-gray-600 select-none"
          aria-hidden="true"
        >
          {{ initials() }}
        </div>
        <p class="font-bold text-ios-brand-dark text-base leading-tight">{{ displayName() }}</p>
        <p class="text-sm text-gray-400 leading-tight">{{ email() }}</p>
      </div>

      <!-- Divider -->
      <div class="h-px bg-gray-100 mx-4"></div>

      <!-- Menu items -->
      <ul class="py-2" role="none">
        @for (item of menuItems; track item.route) {
          <li role="none">
            <a
              [routerLink]="item.route"
              role="menuitem"
              class="flex items-center justify-between px-5 py-3 text-sm text-ios-brand-dark hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ios-brand-primary/50"
              (click)="closeMenu.emit()"
            >
              <span>{{ item.label }}</span>
              <ios-icon name="chevron-right" class="w-4 h-4 text-gray-400" aria-hidden="true" />
            </a>
          </li>
        }
      </ul>

      <!-- Divider -->
      <div class="h-px bg-gray-100 mx-4"></div>

      <!-- Logout -->
      <div class="p-3">
        <button
          type="button"
          role="menuitem"
          class="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-ios-brand-primary-soft text-ios-brand-primary font-medium text-sm hover:bg-ios-brand-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
          (click)="logout.emit()"
        >
          <span>Logout</span>
          <ios-icon name="chevron-right" class="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  `,
})
export class UserMenuDropdown {
  readonly displayName = input.required<string>();
  readonly email = input.required<string>();
  readonly initials = input.required<string>();

  readonly closeMenu = output<void>();
  readonly logout = output<void>();

  protected readonly menuItems = MENU_ITEMS;
}
