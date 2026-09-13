import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';

import { AuthStore } from '@core/auth';
import { LanguageService } from '@core/i18n';
import { Button, Select, type SelectOption } from '@ui';

import {
  ADMIN_NOTES_MAX_LENGTH,
  RESOURCE_DOWNLOAD_STATUSES,
  type ResourceDownloadItem,
  type ResourceDownloadPatch,
  type ResourceDownloadStatus,
  isResourceDownloadStatus,
} from '../data-access/resource-download.model';
import { AdminResourceDownloadStore } from '../data-access/resource-download.store';

/**
 * Admin gated-download leads (`/admin/downloads`, IDD-267, backend `10fa7b0`).
 * Every capture from the public "Download Scrum Guide" form (and any future
 * gated asset) lands here as one row per download event.
 *
 * Admins follow each lead up through `new → contacted → converted`, or park it
 * as `archived` / `spam`, and keep internal notes. The visitor's own data
 * (email, name, country) is read-only — the backend keeps it a faithful record.
 *
 * **Delete is a hard, irreversible GDPR erasure** — `learning_admin` only, and
 * behind a confirmation that says so, same as the contact inbox.
 *
 * RBAC: list / read / update → support_admin, learning_admin; delete →
 * learning_admin. super_admin does everything. The backend re-authorizes.
 */
@Component({
  selector: 'ios-admin-resource-downloads-page',
  imports: [ReactiveFormsModule, Select, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <header class="mb-6">
        <h1 class="text-2xl font-bold text-ios-brand-dark">
          {{ lang.t('admin.downloads.title') }}
        </h1>
        <p class="mt-1 text-sm text-gray-500">{{ lang.t('admin.downloads.subtitle') }}</p>
      </header>

      <div class="mb-6 max-w-xs">
        <ios-select
          id="downloads-status-filter"
          [label]="lang.t('admin.downloads.filterStatus')"
          [options]="statusFilterOptions()"
          [control]="statusFilterControl"
          (selected)="applyFilters()"
        />
      </div>

      @if (store.error()) {
        <div class="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p class="text-sm text-red-700">{{ store.error() }}</p>
          <ios-button class="mt-3 inline-block" variant="secondary" (clicked)="retry()">
            {{ lang.t('admin.downloads.retry') }}
          </ios-button>
        </div>
      } @else if (store.loading()) {
        <p class="py-10 text-center text-sm text-gray-500" role="status" aria-live="polite">
          {{ lang.t('admin.downloads.loading') }}
        </p>
      } @else if (store.isEmpty()) {
        <div class="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p class="text-sm text-gray-500">{{ lang.t('admin.downloads.empty') }}</p>
        </div>
      } @else {
        <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th scope="col" class="px-4 py-3 text-start font-medium">
                  {{ lang.t('admin.downloads.colVisitor') }}
                </th>
                <th scope="col" class="px-4 py-3 text-start font-medium">
                  {{ lang.t('admin.downloads.colCountry') }}
                </th>
                <th scope="col" class="px-4 py-3 text-start font-medium">
                  {{ lang.t('admin.downloads.colResource') }}
                </th>
                <th scope="col" class="px-4 py-3 text-start font-medium">
                  {{ lang.t('admin.downloads.colStatus') }}
                </th>
                <th scope="col" class="px-4 py-3 text-start font-medium">
                  {{ lang.t('admin.downloads.colDownloaded') }}
                </th>
                <th scope="col" class="px-4 py-3 text-end font-medium">
                  {{ lang.t('admin.downloads.colActions') }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (d of store.items(); track d.id) {
                <tr
                  class="align-top hover:bg-gray-50"
                  [class.opacity-60]="d.status === 'archived' || d.status === 'spam'"
                >
                  <td class="px-4 py-3">
                    <p class="font-medium text-ios-brand-dark" dir="auto">
                      {{ d.fullName || lang.t('admin.downloads.noName') }}
                    </p>
                    <p class="mt-0.5 text-xs text-gray-500" dir="ltr">{{ d.email }}</p>
                  </td>
                  <td class="px-4 py-3 text-gray-700">{{ d.country || '—' }}</td>
                  <td class="px-4 py-3">
                    <p class="font-mono text-xs text-gray-700" dir="ltr">{{ d.resourceSlug }}</p>
                    @if (d.pageSlug) {
                      <p class="mt-0.5 font-mono text-xs text-gray-400" dir="ltr">
                        /{{ d.pageSlug }}
                      </p>
                    }
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                      [class.bg-blue-50]="d.status === 'new'"
                      [class.text-blue-700]="d.status === 'new'"
                      [class.bg-violet-50]="d.status === 'contacted'"
                      [class.text-violet-700]="d.status === 'contacted'"
                      [class.bg-green-50]="d.status === 'converted'"
                      [class.text-green-700]="d.status === 'converted'"
                      [class.bg-amber-50]="d.status === 'archived'"
                      [class.text-amber-700]="d.status === 'archived'"
                      [class.bg-red-50]="d.status === 'spam'"
                      [class.text-red-700]="d.status === 'spam'"
                    >
                      {{ statusLabel(d.status) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-gray-500">{{ formatDate(d.createdAt) }}</td>
                  <td class="px-4 py-3">
                    <div class="flex flex-wrap items-center justify-end gap-3">
                      <button
                        type="button"
                        [disabled]="busy()"
                        (click)="openDetail(d)"
                        class="text-sm text-ios-brand-primary underline disabled:opacity-50"
                      >
                        {{ lang.t('admin.downloads.manage') }}
                      </button>
                      @if (canDelete()) {
                        <button
                          type="button"
                          [disabled]="busy()"
                          (click)="askDelete(d)"
                          class="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          {{ lang.t('admin.downloads.delete') }}
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
              {{ lang.t('admin.downloads.loadMore') }}
            </ios-button>
          </div>
        }
      }

      <!-- Detail + follow-up editor -->
      @if (detailOpen()) {
        <div
          class="fixed inset-0 z-50 overflow-y-auto bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="download-detail-title"
        >
          <div class="flex min-h-full items-start justify-center p-4">
            <div class="my-8 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
              @if (store.detailLoading()) {
                <p class="py-10 text-center text-sm text-gray-500" role="status" aria-live="polite">
                  {{ lang.t('admin.downloads.loading') }}
                </p>
              } @else if (store.detailError()) {
                <p class="py-10 text-center text-sm text-red-600" role="alert">
                  {{ store.detailError() }}
                </p>
                <div class="flex justify-end">
                  <button
                    type="button"
                    (click)="closeDetail()"
                    class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    {{ lang.t('admin.downloads.close') }}
                  </button>
                </div>
              } @else if (store.detail(); as d) {
                <h2
                  id="download-detail-title"
                  class="text-lg font-semibold text-ios-brand-dark"
                  dir="auto"
                >
                  {{ d.fullName || d.email }}
                </h2>

                <dl class="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt class="text-xs text-gray-500">{{ lang.t('admin.downloads.name') }}</dt>
                    <dd class="text-ios-brand-dark" dir="auto">
                      {{ d.fullName || lang.t('admin.downloads.noName') }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs text-gray-500">{{ lang.t('admin.downloads.email') }}</dt>
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
                    <dt class="text-xs text-gray-500">
                      {{ lang.t('admin.downloads.colCountry') }}
                    </dt>
                    <dd class="text-gray-700">{{ d.country || '—' }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs text-gray-500">
                      {{ lang.t('admin.downloads.colDownloaded') }}
                    </dt>
                    <dd class="text-gray-700">{{ formatDateTime(d.createdAt) }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs text-gray-500">
                      {{ lang.t('admin.downloads.colResource') }}
                    </dt>
                    <dd class="font-mono text-gray-700" dir="ltr">{{ d.resourceSlug }}</dd>
                  </div>
                  @if (d.pageSlug) {
                    <div>
                      <dt class="text-xs text-gray-500">{{ lang.t('admin.downloads.page') }}</dt>
                      <dd class="font-mono text-gray-700" dir="ltr">/{{ d.pageSlug }}</dd>
                    </div>
                  }
                  @if (d.locale) {
                    <div>
                      <dt class="text-xs text-gray-500">{{ lang.t('admin.downloads.locale') }}</dt>
                      <dd class="font-mono uppercase text-gray-700" dir="ltr">{{ d.locale }}</dd>
                    </div>
                  }
                </dl>

                @if (d.ipHash || d.userAgent) {
                  <details class="mt-4">
                    <summary class="cursor-pointer text-xs text-gray-500">
                      {{ lang.t('admin.downloads.technical') }}
                    </summary>
                    <dl class="mt-2 flex flex-col gap-2 text-xs">
                      @if (d.ipHash) {
                        <div>
                          <dt class="text-gray-500">{{ lang.t('admin.downloads.ipHash') }}</dt>
                          <dd class="break-all font-mono text-gray-600" dir="ltr">
                            {{ d.ipHash }}
                          </dd>
                        </div>
                      }
                      @if (d.userAgent) {
                        <div>
                          <dt class="text-gray-500">{{ lang.t('admin.downloads.userAgent') }}</dt>
                          <dd class="break-all font-mono text-gray-600" dir="ltr">
                            {{ d.userAgent }}
                          </dd>
                        </div>
                      }
                    </dl>
                    <p class="mt-2 text-[11px] text-gray-400">
                      {{ lang.t('admin.downloads.ipHashHint') }}
                    </p>
                  </details>
                }

                <!-- Follow-up: the only editable part of the record -->
                <form
                  [formGroup]="editForm"
                  (ngSubmit)="save()"
                  class="mt-6 flex flex-col gap-4 border-t border-gray-100 pt-5"
                  novalidate
                >
                  <h3 class="text-sm font-semibold text-ios-brand-dark">
                    {{ lang.t('admin.downloads.followUp') }}
                  </h3>

                  <div class="max-w-xs">
                    <ios-select
                      id="download-status"
                      [label]="lang.t('admin.downloads.colStatus')"
                      [options]="statusOptions()"
                      [control]="editForm.controls.status"
                    />
                  </div>

                  <div class="flex flex-col gap-1.5">
                    <label for="download-notes" class="text-sm font-medium text-ios-brand-dark">
                      {{ lang.t('admin.downloads.notes') }}
                    </label>
                    <textarea
                      id="download-notes"
                      rows="4"
                      formControlName="adminNotes"
                      [attr.maxlength]="notesMaxLength"
                      [placeholder]="lang.t('admin.downloads.notesPlaceholder')"
                      aria-describedby="download-notes-count"
                      dir="auto"
                      class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary"
                    ></textarea>
                    <p id="download-notes-count" class="text-end text-xs text-gray-400">
                      {{ formValue().adminNotes.length }} / {{ notesMaxLength }}
                    </p>
                  </div>

                  @if (store.actionError()) {
                    <p class="text-sm text-red-600" role="alert">{{ store.actionError() }}</p>
                  }
                  @if (saved() && !hasChanges()) {
                    <p class="text-sm text-green-700" role="status" aria-live="polite">
                      {{ lang.t('admin.downloads.saved') }}
                    </p>
                  }

                  <div class="flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      (click)="closeDetail()"
                      class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      {{ lang.t('admin.downloads.close') }}
                    </button>
                    <ios-button
                      type="submit"
                      [disabled]="!hasChanges()"
                      [loading]="store.actionPendingId() === d.id"
                    >
                      {{ lang.t('admin.downloads.save') }}
                    </ios-button>
                  </div>
                </form>
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
          aria-labelledby="download-del-title"
        >
          <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="download-del-title" class="text-lg font-semibold text-ios-brand-dark">
              {{ lang.t('admin.downloads.deleteTitle') }}
            </h2>
            <p class="mt-2 text-sm text-gray-600">
              {{ lang.t('admin.downloads.deleteBody') }}
              @if (pending.fullName) {
                <span class="font-medium text-ios-brand-dark" dir="auto">{{
                  pending.fullName
                }}</span>
              }
              (<span dir="ltr">{{ pending.email }}</span
              >).
            </p>
            <p class="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
              {{ lang.t('admin.downloads.deleteWarning') }}
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
                {{ lang.t('admin.downloads.cancel') }}
              </button>
              <ios-button
                variant="danger"
                [loading]="store.actionPendingId() === pending.id"
                (clicked)="confirmDelete()"
              >
                {{ lang.t('admin.downloads.deleteConfirm') }}
              </ios-button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminResourceDownloadsPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthStore);

  protected readonly store = inject(AdminResourceDownloadStore);
  protected readonly lang = inject(LanguageService);

  protected readonly notesMaxLength = ADMIN_NOTES_MAX_LENGTH;

  /** GDPR erasure is `learning_admin` only (`resource-download-admin.controller.ts`). */
  protected readonly canDelete = computed(
    () => this.auth.hasRole('super_admin') || this.auth.hasRole('learning_admin'),
  );

  protected readonly statusFilterControl = this.fb.control('');
  protected readonly detailOpen = signal(false);
  protected readonly pendingDelete = signal<ResourceDownloadItem | null>(null);
  /** Confirms a save landed; reset on the next edit or when the dialog closes. */
  protected readonly saved = signal(false);

  protected readonly busy = computed(() => this.store.actionPendingId() !== null);

  protected readonly editForm = this.fb.group({
    status: this.fb.control<string>('new'),
    adminNotes: this.fb.control('', [(c) => Validators.maxLength(ADMIN_NOTES_MAX_LENGTH)(c)]),
  });

  /** Live form value — drives the dirty check and the notes counter. */
  protected readonly formValue = toSignal(
    this.editForm.valueChanges.pipe(map(() => this.editForm.getRawValue())),
    { initialValue: this.editForm.getRawValue() },
  );

  /**
   * The minimal PATCH body for what the admin changed, or `null` when nothing
   * did — the backend 400s on an empty patch, so Save stays disabled instead.
   */
  private readonly pendingPatch = computed<ResourceDownloadPatch | null>(() => {
    const detail = this.store.detail();
    if (!detail) return null;
    const { status, adminNotes } = this.formValue();
    const notes = adminNotes.trim() || null;

    const patch: { -readonly [K in keyof ResourceDownloadPatch]: ResourceDownloadPatch[K] } = {};
    if (isResourceDownloadStatus(status) && status !== detail.status) patch.status = status;
    if (notes !== (detail.adminNotes ?? null)) patch.adminNotes = notes;
    return Object.keys(patch).length > 0 ? patch : null;
  });

  protected readonly hasChanges = computed(
    () => this.pendingPatch() !== null && this.formValue().adminNotes.length <= this.notesMaxLength,
  );

  protected readonly statusOptions = computed<SelectOption[]>(() =>
    RESOURCE_DOWNLOAD_STATUSES.map((s) => ({ value: s, label: this.statusLabel(s) })),
  );

  protected readonly statusFilterOptions = computed<SelectOption[]>(() => [
    { value: '', label: this.lang.t('admin.downloads.allStatuses') },
    ...this.statusOptions(),
  ]);

  ngOnInit(): void {
    void this.store.load();
  }

  // ── Display helpers ────────────────────────────────────────────────────────

  protected statusLabel(status: ResourceDownloadStatus): string {
    return this.lang.t(`admin.downloads.status.${status}`);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(this.lang.locale());
  }

  protected formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString(this.lang.locale());
  }

  // ── Filters ────────────────────────────────────────────────────────────────

  protected applyFilters(): void {
    const status = this.statusFilterControl.value;
    void this.store.setFilters({ status: isResourceDownloadStatus(status) ? status : undefined });
  }

  protected retry(): void {
    void this.store.retry();
  }

  protected loadMore(): void {
    void this.store.loadMore();
  }

  // ── Detail ─────────────────────────────────────────────────────────────────

  protected async openDetail(item: ResourceDownloadItem): Promise<void> {
    this.store.clearActionError();
    this.saved.set(false);
    // Seed from the row so the form isn't stale while the full record loads.
    this.editForm.reset({ status: item.status, adminNotes: '' });
    this.detailOpen.set(true);
    const detail = await this.store.loadDetail(item.id);
    if (detail) this.editForm.reset({ status: detail.status, adminNotes: detail.adminNotes ?? '' });
  }

  protected closeDetail(): void {
    this.detailOpen.set(false);
    this.saved.set(false);
    this.store.clearDetail();
    this.store.clearActionError();
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  protected async save(): Promise<void> {
    const detail = this.store.detail();
    const patch = this.pendingPatch();
    if (!detail || !patch || !this.hasChanges()) return;

    this.saved.set(false);
    const ok = await this.store.update(detail.id, patch);
    const updated = this.store.detail();
    if (ok && updated) {
      // Re-seed from the server's copy so the form is clean again.
      this.editForm.reset({ status: updated.status, adminNotes: updated.adminNotes ?? '' });
      this.saved.set(true);
    }
  }

  protected askDelete(item: ResourceDownloadItem): void {
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

export default AdminResourceDownloadsPage;
