import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, type OnInit, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { LanguageService } from '@core/i18n';
import { Button, Input as IosInput } from '@ui';

import { AdminUsersStore } from '../data-access/users.store';

/**
 * Admin users — students list (`GET /admin/users`).
 *
 * Search + cursor "load more" over the student base; each row links to the
 * detail view. All server state lives in {@link AdminUsersStore}; the component
 * only binds signals. Available to `learning_admin` / `support_admin`
 * (backend-enforced).
 */
@Component({
  selector: 'ios-admin-users-list-page',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, IosInput, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="max-w-5xl">
      <header class="mb-6">
        <h1 class="text-2xl font-bold text-ios-brand-dark">
          {{ lang.t('admin.users.title') }}
        </h1>
        <p class="text-sm text-gray-500 mt-1">
          {{ lang.t('admin.users.subtitle') }}
        </p>
      </header>

      <form [formGroup]="form" (ngSubmit)="onSearch()" class="flex items-end gap-2 mb-4 max-w-xl">
        <div class="grow">
          <ios-input
            id="users-search"
            [label]="lang.t('admin.users.searchLabel')"
            type="text"
            [control]="form.controls.search"
            [placeholder]="lang.t('admin.users.searchPlaceholder')"
          />
        </div>
        <ios-button type="submit" variant="secondary">
          {{ lang.t('admin.users.searchButton') }}
        </ios-button>
      </form>

      @if (store.error() && store.items().length === 0) {
        <div class="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p class="text-sm text-red-700">{{ store.error() }}</p>
          <ios-button class="mt-3 inline-block" variant="secondary" (clicked)="retry()">
            {{ lang.t('admin.users.retry') }}
          </ios-button>
        </div>
      } @else if (store.loading() && store.items().length === 0) {
        <p class="text-sm text-gray-500 py-10 text-center" role="status" aria-live="polite">
          {{ lang.t('admin.users.loading') }}
        </p>
      } @else if (store.isEmpty()) {
        <div class="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p class="text-sm text-gray-500">{{ lang.t('admin.users.empty') }}</p>
        </div>
      } @else {
        <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.users.colName') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.users.colEmail') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.users.colVerified') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.users.colJoined') }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (u of store.items(); track u.id) {
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3">
                    <a
                      [routerLink]="['/admin/users', u.id]"
                      class="font-medium text-ios-brand-primary underline"
                    >
                      {{ u.fullName }}
                    </a>
                  </td>
                  <td class="px-4 py-3 text-gray-600">{{ u.email }}</td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                      [class.bg-green-50]="u.emailVerified"
                      [class.text-green-700]="u.emailVerified"
                      [class.bg-amber-50]="!u.emailVerified"
                      [class.text-amber-700]="!u.emailVerified"
                    >
                      {{
                        u.emailVerified
                          ? lang.t('admin.users.verifiedYes')
                          : lang.t('admin.users.verifiedNo')
                      }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-gray-500">{{ u.createdAt | date: 'mediumDate' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (store.error() && store.items().length > 0) {
          <p class="text-sm text-red-600 mt-3 text-center" role="alert">{{ store.error() }}</p>
        }

        @if (store.hasMore()) {
          <div class="mt-4 text-center">
            <ios-button variant="secondary" [loading]="store.loadingMore()" (clicked)="loadMore()">
              {{ lang.t('admin.users.loadMore') }}
            </ios-button>
          </div>
        }
      }
    </section>
  `,
})
export class AdminUsersListPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly store = inject(AdminUsersStore);
  protected readonly lang = inject(LanguageService);

  protected readonly form = this.fb.group({
    search: this.fb.control(''),
  });

  ngOnInit(): void {
    this.form.controls.search.setValue(this.store.search());
    void this.store.load();
  }

  protected onSearch(): void {
    void this.store.setSearch(this.form.controls.search.value);
  }

  protected loadMore(): void {
    void this.store.loadMore();
  }

  protected retry(): void {
    void this.store.load();
  }
}

export default AdminUsersListPage;
