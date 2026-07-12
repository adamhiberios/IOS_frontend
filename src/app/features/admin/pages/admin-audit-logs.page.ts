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
    <section class="max-w-6xl">
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
        <ios-input
          id="audit-actor"
          [label]="lang.t('admin.audit.actorLabel')"
          type="text"
          [control]="form.controls.actorId"
          [placeholder]="lang.t('admin.audit.actorPlaceholder')"
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
                  <td class="px-4 py-3 font-mono text-xs text-gray-500">{{ e.actorId }}</td>
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
            class="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto"
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
                <dd class="font-mono text-xs text-ios-brand-dark break-all">{{ entry.actorId }}</dd>
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

            <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  {{ lang.t('admin.audit.oldData') }}
                </h3>
                @if (entry.oldData) {
                  <pre
                    class="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-words"
                    >{{ formatJson(entry.oldData) }}</pre
                  >
                } @else {
                  <p class="text-sm text-gray-400">{{ lang.t('admin.audit.noData') }}</p>
                }
              </div>
              <div>
                <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  {{ lang.t('admin.audit.newData') }}
                </h3>
                @if (entry.newData) {
                  <pre
                    class="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-words"
                    >{{ formatJson(entry.newData) }}</pre
                  >
                } @else {
                  <p class="text-sm text-gray-400">{{ lang.t('admin.audit.noData') }}</p>
                }
              </div>
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

  ngOnInit(): void {
    void this.store.load();
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
  }

  protected closeDetails(): void {
    this.selected.set(null);
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

  protected formatJson(data: Record<string, unknown>): string {
    return JSON.stringify(data, null, 2);
  }
}

export default AdminAuditLogsPage;
