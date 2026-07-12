import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  type FormArray,
  type FormControl,
  type FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type ValidatorFn,
  Validators,
} from '@angular/forms';

import { AuthStore } from '@core/auth';
import { LanguageService } from '@core/i18n';
import { Button, Input as IosInput, Select, type SelectOption } from '@ui';

import {
  type MockQuestion,
  type MockQuestionDraft,
  type MockQuestionType,
  isMockQuestionType,
} from '../data-access/mock.model';
import { AdminMockQuestionsStore } from '../data-access/mock.store';

/** One option row in the editor form. */
type OptionGroup = FormGroup<{ optionText: FormControl<string> }>;

/**
 * `Validators.required` wrapped as a call. The presence of a `FormArray` in this
 * component degrades the form-builder overload inference enough that the
 * type-aware `unbound-method` lint rule loses the bare `Validators.required`
 * reference's `ValidatorFn` context; wrapping it in an arrow keeps it a call.
 */
const required: ValidatorFn = (control) => Validators.required(control);

/**
 * Admin mock questions (`/admin/mock`) — per-certificate mock-question bank
 * authoring (`GET/POST/PATCH/DELETE /admin/mock*`, backend-analysis §6.6).
 *
 * Pick a certificate, then manage its (unpaginated) question bank: create /
 * edit (an inline dialog with a dynamic option set — ≥2 options, exactly one
 * correct), deactivate (soft-delete) and reactivate. All server state + actions
 * live in {@link AdminMockQuestionsStore}; this component owns only the forms
 * and dialog state. Row actions are role-gated (the backend still enforces).
 */
@Component({
  selector: 'ios-admin-mock-questions-page',
  imports: [ReactiveFormsModule, IosInput, Select, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <header class="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-ios-brand-dark">
            {{ lang.t('admin.mock.title') }}
          </h1>
          <p class="text-sm text-gray-500 mt-1">{{ lang.t('admin.mock.subtitle') }}</p>
        </div>
        @if (canManage() && store.certId()) {
          <ios-button variant="primary" (clicked)="openCreate()">
            {{ lang.t('admin.mock.new') }}
          </ios-button>
        }
      </header>

      <!-- Certificate picker -->
      <div class="mb-6">
        @if (store.certsError()) {
          <div class="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
            <p class="text-sm text-red-700">{{ store.certsError() }}</p>
            <ios-button class="mt-2 inline-block" variant="secondary" (clicked)="retryCerts()">
              {{ lang.t('admin.mock.retry') }}
            </ios-button>
          </div>
        } @else {
          <ios-select
            id="mock-cert"
            [label]="lang.t('admin.mock.certLabel')"
            [options]="certOptions()"
            [placeholder]="
              store.certsLoading()
                ? lang.t('admin.mock.certsLoading')
                : lang.t('admin.mock.certPlaceholder')
            "
            [control]="certControl"
            (selected)="onCertChange($event)"
          />
        }
      </div>

      @if (!store.certId()) {
        <div class="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p class="text-sm text-gray-500">{{ lang.t('admin.mock.pickCert') }}</p>
        </div>
      } @else if (store.error()) {
        <div class="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p class="text-sm text-red-700">{{ store.error() }}</p>
          <ios-button class="mt-3 inline-block" variant="secondary" (clicked)="retry()">
            {{ lang.t('admin.mock.retry') }}
          </ios-button>
        </div>
      } @else if (store.loading()) {
        <p class="text-sm text-gray-500 py-10 text-center" role="status" aria-live="polite">
          {{ lang.t('admin.mock.loading') }}
        </p>
      } @else if (store.isEmpty()) {
        <div class="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p class="text-sm text-gray-500">{{ lang.t('admin.mock.empty') }}</p>
        </div>
      } @else {
        <ul class="flex flex-col gap-3">
          @for (q of store.questions(); track q.id) {
            <li
              class="rounded-xl border border-gray-200 bg-white p-4"
              [class.opacity-60]="!q.active"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs text-gray-400">#{{ q.position }}</span>
                    <span class="text-xs uppercase tracking-wide text-gray-400">
                      {{ typeLabel(q.questionType) }}
                    </span>
                    @if (!q.active) {
                      <span
                        class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500"
                      >
                        {{ lang.t('admin.mock.inactive') }}
                      </span>
                    }
                  </div>
                  <p class="font-medium text-ios-brand-dark">{{ q.questionText }}</p>
                  <ul class="mt-2 flex flex-col gap-1">
                    @for (o of q.options; track o.id) {
                      <li class="flex items-center gap-2 text-sm">
                        <span
                          class="inline-flex items-center justify-center w-4 h-4 rounded-full text-xs"
                          [class.bg-green-100]="o.isCorrect"
                          [class.text-green-700]="o.isCorrect"
                          [class.bg-gray-100]="!o.isCorrect"
                          [class.text-transparent]="!o.isCorrect"
                          [attr.aria-hidden]="!o.isCorrect"
                          [attr.aria-label]="o.isCorrect ? lang.t('admin.mock.correct') : null"
                        >
                          ✓
                        </span>
                        <span
                          [class.font-medium]="o.isCorrect"
                          [class.text-gray-600]="!o.isCorrect"
                        >
                          {{ o.optionText }}
                        </span>
                      </li>
                    }
                  </ul>
                </div>
                @if (canManage()) {
                  <div class="flex shrink-0 flex-col items-end gap-2">
                    <button
                      type="button"
                      (click)="openEdit(q)"
                      class="text-sm text-ios-brand-primary underline"
                    >
                      {{ lang.t('admin.mock.edit') }}
                    </button>
                    @if (q.active) {
                      @if (canDeactivate()) {
                        <button
                          type="button"
                          (click)="askDeactivate(q)"
                          class="text-sm text-red-600 hover:text-red-700"
                        >
                          {{ lang.t('admin.mock.deactivate') }}
                        </button>
                      }
                    } @else {
                      <button
                        type="button"
                        [disabled]="store.actionPendingId() === q.id"
                        (click)="reactivate(q)"
                        class="text-sm text-ios-brand-primary hover:underline disabled:opacity-50"
                      >
                        {{ lang.t('admin.mock.reactivate') }}
                      </button>
                    }
                  </div>
                }
              </div>
            </li>
          }
        </ul>

        @if (store.actionError() && !dialogOpen() && !pendingDeactivate()) {
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
          aria-labelledby="mq-dialog-title"
        >
          <div
            class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <h2 id="mq-dialog-title" class="text-lg font-semibold text-ios-brand-dark mb-4">
              {{ editingId() ? lang.t('admin.mock.editTitle') : lang.t('admin.mock.createTitle') }}
            </h2>

            <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
              <div>
                <label
                  for="mq-text"
                  class="block text-sm font-heading font-medium text-ios-brand-dark mb-1"
                >
                  {{ lang.t('admin.mock.questionLabel') }}
                </label>
                <textarea
                  id="mq-text"
                  rows="3"
                  [formControl]="form.controls.questionText"
                  [placeholder]="lang.t('admin.mock.questionPlaceholder')"
                  class="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
                ></textarea>
                @if (showError(form.controls.questionText)) {
                  <p class="mt-1 text-xs text-ios-brand-primary" role="alert">
                    {{ lang.t('admin.mock.questionError') }}
                  </p>
                }
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ios-select
                  id="mq-type"
                  [label]="lang.t('admin.mock.typeLabel')"
                  [options]="typeOptions()"
                  [control]="form.controls.questionType"
                />
                <div>
                  <label
                    for="mq-pos"
                    class="block text-sm font-heading font-medium text-ios-brand-dark mb-1"
                  >
                    {{ lang.t('admin.mock.positionLabel') }}
                  </label>
                  <input
                    id="mq-pos"
                    type="number"
                    min="0"
                    [formControl]="form.controls.position"
                    class="w-full h-12 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
                  />
                </div>
              </div>

              <fieldset>
                <legend class="text-sm font-heading font-medium text-ios-brand-dark mb-1">
                  {{ lang.t('admin.mock.optionsLabel') }}
                </legend>
                <p class="text-xs text-gray-500 mb-2">{{ lang.t('admin.mock.optionsHint') }}</p>
                <div class="flex flex-col gap-2">
                  @for (opt of options.controls; track $index) {
                    <div class="flex items-center gap-2">
                      <input
                        type="radio"
                        name="mq-correct"
                        [checked]="correctIndex() === $index"
                        (change)="setCorrect($index)"
                        [attr.aria-label]="lang.t('admin.mock.markCorrect')"
                        class="shrink-0 accent-ios-brand-primary"
                      />
                      <div class="grow">
                        <ios-input
                          [id]="'mq-opt-' + $index"
                          label=""
                          type="text"
                          [control]="opt.controls.optionText"
                          [placeholder]="lang.t('admin.mock.optionPlaceholder')"
                        />
                      </div>
                      <button
                        type="button"
                        (click)="removeOption($index)"
                        [disabled]="options.length <= 2"
                        class="shrink-0 text-sm text-red-600 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        [attr.aria-label]="lang.t('admin.mock.removeOption')"
                      >
                        ✕
                      </button>
                    </div>
                  }
                </div>
                <button
                  type="button"
                  (click)="addOption()"
                  class="mt-2 text-sm text-ios-brand-primary hover:underline"
                >
                  {{ lang.t('admin.mock.addOption') }}
                </button>
                @if (optionsError()) {
                  <p class="mt-1 text-xs text-ios-brand-primary" role="alert">
                    {{ optionsError() }}
                  </p>
                }
              </fieldset>

              @if (store.actionError()) {
                <p class="text-sm text-red-600" role="alert">{{ store.actionError() }}</p>
              }

              <div class="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  (click)="closeDialog()"
                  class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  {{ lang.t('admin.mock.cancel') }}
                </button>
                <ios-button
                  type="submit"
                  variant="primary"
                  [loading]="store.actionPendingId() === (editingId() ?? 'new')"
                >
                  {{ lang.t('admin.mock.save') }}
                </ios-button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Deactivate confirmation -->
      @if (pendingDeactivate(); as pending) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mq-deactivate-title"
        >
          <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="mq-deactivate-title" class="text-lg font-semibold text-ios-brand-dark">
              {{ lang.t('admin.mock.confirmTitle') }}
            </h2>
            <p class="mt-2 text-sm text-gray-600">{{ lang.t('admin.mock.confirmBody') }}</p>
            @if (store.actionError()) {
              <p class="mt-3 text-sm text-red-600" role="alert">{{ store.actionError() }}</p>
            }
            <div class="mt-5 flex justify-end gap-3">
              <button
                type="button"
                (click)="cancelDeactivate()"
                class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {{ lang.t('admin.mock.cancel') }}
              </button>
              <ios-button
                variant="danger"
                [loading]="store.actionPendingId() === pending.id"
                (clicked)="confirmDeactivate()"
              >
                {{ lang.t('admin.mock.deactivate') }}
              </ios-button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminMockQuestionsPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthStore);

  protected readonly store = inject(AdminMockQuestionsStore);
  protected readonly lang = inject(LanguageService);

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

  protected readonly certControl = this.fb.control('');
  protected readonly certOptions = computed<SelectOption[]>(() =>
    this.store.certs().map((c) => ({ value: c.id, label: c.label })),
  );

  protected readonly dialogOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly correctIndex = signal(0);
  protected readonly optionsError = signal<string | null>(null);
  protected readonly pendingDeactivate = signal<MockQuestion | null>(null);

  protected readonly form = this.fb.group({
    questionText: this.fb.control('', { validators: [required] }),
    questionType: this.fb.control('mcq'),
    position: this.fb.control(0, { validators: [Validators.min(0)] }),
    options: this.fb.array([this.newOption(), this.newOption()]),
  });

  protected readonly typeOptions = computed<SelectOption[]>(() => [
    { value: 'mcq', label: this.lang.t('admin.mock.typeMcq') },
    { value: 'true_false', label: this.lang.t('admin.mock.typeTrueFalse') },
  ]);

  get options(): FormArray<OptionGroup> {
    return this.form.controls.options;
  }

  ngOnInit(): void {
    void this.store.loadCerts();
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

  protected typeLabel(type: MockQuestionType): string {
    return type === 'true_false'
      ? this.lang.t('admin.mock.typeTrueFalse')
      : this.lang.t('admin.mock.typeMcq');
  }

  protected showError(control: FormControl<string>): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  // ── Dialog ─────────────────────────────────────────────────────────────

  protected openCreate(): void {
    this.store.clearActionError();
    this.editingId.set(null);
    this.resetForm('', 'mcq', 0, ['', '']);
    this.correctIndex.set(0);
    this.optionsError.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(q: MockQuestion): void {
    this.store.clearActionError();
    this.editingId.set(q.id);
    const texts = q.options.map((o) => o.optionText);
    this.resetForm(q.questionText, q.questionType, q.position, texts);
    const correct = q.options.findIndex((o) => o.isCorrect);
    this.correctIndex.set(correct >= 0 ? correct : 0);
    this.optionsError.set(null);
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void {
    this.store.clearActionError();
    this.dialogOpen.set(false);
  }

  protected addOption(): void {
    this.options.push(this.newOption());
  }

  protected removeOption(index: number): void {
    if (this.options.length <= 2) return;
    this.options.removeAt(index);
    const current = this.correctIndex();
    if (index === current) this.correctIndex.set(0);
    else if (index < current) this.correctIndex.set(current - 1);
  }

  protected setCorrect(index: number): void {
    this.correctIndex.set(index);
  }

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    this.optionsError.set(null);

    const options = this.options.controls.map((g) => g.controls.optionText.value.trim());
    if (this.form.controls.questionText.invalid || options.some((t) => t.length === 0)) {
      if (options.some((t) => t.length === 0)) {
        this.optionsError.set(this.lang.t('admin.mock.optionTextError'));
      }
      return;
    }
    if (options.length < 2) {
      this.optionsError.set(this.lang.t('admin.mock.minOptionsError'));
      return;
    }

    const raw = this.form.getRawValue();
    const questionType: MockQuestionType = isMockQuestionType(raw.questionType)
      ? raw.questionType
      : 'mcq';
    const correct = this.correctIndex();
    const draft: MockQuestionDraft = {
      questionText: raw.questionText.trim(),
      questionType,
      position: raw.position,
      options: options.map((optionText, i) => ({ optionText, isCorrect: i === correct })),
    };

    const ok = await this.store.save(draft, this.editingId() ?? undefined);
    if (ok) this.dialogOpen.set(false);
  }

  // ── Deactivate / reactivate ──────────────────────────────────────────────

  protected askDeactivate(q: MockQuestion): void {
    this.store.clearActionError();
    this.pendingDeactivate.set(q);
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

  protected reactivate(q: MockQuestion): void {
    void this.store.reactivate(q.id);
  }

  // ── Form helpers ─────────────────────────────────────────────────────────

  private newOption(text = ''): OptionGroup {
    return this.fb.group({
      optionText: this.fb.control(text, { validators: [required] }),
    });
  }

  /** Reset the editor form to the given values, rebuilding the option rows. */
  private resetForm(
    questionText: string,
    questionType: MockQuestionType,
    position: number,
    optionTexts: readonly string[],
  ): void {
    this.form.controls.questionText.setValue(questionText);
    this.form.controls.questionType.setValue(questionType);
    this.form.controls.position.setValue(position);
    this.options.clear();
    const texts = optionTexts.length >= 2 ? optionTexts : ['', ''];
    for (const t of texts) this.options.push(this.newOption(t));
    this.form.markAsUntouched();
  }
}

export default AdminMockQuestionsPage;
