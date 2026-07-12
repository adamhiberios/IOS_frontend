import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthStore } from '@core/auth';
import { LanguageService } from '@core/i18n';
import { Button, Input as IosInput, Select, type SelectOption } from '@ui';

import { type AdminExam, type ExamDraft } from '../data-access/exam-authoring.model';
import { AdminExamAuthoringStore } from '../data-access/exam-authoring.store';

/**
 * `Validators.required` wrapped as a call — the mixed string/number control set
 * degrades the form-builder overload inference enough that the type-aware
 * `unbound-method` lint rule loses the bare reference's `ValidatorFn` context.
 */
const required: ValidatorFn = (control) => Validators.required(control);

/**
 * Admin exam authoring — list + lifecycle (`/admin/exams`, backend-analysis §6.5).
 *
 * Pick a certificate, then manage its exams: create / edit draft metadata (title,
 * order, duration, passing score), publish / unpublish, and delete an unused
 * draft. Question authoring is a follow-up increment. All server state + actions
 * live in {@link AdminExamAuthoringStore}; row actions are role-gated (the
 * backend still enforces).
 */
@Component({
  selector: 'ios-admin-exam-authoring-page',
  imports: [ReactiveFormsModule, RouterLink, IosInput, Select, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <header class="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-ios-brand-dark">
            {{ lang.t('admin.examAuthoring.title') }}
          </h1>
          <p class="text-sm text-gray-500 mt-1">{{ lang.t('admin.examAuthoring.subtitle') }}</p>
        </div>
        @if (canManage() && store.certId()) {
          <ios-button variant="primary" (clicked)="openCreate()">
            {{ lang.t('admin.examAuthoring.new') }}
          </ios-button>
        }
      </header>

      <!-- Certificate picker -->
      <div class="mb-6 max-w-md">
        @if (store.certsError()) {
          <div class="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
            <p class="text-sm text-red-700">{{ store.certsError() }}</p>
            <ios-button class="mt-2 inline-block" variant="secondary" (clicked)="retryCerts()">
              {{ lang.t('admin.examAuthoring.retry') }}
            </ios-button>
          </div>
        } @else {
          <ios-select
            id="authoring-cert"
            [label]="lang.t('admin.examAuthoring.certLabel')"
            [options]="certOptions()"
            [placeholder]="
              store.certsLoading()
                ? lang.t('admin.examAuthoring.certsLoading')
                : lang.t('admin.examAuthoring.certPlaceholder')
            "
            [control]="certControl"
            (selected)="onCertChange($event)"
          />
        }
      </div>

      @if (!store.certId()) {
        <div class="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p class="text-sm text-gray-500">{{ lang.t('admin.examAuthoring.pickCert') }}</p>
        </div>
      } @else if (store.error()) {
        <div class="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p class="text-sm text-red-700">{{ store.error() }}</p>
          <ios-button class="mt-3 inline-block" variant="secondary" (clicked)="retry()">
            {{ lang.t('admin.examAuthoring.retry') }}
          </ios-button>
        </div>
      } @else if (store.loading()) {
        <p class="text-sm text-gray-500 py-10 text-center" role="status" aria-live="polite">
          {{ lang.t('admin.examAuthoring.loading') }}
        </p>
      } @else if (store.isEmpty()) {
        <div class="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p class="text-sm text-gray-500">{{ lang.t('admin.examAuthoring.empty') }}</p>
        </div>
      } @else {
        <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.examAuthoring.colOrder') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.examAuthoring.colTitle') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.examAuthoring.colStatus') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.examAuthoring.colQuestions') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.examAuthoring.colDuration') }}
                </th>
                <th scope="col" class="text-start font-medium px-4 py-3">
                  {{ lang.t('admin.examAuthoring.colPass') }}
                </th>
                @if (canManage()) {
                  <th scope="col" class="text-end font-medium px-4 py-3">
                    {{ lang.t('admin.examAuthoring.colActions') }}
                  </th>
                }
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (e of store.exams(); track e.id) {
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-gray-500">#{{ e.examOrder }}</td>
                  <td class="px-4 py-3 font-medium text-ios-brand-dark">{{ e.title }}</td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                      [class.bg-green-50]="e.status === 'published'"
                      [class.text-green-700]="e.status === 'published'"
                      [class.bg-amber-50]="e.status === 'draft'"
                      [class.text-amber-700]="e.status === 'draft'"
                    >
                      {{ statusLabel(e.status) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-gray-600">
                    {{ e.questionCount }}
                    @if (e.status === 'draft' && e.questionCount === 0) {
                      <span class="text-xs text-amber-700 ms-1">
                        {{ lang.t('admin.examAuthoring.needsQuestions') }}
                      </span>
                    }
                  </td>
                  <td class="px-4 py-3 text-gray-500">
                    {{ e.durationMinutes }} {{ lang.t('admin.examAuthoring.minutes') }}
                  </td>
                  <td class="px-4 py-3 text-gray-500">{{ e.passingScore }}%</td>
                  @if (canManage()) {
                    <td class="px-4 py-3">
                      <div class="flex items-center justify-end gap-3">
                        <a
                          [routerLink]="['/admin/exams', e.id]"
                          class="text-sm text-ios-brand-primary underline"
                        >
                          {{ lang.t('admin.examAuthoring.questions') }}
                        </a>
                        @if (e.status === 'draft') {
                          <button
                            type="button"
                            (click)="openEdit(e)"
                            class="text-sm text-ios-brand-primary underline"
                          >
                            {{ lang.t('admin.examAuthoring.edit') }}
                          </button>
                          @if (canPublish()) {
                            <button
                              type="button"
                              [disabled]="store.actionPendingId() === e.id"
                              (click)="publish(e)"
                              class="text-sm text-green-700 hover:text-green-800 disabled:opacity-50"
                            >
                              {{ lang.t('admin.examAuthoring.publish') }}
                            </button>
                            <button
                              type="button"
                              (click)="askDelete(e)"
                              class="text-sm text-red-600 hover:text-red-700"
                            >
                              {{ lang.t('admin.examAuthoring.delete') }}
                            </button>
                          }
                        } @else if (canPublish()) {
                          <button
                            type="button"
                            [disabled]="store.actionPendingId() === e.id"
                            (click)="unpublish(e)"
                            class="text-sm text-amber-700 hover:text-amber-800 disabled:opacity-50"
                          >
                            {{ lang.t('admin.examAuthoring.unpublish') }}
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

        @if (store.actionError() && !dialogOpen() && !pendingDelete()) {
          <p class="text-sm text-red-600 mt-3 text-center" role="alert">
            {{ store.actionError() }}
          </p>
        }
      }

      <!-- Create / edit dialog -->
      @if (dialogOpen()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exam-dialog-title"
        >
          <div
            class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <h2 id="exam-dialog-title" class="text-lg font-semibold text-ios-brand-dark mb-4">
              {{
                editingId()
                  ? lang.t('admin.examAuthoring.editTitle')
                  : lang.t('admin.examAuthoring.createTitle')
              }}
            </h2>

            <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
              <ios-input
                id="exam-title"
                [label]="lang.t('admin.examAuthoring.titleLabel')"
                type="text"
                [control]="form.controls.title"
                [placeholder]="lang.t('admin.examAuthoring.titlePlaceholder')"
              />

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    for="exam-order"
                    class="block text-sm font-heading font-medium text-ios-brand-dark mb-1"
                  >
                    {{ lang.t('admin.examAuthoring.orderLabel') }}
                  </label>
                  <input
                    id="exam-order"
                    type="number"
                    min="1"
                    max="6"
                    [formControl]="form.controls.examOrder"
                    class="w-full h-12 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
                  />
                </div>
                <div>
                  <label
                    for="exam-duration"
                    class="block text-sm font-heading font-medium text-ios-brand-dark mb-1"
                  >
                    {{ lang.t('admin.examAuthoring.durationLabel') }}
                  </label>
                  <input
                    id="exam-duration"
                    type="number"
                    min="1"
                    [formControl]="form.controls.durationMinutes"
                    class="w-full h-12 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
                  />
                </div>
                <div>
                  <label
                    for="exam-pass"
                    class="block text-sm font-heading font-medium text-ios-brand-dark mb-1"
                  >
                    {{ lang.t('admin.examAuthoring.passLabel') }}
                  </label>
                  <input
                    id="exam-pass"
                    type="number"
                    min="1"
                    max="100"
                    [formControl]="form.controls.passingScore"
                    class="w-full h-12 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
                  />
                </div>
              </div>
              <p class="text-xs text-gray-500 -mt-2">
                {{ lang.t('admin.examAuthoring.metaHint') }}
              </p>

              @if (formError()) {
                <p class="text-xs text-ios-brand-primary" role="alert">{{ formError() }}</p>
              }
              @if (store.actionError()) {
                <p class="text-sm text-red-600" role="alert">{{ store.actionError() }}</p>
              }

              <div class="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  (click)="closeDialog()"
                  class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  {{ lang.t('admin.examAuthoring.cancel') }}
                </button>
                <ios-button
                  type="submit"
                  variant="primary"
                  [loading]="store.actionPendingId() === (editingId() ?? 'new')"
                >
                  {{ lang.t('admin.examAuthoring.save') }}
                </ios-button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Delete confirmation -->
      @if (pendingDelete(); as pending) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exam-delete-title"
        >
          <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="exam-delete-title" class="text-lg font-semibold text-ios-brand-dark">
              {{ lang.t('admin.examAuthoring.confirmTitle') }}
            </h2>
            <p class="mt-2 text-sm text-gray-600">
              {{ lang.t('admin.examAuthoring.confirmBody') }}
              <span class="font-medium text-ios-brand-dark">{{ pending.title }}</span>
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
                {{ lang.t('admin.examAuthoring.cancel') }}
              </button>
              <ios-button
                variant="danger"
                [loading]="store.actionPendingId() === pending.id"
                (clicked)="confirmDelete()"
              >
                {{ lang.t('admin.examAuthoring.delete') }}
              </ios-button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminExamAuthoringPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthStore);

  protected readonly store = inject(AdminExamAuthoringStore);
  protected readonly lang = inject(LanguageService);

  /** Create/edit gate — backend allows content_creator + learning_admin. */
  protected readonly canManage = computed(
    () =>
      this.auth.hasRole('super_admin') ||
      this.auth.hasAnyRole(['content_creator', 'learning_admin']),
  );
  /** Publish / unpublish / delete gate — backend restricts these to learning_admin. */
  protected readonly canPublish = computed(
    () => this.auth.hasRole('super_admin') || this.auth.hasRole('learning_admin'),
  );

  protected readonly certControl = this.fb.control('');
  protected readonly certOptions = computed<SelectOption[]>(() =>
    this.store.certs().map((c) => ({ value: c.id, label: c.label })),
  );

  protected readonly dialogOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly pendingDelete = signal<AdminExam | null>(null);

  protected readonly form = this.fb.group({
    title: this.fb.control('', { validators: [required] }),
    examOrder: this.fb.control(1, {
      validators: [required, Validators.min(1), Validators.max(6)],
    }),
    durationMinutes: this.fb.control(60, {
      validators: [required, Validators.min(1)],
    }),
    passingScore: this.fb.control(80, {
      validators: [required, Validators.min(1), Validators.max(100)],
    }),
  });

  ngOnInit(): void {
    void this.store.loadCerts();
    // Returning from the question editor (or any navigation back) re-mounts this
    // page while the root-provided store keeps the previously selected cert and
    // its exams. Restore the picker and re-fetch so counts/statuses are fresh.
    const certId = this.store.certId();
    if (certId) {
      this.certControl.setValue(certId);
      void this.store.load();
    }
  }

  protected onCertChange(certId: string): void {
    void this.store.setCert(certId);
  }

  protected retryCerts(): void {
    void this.store.loadCerts();
  }

  protected retry(): void {
    void this.store.load();
  }

  protected statusLabel(status: string): string {
    return status === 'published'
      ? this.lang.t('admin.examAuthoring.statusPublished')
      : this.lang.t('admin.examAuthoring.statusDraft');
  }

  // ── Dialog ─────────────────────────────────────────────────────────────

  protected openCreate(): void {
    this.store.clearActionError();
    this.editingId.set(null);
    this.formError.set(null);
    this.form.reset({ title: '', examOrder: 1, durationMinutes: 60, passingScore: 80 });
    this.dialogOpen.set(true);
  }

  protected openEdit(exam: AdminExam): void {
    this.store.clearActionError();
    this.editingId.set(exam.id);
    this.formError.set(null);
    this.form.reset({
      title: exam.title,
      examOrder: exam.examOrder,
      durationMinutes: exam.durationMinutes,
      passingScore: exam.passingScore,
    });
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void {
    this.store.clearActionError();
    this.dialogOpen.set(false);
  }

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    this.formError.set(null);
    if (this.form.invalid) {
      this.formError.set(this.lang.t('admin.examAuthoring.formError'));
      return;
    }
    const draft: ExamDraft = this.form.getRawValue();
    const ok = await this.store.save(draft, this.editingId() ?? undefined);
    if (ok) this.dialogOpen.set(false);
  }

  // ── Lifecycle actions ────────────────────────────────────────────────────

  protected publish(exam: AdminExam): void {
    void this.store.publish(exam.id);
  }

  protected unpublish(exam: AdminExam): void {
    void this.store.unpublish(exam.id);
  }

  protected askDelete(exam: AdminExam): void {
    this.store.clearActionError();
    this.pendingDelete.set(exam);
  }

  protected cancelDelete(): void {
    this.store.clearActionError();
    this.pendingDelete.set(null);
  }

  protected async confirmDelete(): Promise<void> {
    const pending = this.pendingDelete();
    if (!pending) return;
    const ok = await this.store.remove(pending.id);
    if (ok) this.pendingDelete.set(null);
  }
}

export default AdminExamAuthoringPage;
