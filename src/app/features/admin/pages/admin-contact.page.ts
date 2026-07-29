import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';

import { AuthStore } from '@core/auth';
import { LanguageService } from '@core/i18n';
import { Button, Select, type SelectOption } from '@ui';

import {
  CONTACT_STATUSES,
  type ContactItem,
  type ContactStatus,
  isContactStatus,
  nextStatusesFor,
} from '../data-access/contact.model';
import { AdminContactStore } from '../data-access/contact.store';

/**
 * Admin contact inbox (`/admin/contact`, CMS-ADMIN / plan Slice 10, backend
 * `2976be0`). Triage submissions from the public CMS `contact_form` section.
 *
 * Statuses are `new → read → archived`, plus `spam` as a side branch that keeps
 * the row for abuse review instead of deleting it.
 *
 * **Delete is a hard, irreversible GDPR erasure** — `learning_admin` only, and
 * behind a confirmation that names it as such rather than the usual "are you
 * sure?". Every other admin list in this app soft-deletes; this one does not,
 * and the UI has to make that difference obvious.
 *
 * RBAC: list / read / status → support_admin, learning_admin; delete →
 * learning_admin. super_admin does everything. The backend re-authorizes.
 */
@Component({
  selector: 'ios-admin-contact-page',
  imports: [ReactiveFormsModule, Select, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <header class="mb-6">
        <h1 class="text-2xl font-bold text-ios-brand-dark">{{ lang.t('admin.contact.title') }}</h1>
        <p class="mt-1 text-sm text-gray-500">{{ lang.t('admin.contact.subtitle') }}</p>
      </header>

      <div class="mb-6 max-w-xs">
        <ios-select
          id="contact-status-filter"
          [label]="lang.t('admin.contact.filterStatus')"
          [options]="statusFilterOptions()"
          [control]="statusControl"
          (selected)="applyFilters()"
        />
      </div>

      @if (store.error()) {
        <div class="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p class="text-sm text-red-700">{{ store.error() }}</p>
          <ios-button class="mt-3 inline-block" variant="secondary" (clicked)="retry()">
            {{ lang.t('admin.contact.retry') }}
          </ios-button>
        </div>
      } @else if (store.loading()) {
        <p class="py-10 text-center text-sm text-gray-500" role="status" aria-live="polite">
          {{ lang.t('admin.contact.loading') }}
        </p>
      } @else if (store.isEmpty()) {
        <div class="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p class="text-sm text-gray-500">{{ lang.t('admin.contact.empty') }}</p>
        </div>
      } @else {
        <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th scope="col" class="px-4 py-3 text-start font-medium">
                  {{ lang.t('admin.contact.colFrom') }}
                </th>
                <th scope="col" class="px-4 py-3 text-start font-medium">
                  {{ lang.t('admin.contact.colSubject') }}
                </th>
                <th scope="col" class="px-4 py-3 text-start font-medium">
                  {{ lang.t('admin.contact.colStatus') }}
                </th>
                <th scope="col" class="px-4 py-3 text-start font-medium">
                  {{ lang.t('admin.contact.colReceived') }}
                </th>
                <th scope="col" class="px-4 py-3 text-end font-medium">
                  {{ lang.t('admin.contact.colActions') }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (c of store.items(); track c.id) {
                <tr
                  class="align-top hover:bg-gray-50"
                  [class.opacity-60]="c.status === 'archived' || c.status === 'spam'"
                >
                  <td class="px-4 py-3">
                    <p class="font-medium text-ios-brand-dark" dir="auto">
                      @if (c.status === 'new') {
                        <span
                          class="me-2 inline-block h-2 w-2 rounded-full bg-ios-brand-primary align-middle"
                          [attr.aria-label]="lang.t('admin.contact.status.new')"
                        ></span>
                      }
                      {{ c.name }}
                    </p>
                    <p class="mt-0.5 text-xs text-gray-500" dir="ltr">{{ c.email }}</p>
                  </td>
                  <td class="px-4 py-3">
                    <p class="text-gray-700" dir="auto">{{ c.subject || '—' }}</p>
                    @if (c.pageSlug) {
                      <p class="mt-0.5 font-mono text-xs text-gray-400" dir="ltr">
                        /{{ c.pageSlug }}
                      </p>
                    }
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                      [class.bg-blue-50]="c.status === 'new'"
                      [class.text-blue-700]="c.status === 'new'"
                      [class.bg-gray-100]="c.status === 'read'"
                      [class.text-gray-600]="c.status === 'read'"
                      [class.bg-amber-50]="c.status === 'archived'"
                      [class.text-amber-700]="c.status === 'archived'"
                      [class.bg-red-50]="c.status === 'spam'"
                      [class.text-red-700]="c.status === 'spam'"
                    >
                      {{ statusLabel(c.status) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-gray-500">{{ formatDate(c.createdAt) }}</td>
                  <td class="px-4 py-3">
                    <div class="flex flex-wrap items-center justify-end gap-3">
                      <button
                        type="button"
                        [disabled]="busy()"
                        (click)="openDetail(c)"
                        class="text-sm text-ios-brand-primary underline disabled:opacity-50"
                      >
                        {{ lang.t('admin.contact.view') }}
                      </button>
                      @for (next of transitionsFor(c.status); track next) {
                        <button
                          type="button"
                          [disabled]="busy()"
                          (click)="setStatus(c, next)"
                          class="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                        >
                          {{ lang.t('admin.contact.markAs.' + next) }}
                        </button>
                      }
                      @if (canDelete()) {
                        <button
                          type="button"
                          [disabled]="busy()"
                          (click)="askDelete(c)"
                          class="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          {{ lang.t('admin.contact.delete') }}
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (store.actionError() && !detailOpen() && !pendingDelete()) {
          <p class="mt-3 text-center text-sm text-red-600" role="alert">
            {{ store.actionError() }}
          </p>
        }

        @if (store.hasMore()) {
          <div class="mt-4 text-center">
            <ios-button variant="secondary" [loading]="store.loadingMore()" (clicked)="loadMore()">
              {{ lang.t('admin.contact.loadMore') }}
            </ios-button>
          </div>
        }
      }

      <!-- Detail -->
      @if (detailOpen()) {
        <div
          class="fixed inset-0 z-50 overflow-y-auto bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-detail-title"
        >
          <div class="flex min-h-full items-start justify-center p-4">
            <div class="my-8 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
              @if (store.detailLoading()) {
                <p class="py-10 text-center text-sm text-gray-500" role="status" aria-live="polite">
                  {{ lang.t('admin.contact.loading') }}
                </p>
              } @else if (store.detailError()) {
                <p class="py-10 text-center text-sm text-red-600" role="alert">
                  {{ store.detailError() }}
                </p>
              } @else if (store.detail(); as d) {
                <h2 id="contact-detail-title" class="text-lg font-semibold text-ios-brand-dark">
                  {{ d.subject || lang.t('admin.contact.noSubject') }}
                </h2>

                <dl class="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt class="text-xs text-gray-500">{{ lang.t('admin.contact.colFrom') }}</dt>
                    <dd class="text-ios-brand-dark" dir="auto">{{ d.name }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs text-gray-500">{{ lang.t('admin.contact.email') }}</dt>
                    <dd dir="ltr">
                      <a
                        [href]="'mailto:' + d.email"
                        class="text-ios-brand-primary underline break-all"
                      >
                        {{ d.email }}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs text-gray-500">{{ lang.t('admin.contact.colReceived') }}</dt>
                    <dd class="text-gray-700">{{ formatDateTime(d.createdAt) }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs text-gray-500">{{ lang.t('admin.contact.colStatus') }}</dt>
                    <dd class="text-gray-700">{{ statusLabel(d.status) }}</dd>
                  </div>
                  @if (d.pageSlug) {
                    <div>
                      <dt class="text-xs text-gray-500">{{ lang.t('admin.contact.page') }}</dt>
                      <dd class="font-mono text-gray-700" dir="ltr">/{{ d.pageSlug }}</dd>
                    </div>
                  }
                  @if (d.locale) {
                    <div>
                      <dt class="text-xs text-gray-500">{{ lang.t('admin.contact.locale') }}</dt>
                      <dd class="font-mono uppercase text-gray-700" dir="ltr">{{ d.locale }}</dd>
                    </div>
                  }
                </dl>

                <div class="mt-5">
                  <p class="mb-1 text-xs text-gray-500">{{ lang.t('admin.contact.message') }}</p>
                  <p
                    class="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-800"
                    dir="auto"
                  >{{ d.message }}</p>
                </div>

                @if (d.ipHash || d.userAgent) {
                  <details class="mt-4">
                    <summary class="cursor-pointer text-xs text-gray-500">
                      {{ lang.t('admin.contact.technical') }}
                    </summary>
                    <dl class="mt-2 flex flex-col gap-2 text-xs">
                      @if (d.ipHash) {
                        <div>
                          <dt class="text-gray-500">{{ lang.t('admin.contact.ipHash') }}</dt>
                          <dd class="break-all font-mono text-gray-600" dir="ltr">
                            {{ d.ipHash }}
                          </dd>
                        </div>
                      }
                      @if (d.userAgent) {
                        <div>
                          <dt class="text-gray-500">{{ lang.t('admin.contact.userAgent') }}</dt>
                          <dd class="break-all font-mono text-gray-600" dir="ltr">
                            {{ d.userAgent }}
                          </dd>
                        </div>
                      }
                    </dl>
                    <p class="mt-2 text-[11px] text-gray-400">
                      {{ lang.t('admin.contact.ipHashHint') }}
                    </p>
                  </details>
                }

                @if (store.actionError()) {
                  <p class="mt-4 text-sm text-red-600" role="alert">{{ store.actionError() }}</p>
                }

                <div class="flex flex-wrap justify-end gap-3 pt-5">
                  @for (next of transitionsFor(d.status); track next) {
                    <ios-button
                      variant="secondary"
                      [loading]="store.actionPendingId() === d.id"
                      (clicked)="setStatusFromDetail(next)"
                    >
                      {{ lang.t('admin.contact.markAs.' + next) }}
                    </ios-button>
                  }
                  <button
                    type="button"
                    (click)="closeDetail()"
                    class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    {{ lang.t('admin.contact.close') }}
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- GDPR erasure confirmation -->
      @if (pendingDelete(); as pending) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-del-title"
        >
          <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="contact-del-title" class="text-lg font-semibold text-ios-brand-dark">
              {{ lang.t('admin.contact.deleteTitle') }}
            </h2>
            <p class="mt-2 text-sm text-gray-600">
              {{ lang.t('admin.contact.deleteBody') }}
              <span class="font-medium text-ios-brand-dark" dir="auto">{{ pending.name }}</span>
              (<span dir="ltr">{{ pending.email }}</span
              >).
            </p>
            <p class="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
              {{ lang.t('admin.contact.deleteWarning') }}
            </p>
            @if (store.actionError()) {
              <p class="mt-3 text-sm text-red-600" role="alert">{{ store.actionError() }}</p>
            }
            <div class="mt-5 flex justify-end gap-3">
              <button
                type="button"
                (click)="cancelDelete()"
                class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {{ lang.t('admin.contact.cancel') }}
              </button>
              <ios-button
                variant="danger"
                [loading]="store.actionPendingId() === pending.id"
                (clicked)="confirmDelete()"
              >
                {{ lang.t('admin.contact.deleteConfirm') }}
              </ios-button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminContactPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthStore);

  protected readonly store = inject(AdminContactStore);
  protected readonly lang = inject(LanguageService);

  /** GDPR erasure is `learning_admin` only (`contact-admin.controller.ts:95`). */
  protected readonly canDelete = computed(
    () => this.auth.hasRole('super_admin') || this.auth.hasRole('learning_admin'),
  );

  protected readonly statusControl = this.fb.control('');
  protected readonly detailOpen = signal(false);
  protected readonly pendingDelete = signal<ContactItem | null>(null);

  protected readonly busy = computed(() => this.store.actionPendingId() !== null);

  protected readonly statusFilterOptions = computed<SelectOption[]>(() => [
    { value: '', label: this.lang.t('admin.contact.allStatuses') },
    ...CONTACT_STATUSES.map((s) => ({ value: s, label: this.statusLabel(s) })),
  ]);

  ngOnInit(): void {
    void this.store.load();
  }

  // ── Display helpers ────────────────────────────────────────────────────────

  protected statusLabel(status: ContactStatus): string {
    return this.lang.t(`admin.contact.status.${status}`);
  }

  protected transitionsFor(status: ContactStatus): readonly ContactStatus[] {
    return nextStatusesFor(status);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(this.lang.locale());
  }

  protected formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString(this.lang.locale());
  }

  // ── Filters ────────────────────────────────────────────────────────────────

  protected applyFilters(): void {
    const status = this.statusControl.value;
    void this.store.setFilters({ status: isContactStatus(status) ? status : undefined });
  }

  protected retry(): void {
    void this.store.retry();
  }

  protected loadMore(): void {
    void this.store.loadMore();
  }

  // ── Detail ─────────────────────────────────────────────────────────────────

  protected async openDetail(item: ContactItem): Promise<void> {
    this.store.clearActionError();
    this.detailOpen.set(true);
    await this.store.loadDetail(item.id);
  }

  protected closeDetail(): void {
    this.detailOpen.set(false);
    this.store.clearDetail();
    this.store.clearActionError();
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  protected setStatus(item: ContactItem, status: ContactStatus): void {
    void this.store.setStatus(item.id, status);
  }

  protected setStatusFromDetail(status: ContactStatus): void {
    const detail = this.store.detail();
    if (detail) void this.store.setStatus(detail.id, status);
  }

  protected askDelete(item: ContactItem): void {
    this.store.clearActionError();
    this.pendingDelete.set(item);
  }

  protected cancelDelete(): void {
    this.store.clearActionError();
    this.pendingDelete.set(null);
  }

  protected async confirmDelete(): Promise<void> {
    const pending = this.pendingDelete();
    if (!pending) return;
    const ok = await this.store.remove(pending.id);
    if (ok) {
      this.pendingDelete.set(null);
      this.detailOpen.set(false);
    }
  }
}

export default AdminContactPage;
