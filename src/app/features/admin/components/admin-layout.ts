import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { type AppRole, AuthStore } from '@core/auth';
import { LanguageService } from '@core/i18n';
import { Button, LanguageSelector } from '@ui';

/** Sidebar entry. New admin pages register their nav item here, one by one. */
interface AdminNavItem {
  readonly labelKey: string;
  readonly route: string;
  /** `true` for the index route so it isn't marked active on every child path. */
  readonly exact: boolean;
  /**
   * Roles that may see this item. Omit for "any admin". `super_admin` always
   * sees everything (backend SUPER_ADMIN bypass), regardless of this list.
   */
  readonly roles?: readonly AppRole[];
}

const ADMIN_NAV: readonly AdminNavItem[] = [
  { labelKey: 'admin.shell.nav.home', route: '/admin', exact: true },
  {
    labelKey: 'admin.shell.nav.catalog',
    route: '/admin/catalog',
    exact: false,
    roles: ['content_creator', 'learning_admin'],
  },
  {
    labelKey: 'admin.shell.nav.curriculum',
    route: '/admin/curriculum',
    exact: false,
    roles: ['content_creator', 'learning_admin'],
  },
  {
    labelKey: 'admin.shell.nav.users',
    route: '/admin/users',
    exact: false,
    roles: ['learning_admin', 'support_admin'],
  },
  {
    labelKey: 'admin.shell.nav.mock',
    route: '/admin/mock',
    exact: false,
    roles: ['content_creator', 'learning_admin'],
  },
  {
    labelKey: 'admin.shell.nav.examAuthoring',
    route: '/admin/exams',
    exact: false,
    roles: ['content_creator', 'learning_admin'],
  },
  {
    labelKey: 'admin.shell.nav.exam',
    route: '/admin/exam',
    exact: false,
    roles: ['learning_admin'],
  },
  {
    labelKey: 'admin.shell.nav.issuedCerts',
    route: '/admin/issued-certs',
    exact: false,
    roles: ['learning_admin'],
  },
  {
    labelKey: 'admin.shell.nav.staff',
    route: '/admin/staff',
    exact: false,
    roles: ['super_admin'],
  },
  {
    labelKey: 'admin.shell.nav.promo',
    route: '/admin/promo-codes',
    exact: false,
    roles: ['finance_admin', 'support_admin'],
  },
  {
    labelKey: 'admin.shell.nav.blog',
    route: '/admin/blog',
    exact: false,
    roles: ['content_creator', 'learning_admin'],
  },
  {
    labelKey: 'admin.shell.nav.audit',
    route: '/admin/audit-logs',
    exact: false,
    roles: ['super_admin'],
  },
];

/**
 * Admin shell — the authenticated admin-app layout: a sidebar for navigation, a
 * top bar showing the signed-in staff member + sign-out, and a `<router-outlet>`
 * for the admin pages that mount as children of `/admin`.
 *
 * Presentational: session state is read from `core/auth` via DI. Nav grows as
 * admin pages land (append to {@link ADMIN_NAV}).
 */
@Component({
  selector: 'ios-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Button, LanguageSelector],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex bg-gray-50 text-ios-brand-dark">
      <!-- Sidebar -->
      <aside
        class="hidden md:flex w-64 shrink-0 flex-col border-e border-gray-200 bg-white"
        aria-label="Admin navigation"
      >
        <div class="h-16 flex items-center px-6 border-b border-gray-200">
          <span class="font-heading font-bold text-lg tracking-wide">
            {{ lang.t('admin.shell.brand') }}
          </span>
        </div>
        <nav class="flex-1 p-3">
          <ul class="flex flex-col gap-1">
            @for (item of nav(); track item.route) {
              <li>
                <a
                  [routerLink]="item.route"
                  routerLinkActive="bg-ios-brand-amber-soft text-ios-brand-primary font-semibold"
                  [routerLinkActiveOptions]="{ exact: item.exact }"
                  class="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
                >
                  {{ lang.t(item.labelKey) }}
                </a>
              </li>
            }
          </ul>
        </nav>
      </aside>

      <!-- Main column -->
      <div class="flex-1 flex flex-col min-w-0">
        <header
          class="h-16 shrink-0 flex items-center justify-between gap-4 px-4 md:px-8 border-b border-gray-200 bg-white"
        >
          <span class="font-heading font-bold text-base md:hidden">
            {{ lang.t('admin.shell.brand') }}
          </span>
          <div class="flex items-center gap-4 ms-auto">
            <ios-language-selector />
            <div class="text-end leading-tight">
              <p class="text-sm font-semibold">{{ displayName() }}</p>
              <p class="text-xs text-gray-500">{{ roleLabel() }}</p>
            </div>
            <ios-button variant="secondary" size="sm" (clicked)="signOut()">
              {{ lang.t('admin.shell.signOut') }}
            </ios-button>
          </div>
        </header>

        <main class="flex-1 p-4 md:p-8">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AdminLayout {
  private readonly auth = inject(AuthStore);

  protected readonly lang = inject(LanguageService);

  /** Nav filtered to what the signed-in admin may access (super_admin sees all). */
  protected readonly nav = computed(() => {
    const isSuper = this.auth.hasRole('super_admin');
    return ADMIN_NAV.filter((item) => !item.roles || isSuper || this.auth.hasAnyRole(item.roles));
  });

  protected readonly displayName = computed(() => {
    const u = this.auth.user();
    return u ? u.fullName : '';
  });

  /** Prettify the first admin role (e.g. `learning_admin` → "Learning admin"). */
  protected readonly roleLabel = computed(() => {
    const role = this.auth.roles()[0];
    if (!role) return '';
    const spaced = role.replace(/_/g, ' ');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  });

  protected signOut(): void {
    void this.auth.logout({ redirectTo: '/admin/login' });
  }
}

export default AdminLayout;
