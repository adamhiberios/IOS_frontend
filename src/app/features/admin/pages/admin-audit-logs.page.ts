import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';

import { LanguageService } from '@core/i18n';
import { Button, Input as IosInput, Select, type SelectOption } from '@ui';

import { type AuditLogEntry } from '../data-access/audit.model';
import { AdminAuditLogsStore } from '../data-access/audit.store';

/**
 * Admin audit logs (`GET /admin/audit-logs`, super_admin only).
 *
 * A read-only, cursor-paginated activity log with the backend filter set
 * (table, actor, record, action). Rows expose an old/new-data detail dialog
 * (sensitive keys already redacted server-side). All server state lives in
 * {@link AdminAuditLogsStore}; this component only binds signals + drives
 * filters. There are no mutations — audit logs are append-only.
 */
@Component({
  selector: 'ios-admin-audit-logs-page',
  imports: [ReactiveFormsModule, DatePipe, IosInput, Select, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <header class="mb-6">
        <h1 class="text-2xl font-bold text-ios-brand-dark">
          {{ lang.t('admin.audit.title') }}
        </h1>
        <p class="text-sm text-gray-500 mt-1">
          {{ lang.t('admin.audit.subtitle') }}
        </p>
      </header>

      <!-- Filters -->
      <form
        [formGroup]="form"
        (ngSubmit)="onApply()"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-2 items-end"
      >
        <ios-input
          id="audit-table"
          [label]="lang.t('admin.audit.tableLabel')"
          type="text"
          [control]="form.controls.tableName"
          [placeholder]="lang.t('admin.audit.tablePlaceholder')"
        />
        <ios-select
          id="audit-actor"
          [label]="lang.t('admin.audit.actorLabel')"
          [options]="actorOptions()"
          [placeholder]="
            store.actorsLoading()
              ? lang.t('admin.audit.actorsLoading')
              : lang.t('admin.audit.actorAllLabel')
          "
          [control]="form.controls.actorId"
        />
        <ios-input
          id="audit-record"
          [label]="lang.t('admin.audit.recordLabel')"
          type="text"
          [control]="form.controls.recordId"
          [placeholder]="lang.t('admin.audit.recordPlaceholder')"
        />
        <ios-select
          id="audit-action"
          [label]="lang.t('admin.audit.actionLabel')"
          [options]="actionOptions()"
          [control]="form.controls.action"
        />
      </form>
      @if (store.actorsError()) {
        <p class="text-xs text-red-600 mb-2" role="alert">{{ store.actorsError() }}</p>
      }
      <div class="flex gap-2 mb-6">
        <ios-button type="button" variant="primary" (clicked)="onApply()">
          {{ lang.t('admin.audit.apply') }}
        </ios-button>
        <ios-button type="button" variant="secondary" (clicked)="onClear()">
          {{ lang.t('admin.audit.clear') }}
        </ios-button>
      </div>

      @if (store.error() && store.items().length === 0) {
        <div class="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p class="text-sm text-red-700">{{ store.error() }}</p>
          <ios-button class="mt-3 inline-block" variant="secondary" (clicked)="retry()">
            {{ lang.t('admin.audit.retry') }}
          </ios-button>
        </div>
      } @else if (store.loading() && store.items().length === 0) {
        <p class="text-sm text-gray-500 py-10 text-center" role="status" aria-live="polite">
          {{ lang.t('admin.audit.loading') }}
        </p>
      } @else if (store.isEmpty()) {
        <div class="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p class="text-sm text-gray-500">{{ lang.t('admin.audit.empty') }}</p>
        </div>
      } @else {
        <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.audit.colWhen') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.audit.colAction') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.audit.colTable') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.audit.colRecord') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.audit.colActor') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.audit.colIp') }}
                </th>
                <th scope="col" class="text-end font-medium px-4 py-3">
                  {{ lang.t('admin.audit.colDetails') }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (e of store.items(); track e.id) {
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 whitespace-nowrap text-gray-500">
                    {{ e.createdAt | date: 'medium' }}
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                      [class.bg-green-50]="e.action === 'INSERT'"
                      [class.text-green-700]="e.action === 'INSERT'"
                      [class.bg-amber-50]="e.action === 'UPDATE'"
                      [class.text-amber-700]="e.action === 'UPDATE'"
                      [class.bg-red-50]="e.action === 'DELETE'"
                      [class.text-red-700]="e.action === 'DELETE'"
                      [class.bg-gray-100]="!isKnownAction(e.action)"
                      [class.text-gray-600]="!isKnownAction(e.action)"
                    >
                      {{ actionLabel(e.action) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 font-medium text-ios-brand-dark">{{ e.tableName }}</td>
                  <td class="px-4 py-3 font-mono text-xs text-gray-500">
                    {{ e.recordId ?? '—' }}
                  </td>
                  <td class="px-4 py-3 text-gray-700">{{ actorLabel(e.actorId) }}</td>
                  <td class="px-4 py-3 text-gray-500">{{ e.ipAddress ?? '—' }}</td>
                  <td class="px-4 py-3 text-end">
                    <button
                      type="button"
                      (click)="openDetails(e)"
                      class="text-sm text-ios-brand-primary underline"
                    >
                      {{ lang.t('admin.audit.view') }}
                    </button>
                  </td>
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
              {{ lang.t('admin.audit.loadMore') }}
            </ios-button>
          </div>
        }
      }

      <!-- Change-detail dialog -->
      @if (selected(); as entry) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-detail-title"
        >
          <div
            class="w-full max-w-5xl rounded-xl bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto"
          >
            <div class="flex items-start justify-between gap-4">
              <h2 id="audit-detail-title" class="text-lg font-semibold text-ios-brand-dark">
                {{ actionLabel(entry.action) }} · {{ entry.tableName }}
              </h2>
              <button
                type="button"
                (click)="closeDetails()"
                class="text-gray-400 hover:text-gray-700 text-xl leading-none"
                [attr.aria-label]="lang.t('admin.audit.close')"
              >
                ×
              </button>
            </div>

            <dl class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <dt class="text-gray-500">{{ lang.t('admin.audit.colWhen') }}</dt>
                <dd class="text-ios-brand-dark">{{ entry.createdAt | date: 'medium' }}</dd>
              </div>
              <div>
                <dt class="text-gray-500">{{ lang.t('admin.audit.colActor') }}</dt>
                <dd class="text-ios-brand-dark">
                  @if (actorLoading()) {
                    <span class="text-gray-400">{{ lang.t('admin.audit.actorLoading') }}</span>
                  } @else if (actorName(); as name) {
                    {{ name }}
                    <span class="block font-mono text-[10px] text-gray-400 break-all">{{
                      entry.actorId
                    }}</span>
                  } @else {
                    <span class="font-mono text-xs break-all">{{ entry.actorId }}</span>
                  }
                </dd>
              </div>
              <div>
                <dt class="text-gray-500">{{ lang.t('admin.audit.colRecord') }}</dt>
                <dd class="font-mono text-xs text-ios-brand-dark break-all">
                  {{ entry.recordId ?? '—' }}
                </dd>
              </div>
              <div>
                <dt class="text-gray-500">{{ lang.t('admin.audit.colIp') }}</dt>
                <dd class="text-ios-brand-dark">{{ entry.ipAddress ?? '—' }}</dd>
              </div>
            </dl>

            <div class="mt-4">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                {{ lang.t('admin.audit.changes') }}
              </h3>
              @if (!entry.oldData && !entry.newData) {
                <p class="text-sm text-gray-400">{{ lang.t('admin.audit.noData') }}</p>
              } @else {
                <div class="overflow-x-auto rounded-lg border border-gray-200">
                  <table class="w-full table-fixed text-sm">
                    <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                      <tr>
                        <th scope="col" class="w-1/5 text-start font-medium px-3 py-2">
                          {{ lang.t('admin.audit.field') }}
                        </th>
                        <th scope="col" class="w-2/5 text-start font-medium px-3 py-2">
                          {{ lang.t('admin.audit.before') }}
                        </th>
                        <th scope="col" class="w-2/5 text-start font-medium px-3 py-2">
                          {{ lang.t('admin.audit.after') }}
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                      @for (row of diffRows(entry); track row.key) {
                        <tr
                          [class.bg-green-50]="row.kind === 'added'"
                          [class.bg-red-50]="row.kind === 'removed'"
                          [class.bg-amber-50]="row.kind === 'changed'"
                        >
                          <td
                            class="px-3 py-2 font-medium text-ios-brand-dark align-top break-words"
                          >
                            {{ formatKey(row.key) }}
                          </td>
                          <td
                            class="px-3 py-2 align-top break-words"
                            [class.text-gray-300]="row.kind === 'added'"
                            [class.text-red-700]="row.kind === 'removed' || row.kind === 'changed'"
                            [class.line-through]="row.kind === 'changed' || row.kind === 'removed'"
                            [class.text-gray-500]="row.kind === 'unchanged'"
                          >
                            {{ row.kind === 'added' ? '—' : formatValue(row.oldValue) }}
                          </td>
                          <td
                            class="px-3 py-2 align-top break-words"
                            [class.text-gray-300]="row.kind === 'removed'"
                            [class.text-green-700]="row.kind === 'added' || row.kind === 'changed'"
                            [class.font-semibold]="row.kind === 'added' || row.kind === 'changed'"
                            [class.text-gray-500]="row.kind === 'unchanged'"
                          >
                            {{ row.kind === 'removed' ? '—' : formatValue(row.newValue) }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>

            <div class="mt-5 flex justify-end">
              <ios-button variant="secondary" (clicked)="closeDetails()">
                {{ lang.t('admin.audit.close') }}
              </ios-button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminAuditLogsPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly store = inject(AdminAuditLogsStore);
  protected readonly lang = inject(LanguageService);

  /** The entry whose old/new data is shown in the detail dialog, or `null`. */
  protected readonly selected = signal<AuditLogEntry | null>(null);
  /** Resolved display name for `selected()`'s actor, or `null` while unresolved. */
  protected readonly actorName = signal<string | null>(null);
  protected readonly actorLoading = signal(false);

  protected readonly form = this.fb.group({
    tableName: this.fb.control(''),
    actorId: this.fb.control(''),
    recordId: this.fb.control(''),
    action: this.fb.control(''),
  });

  /** Action filter options ("All" + the three backend actions). */
  protected readonly actionOptions = computed<SelectOption[]>(() => [
    { value: '', label: this.lang.t('admin.audit.actionAll') },
    { value: 'INSERT', label: this.lang.t('admin.audit.actionInsert') },
    { value: 'UPDATE', label: this.lang.t('admin.audit.actionUpdate') },
    { value: 'DELETE', label: this.lang.t('admin.audit.actionDelete') },
  ]);

  /** Actor filter options ("All actors" + one per loaded staff account). */
  protected readonly actorOptions = computed<SelectOption[]>(() => [
    { value: '', label: this.lang.t('admin.audit.actorAllLabel') },
    ...this.store
      .actors()
      .map((a) => ({ value: a.id, label: `${a.firstName} ${a.lastName} (${a.email})` })),
  ]);

  constructor() {
    // Resolve actor names for whatever page of rows is currently loaded.
    // `actorDisplayName` reads the store's cache, so this reruns whenever the
    // cache or the item list changes, and converges once every visible actor
    // is resolved (already-cached ids are skipped, so this doesn't re-fetch).
    effect(() => {
      const unresolved = new Set<string>();
      for (const item of this.store.items()) {
        if (!this.store.actorDisplayName(item.actorId)) unresolved.add(item.actorId);
      }
      for (const actorId of unresolved) {
        void this.store.resolveActor(actorId);
      }
    });
  }

  ngOnInit(): void {
    void this.store.load();
    void this.store.loadActors();
  }

  /** Cached display name for the table row, falling back to a short id while unresolved. */
  protected actorLabel(actorId: string): string {
    return this.store.actorDisplayName(actorId) ?? this.shortId(actorId);
  }

  protected shortId(id: string): string {
    return id.slice(0, 8);
  }

  protected onApply(): void {
    const { tableName, actorId, recordId, action } = this.form.getRawValue();
    void this.store.setFilters({
      tableName,
      actorId,
      recordId,
      action:
        action === 'INSERT' || action === 'UPDATE' || action === 'DELETE' ? action : undefined,
    });
  }

  protected onClear(): void {
    this.form.reset({ tableName: '', actorId: '', recordId: '', action: '' });
    void this.store.setFilters({});
  }

  protected loadMore(): void {
    void this.store.loadMore();
  }

  protected retry(): void {
    void this.store.load();
  }

  protected openDetails(entry: AuditLogEntry): void {
    this.selected.set(entry);
    this.actorName.set(null);
    this.actorLoading.set(true);
    void this.store.resolveActor(entry.actorId).then((staff) => {
      // Ignore a stale resolution if the dialog moved on to another entry
      // (or was closed) while the lookup was in flight.
      if (this.selected()?.actorId !== entry.actorId) return;
      this.actorName.set(staff ? `${staff.firstName} ${staff.lastName}` : null);
      this.actorLoading.set(false);
    });
  }

  protected closeDetails(): void {
    this.selected.set(null);
    this.actorName.set(null);
    this.actorLoading.set(false);
  }

  protected isKnownAction(action: string): boolean {
    return action === 'INSERT' || action === 'UPDATE' || action === 'DELETE';
  }

  /** Translated badge label; unknown actions fall back to the raw value. */
  protected actionLabel(action: string): string {
    switch (action) {
      case 'INSERT':
        return this.lang.t('admin.audit.actionInsert');
      case 'UPDATE':
        return this.lang.t('admin.audit.actionUpdate');
      case 'DELETE':
        return this.lang.t('admin.audit.actionDelete');
      default:
        return action;
    }
  }

  /**
   * Field-by-field diff between `oldData`/`newData`, sorted by key. A field
   * missing from `oldData` is `added`, missing from `newData` is `removed`,
   * present in both with an unequal value is `changed`, otherwise `unchanged`.
   * For a pure INSERT (no oldData) every field is `added`; for a pure DELETE
   * (no newData) every field is `removed`.
   */
  protected diffRows(entry: AuditLogEntry): {
    key: string;
    oldValue: unknown;
    newValue: unknown;
    kind: 'added' | 'removed' | 'changed' | 'unchanged';
  }[] {
    const oldData = entry.oldData;
    const newData = entry.newData;
    const keys = new Set([...Object.keys(oldData ?? {}), ...Object.keys(newData ?? {})]);

    return Array.from(keys)
      .sort()
      .map((key) => {
        const hasOld = oldData !== null && Object.hasOwn(oldData, key);
        const hasNew = newData !== null && Object.hasOwn(newData, key);
        const oldValue = hasOld ? oldData[key] : undefined;
        const newValue = hasNew ? newData[key] : undefined;

        let kind: 'added' | 'removed' | 'changed' | 'unchanged';
        if (!hasOld && hasNew) kind = 'added';
        else if (hasOld && !hasNew) kind = 'removed';
        else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) kind = 'changed';
        else kind = 'unchanged';

        return { key, oldValue, newValue, kind };
      });
  }

  /** `firstSeenAt` → `First seen at`; `payment_type` → `Payment type`. */
  protected formatKey(key: string): string {
    const spaced = key
      .replace(/_/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .toLowerCase();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

  /** Render a raw field value in a human-friendly way instead of raw JSON. */
  protected formatValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') {
      return value ? this.lang.t('common.yes') : this.lang.t('common.no');
    }
    if (typeof value === 'object') return JSON.stringify(value);
    // `value` is a primitive here (null/undefined/boolean/object already
    // returned), so this can never produce "[object Object]". Narrowed
    // explicitly rather than cast, so the guarantee is checked, not asserted.
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'bigint') return value.toString();
    if (typeof value === 'symbol') return value.toString();
    return JSON.stringify(value) ?? '—';
  }
}

export default AdminAuditLogsPage;
