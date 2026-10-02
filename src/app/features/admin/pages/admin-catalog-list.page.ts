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
import { formatFee } from '@shared';
import { Button, Input as IosInput, DialogFooter, DialogEscape } from '@ui';

import { type ActiveFilter, type AdminCertificate } from '../data-access/catalog.model';
import { AdminCatalogStore } from '../data-access/catalog.store';

interface FilterOption {
  readonly key: 'all' | 'active' | 'inactive';
  readonly value: ActiveFilter;
  readonly labelKey: string;
}

/** Row action awaiting confirmation: deactivate an active row, delete an inactive one. */
type CatalogActionKind = 'deactivate' | 'delete';

interface PendingCatalogAction {
  readonly cert: AdminCertificate;
  readonly kind: CatalogActionKind;
}

/** Active first — it is also the default (see `AdminCatalogStore`). */
const FILTERS: readonly FilterOption[] = [
  { key: 'active', value: true, labelKey: 'admin.catalog.filterActive' },
  { key: 'inactive', value: false, labelKey: 'admin.catalog.filterInactive' },
  { key: 'all', value: undefined, labelKey: 'admin.catalog.filterAll' },
];

/**
 * Admin catalog — certificates list (`GET /admin/catalog`, includes inactive).
 *
 * Listing with free-text search, active-state filter and cursor "load more"
 * pagination, plus New / Edit links and role-gated Deactivate (active rows) and
 * permanent Delete (inactive rows, IDD-348) actions behind a confirm dialog. All server state + actions live in {@link AdminCatalogStore}; this
 * component only binds signals. Row actions are hidden for roles the backend
 * would reject (frontend RBAC hides UI; the backend still enforces).
 */
@Component({
  selector: 'ios-admin-catalog-list-page',
  imports: [
    DialogEscape,
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    IosInput,
    Button,
    DialogFooter,
  ],
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
                  <td class="px-4 py-3 text-gray-600">{{ fee(c.price, c.currency) }}</td>
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
                          class="text-sm text-ios-brand-primary underline hover:text-ios-brand-primary-hover"
                        >
                          {{ lang.t('admin.catalog.edit') }}
                        </a>
                        @if (canDeactivate()) {
                          <button
                            type="button"
                            (click)="askAction(c, c.active ? 'deactivate' : 'delete')"
                            class="text-sm text-red-600 hover:text-red-700"
                          >
                            {{
                              lang.t(c.active ? 'admin.catalog.deactivate' : 'admin.catalog.delete')
                            }}
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

      <!-- Deactivate / delete confirmation -->
      @if (pendingAction(); as pending) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deactivate-title"
          (iosDialogEscape)="cancelAction()"
        >
          <div
            class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <h2 id="deactivate-title" class="text-lg font-semibold text-ios-brand-dark">
              {{
                lang.t(
                  pending.kind === 'delete'
                    ? 'admin.catalog.confirmDeleteTitle'
                    : 'admin.catalog.confirmTitle'
                )
              }}
            </h2>
            <p class="mt-2 text-sm text-gray-600">
              {{
                lang.t(
                  pending.kind === 'delete'
                    ? 'admin.catalog.confirmDeleteBody'
                    : 'admin.catalog.confirmBody'
                )
              }}
              <span class="font-medium text-ios-brand-dark">{{ pending.cert.title }}</span>
            </p>

            @if (store.actionError()) {
              <p class="mt-3 text-sm text-red-600" role="alert">{{ store.actionError() }}</p>
            }

            <ios-dialog-footer>
              <button
                type="button"
                (click)="cancelAction()"
                class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {{ lang.t('admin.catalog.confirmCancel') }}
              </button>
              <ios-button
                variant="danger"
                [loading]="store.actionPendingId() === pending.cert.id"
                (clicked)="confirmAction()"
              >
                {{
                  lang.t(
                    pending.kind === 'delete'
                      ? 'admin.catalog.confirmDeleteConfirm'
                      : 'admin.catalog.confirmConfirm'
                  )
                }}
              </ios-button>
            </ios-dialog-footer>
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

  /** Price cell — same `$130 USD` format as the public site (IDD-356). */
  protected fee(price: string, currency: string): string {
    const amount = Number(price);
    return Number.isFinite(amount)
      ? formatFee(amount, currency, this.lang.locale())
      : `${currency} ${price}`;
  }
  protected readonly filters = FILTERS;

  /** Create/edit gate — backend allows content_creator + learning_admin. */
  protected readonly canManage = computed(
    () =>
      this.auth.hasRole('super_admin') ||
      this.auth.hasAnyRole(['content_creator', 'learning_admin']),
  );
  /** Deactivate / delete gate — backend restricts both DELETEs to learning_admin. */
  protected readonly canDeactivate = computed(
    () => this.auth.hasRole('super_admin') || this.auth.hasRole('learning_admin'),
  );

  /** The certificate + action awaiting confirmation, or `null`. */
  protected readonly pendingAction = signal<PendingCatalogAction | null>(null);

  protected readonly form = this.fb.group({
    search: this.fb.control(''),
  });

  ngOnInit(): void {
    this.form.controls.search.setValue(this.store.search());
    void this.store.load();
  }

  protected askAction(cert: AdminCertificate, kind: CatalogActionKind): void {
    this.store.clearActionError();
    this.pendingAction.set({ cert, kind });
  }

  protected cancelAction(): void {
    this.store.clearActionError();
    this.pendingAction.set(null);
  }

  protected async confirmAction(): Promise<void> {
    const pending = this.pendingAction();
    if (!pending) return;
    const ok =
      pending.kind === 'delete'
        ? await this.store.permanentDelete(pending.cert.id)
        : await this.store.deactivate(pending.cert.id);
    if (ok) this.pendingAction.set(null);
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
