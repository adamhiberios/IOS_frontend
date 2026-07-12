import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthStore } from '@core/auth';
import { LanguageService } from '@core/i18n';
import { Button, Input as IosInput } from '@ui';

import { type ActiveFilter, type AdminCertificate } from '../data-access/catalog.model';
import { AdminCatalogStore } from '../data-access/catalog.store';

interface FilterOption {
  readonly key: 'all' | 'active' | 'inactive';
  readonly value: ActiveFilter;
  readonly labelKey: string;
}

const FILTERS: readonly FilterOption[] = [
  { key: 'all', value: undefined, labelKey: 'admin.catalog.filterAll' },
  { key: 'active', value: true, labelKey: 'admin.catalog.filterActive' },
  { key: 'inactive', value: false, labelKey: 'admin.catalog.filterInactive' },
];

/**
 * Admin catalog — certificates list (`GET /admin/catalog`, includes inactive).
 *
 * Listing with free-text search, active-state filter and cursor "load more"
 * pagination, plus New / Edit links and a role-gated Deactivate action (confirm
 * dialog). All server state + actions live in {@link AdminCatalogStore}; this
 * component only binds signals. Row actions are hidden for roles the backend
 * would reject (frontend RBAC hides UI; the backend still enforces).
 */
@Component({
  selector: 'ios-admin-catalog-list-page',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, IosInput, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <header class="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-ios-brand-dark">
            {{ lang.t('admin.catalog.title') }}
          </h1>
          <p class="text-sm text-gray-500 mt-1">
            {{ lang.t('admin.catalog.subtitle') }}
          </p>
        </div>
        @if (canManage()) {
          <a
            routerLink="/admin/catalog/new"
            class="shrink-0 inline-flex items-center rounded-lg bg-ios-brand-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {{ lang.t('admin.catalog.new') }}
          </a>
        }
      </header>

      <!-- Toolbar: search + active filter -->
      <div class="flex flex-col md:flex-row md:items-end gap-4 mb-4">
        <form [formGroup]="form" (ngSubmit)="onSearch()" class="flex items-end gap-2 grow">
          <div class="grow">
            <ios-input
              id="catalog-search"
              [label]="lang.t('admin.catalog.searchLabel')"
              type="text"
              [control]="form.controls.search"
              [placeholder]="lang.t('admin.catalog.searchPlaceholder')"
            />
          </div>
          <ios-button type="submit" variant="secondary">
            {{ lang.t('admin.catalog.searchButton') }}
          </ios-button>
        </form>

        <div
          class="flex gap-1 rounded-lg border border-gray-200 p-1"
          role="group"
          [attr.aria-label]="lang.t('admin.catalog.filterLabel')"
        >
          @for (f of filters; track f.key) {
            <button
              type="button"
              (click)="onFilter(f.value)"
              [class.bg-ios-brand-amber-soft]="store.activeFilter() === f.value"
              [class.font-semibold]="store.activeFilter() === f.value"
              [attr.aria-pressed]="store.activeFilter() === f.value"
              class="px-3 py-1.5 rounded-md text-sm text-gray-700 hover:bg-gray-100"
            >
              {{ lang.t(f.labelKey) }}
            </button>
          }
        </div>
      </div>

      <!-- Error (no rows yet) -->
      @if (store.error() && store.items().length === 0) {
        <div class="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p class="text-sm text-red-700">{{ store.error() }}</p>
          <ios-button class="mt-3 inline-block" variant="secondary" (clicked)="retry()">
            {{ lang.t('admin.catalog.retry') }}
          </ios-button>
        </div>
      } @else if (store.loading() && store.items().length === 0) {
        <!-- Initial loading -->
        <p class="text-sm text-gray-500 py-10 text-center" role="status" aria-live="polite">
          {{ lang.t('admin.catalog.loading') }}
        </p>
      } @else if (store.isEmpty()) {
        <!-- Empty -->
        <div class="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p class="text-sm text-gray-500">{{ lang.t('admin.catalog.empty') }}</p>
        </div>
      } @else {
        <!-- Table -->
        <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.catalog.colTitle') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.catalog.colCode') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.catalog.colPrice') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.catalog.colStatus') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.catalog.colUpdated') }}
                </th>
                @if (canManage()) {
                  <th scope="col" class="text-end font-medium px-4 py-3">
                    {{ lang.t('admin.catalog.colActions') }}
                  </th>
                }
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (c of store.items(); track c.id) {
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 font-medium text-ios-brand-dark">{{ c.title }}</td>
                  <td class="px-4 py-3 text-gray-600">{{ c.programCode }}</td>
                  <td class="px-4 py-3 text-gray-600">{{ c.currency }} {{ c.price }}</td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                      [class.bg-green-50]="c.active"
                      [class.text-green-700]="c.active"
                      [class.bg-gray-100]="!c.active"
                      [class.text-gray-500]="!c.active"
                    >
                      {{
                        c.active
                          ? lang.t('admin.catalog.statusActive')
                          : lang.t('admin.catalog.statusInactive')
                      }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-gray-500">{{ c.updatedAt | date: 'mediumDate' }}</td>
                  @if (canManage()) {
                    <td class="px-4 py-3">
                      <div class="flex items-center justify-end gap-3">
                        <a
                          [routerLink]="['/admin/catalog', c.id, 'edit']"
                          class="text-sm text-ios-brand-primary underline"
                        >
                          {{ lang.t('admin.catalog.edit') }}
                        </a>
                        @if (canDeactivate() && c.active) {
                          <button
                            type="button"
                            (click)="askDeactivate(c)"
                            class="text-sm text-red-600 hover:text-red-700"
                          >
                            {{ lang.t('admin.catalog.deactivate') }}
                          </button>
                        }
                      </div>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Inline error when a "load more" fails but rows are already shown -->
        @if (store.error() && store.items().length > 0) {
          <p class="text-sm text-red-600 mt-3 text-center" role="alert">{{ store.error() }}</p>
        }

        @if (store.hasMore()) {
          <div class="mt-4 text-center">
            <ios-button variant="secondary" [loading]="store.loadingMore()" (clicked)="loadMore()">
              {{ lang.t('admin.catalog.loadMore') }}
            </ios-button>
          </div>
        }
      }

      <!-- Deactivate confirmation -->
      @if (pendingDeactivate(); as pending) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deactivate-title"
        >
          <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="deactivate-title" class="text-lg font-semibold text-ios-brand-dark">
              {{ lang.t('admin.catalog.confirmTitle') }}
            </h2>
            <p class="mt-2 text-sm text-gray-600">
              {{ lang.t('admin.catalog.confirmBody') }}
              <span class="font-medium text-ios-brand-dark">{{ pending.title }}</span>
            </p>

            @if (store.actionError()) {
              <p class="mt-3 text-sm text-red-600" role="alert">{{ store.actionError() }}</p>
            }

            <div class="mt-5 flex justify-end gap-3">
              <button
                type="button"
                (click)="cancelDeactivate()"
                class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {{ lang.t('admin.catalog.confirmCancel') }}
              </button>
              <ios-button
                variant="danger"
                [loading]="store.actionPendingId() === pending.id"
                (clicked)="confirmDeactivate()"
              >
                {{ lang.t('admin.catalog.confirmConfirm') }}
              </ios-button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminCatalogListPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthStore);

  protected readonly store = inject(AdminCatalogStore);
  protected readonly lang = inject(LanguageService);
  protected readonly filters = FILTERS;

  /** Create/edit gate — backend allows content_creator + learning_admin. */
  protected readonly canManage = computed(
    () =>
      this.auth.hasRole('super_admin') ||
      this.auth.hasAnyRole(['content_creator', 'learning_admin']),
  );
  /** Deactivate gate — backend restricts DELETE to learning_admin. */
  protected readonly canDeactivate = computed(
    () => this.auth.hasRole('super_admin') || this.auth.hasRole('learning_admin'),
  );

  /** The certificate awaiting deactivate confirmation, or `null`. */
  protected readonly pendingDeactivate = signal<AdminCertificate | null>(null);

  protected readonly form = this.fb.group({
    search: this.fb.control(''),
  });

  ngOnInit(): void {
    this.form.controls.search.setValue(this.store.search());
    void this.store.load();
  }

  protected askDeactivate(cert: AdminCertificate): void {
    this.store.clearActionError();
    this.pendingDeactivate.set(cert);
  }

  protected cancelDeactivate(): void {
    this.store.clearActionError();
    this.pendingDeactivate.set(null);
  }

  protected async confirmDeactivate(): Promise<void> {
    const pending = this.pendingDeactivate();
    if (!pending) return;
    const ok = await this.store.deactivate(pending.id);
    if (ok) this.pendingDeactivate.set(null);
  }

  protected onSearch(): void {
    void this.store.setSearch(this.form.controls.search.value);
  }

  protected onFilter(value: ActiveFilter): void {
    void this.store.setActiveFilter(value);
  }

  protected loadMore(): void {
    void this.store.loadMore();
  }

  protected retry(): void {
    void this.store.load();
  }
}

export default AdminCatalogListPage;
