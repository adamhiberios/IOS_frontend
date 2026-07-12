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
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthStore } from '@core/auth';
import { LanguageService } from '@core/i18n';
import { Button, Input as IosInput, Select, type SelectOption } from '@ui';

import {
  type ExamQuestion,
  type ExamQuestionType,
  type QuestionDraft,
  isExamQuestionType,
} from '../data-access/exam-authoring.model';
import { AdminExamQuestionsStore } from '../data-access/exam-questions.store';

/** One option row in the editor form. */
type OptionGroup = FormGroup<{ optionText: FormControl<string> }>;

/**
 * `Validators.required` wrapped as a call — the `FormArray` + number controls
 * degrade the form-builder overload inference enough that the type-aware
 * `unbound-method` lint rule loses the bare reference's `ValidatorFn` context.
 */
const required: ValidatorFn = (control) => Validators.required(control);

/**
 * Admin exam question editor (`/admin/exams/:examId`, backend-analysis §6.5).
 *
 * Loads one exam's authoring view and manages its questions: add / edit (an
 * inline dialog with a dynamic option set — ≥2 options, exactly one correct) and
 * delete. Question CRUD is DRAFT-only (the backend 409s on published exams — the
 * page shows a read-only view + hint then). A student-view preview toggle hides
 * the correct-answer markers. Server state lives in {@link AdminExamQuestionsStore}.
 */
@Component({
  selector: 'ios-admin-exam-questions-page',
  imports: [ReactiveFormsModule, RouterLink, IosInput, Select, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <a routerLink="/admin/exams" class="text-sm text-ios-brand-primary underline">
        {{ lang.t('admin.examQuestions.back') }}
      </a>

      @if (store.error() && !store.exam()) {
        <div class="mt-4 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p class="text-sm text-red-700">{{ store.error() }}</p>
          <ios-button class="mt-3 inline-block" variant="secondary" (clicked)="retry()">
            {{ lang.t('admin.examQuestions.retry') }}
          </ios-button>
        </div>
      } @else if (store.loading() && !store.exam()) {
        <p class="mt-6 text-sm text-gray-500 text-center" role="status" aria-live="polite">
          {{ lang.t('admin.examQuestions.loading') }}
        </p>
      } @else if (store.exam(); as exam) {
        <header class="mt-4 mb-6 flex items-start justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-bold text-ios-brand-dark">{{ exam.title }}</h1>
              <span
                class="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                [class.bg-green-50]="exam.status === 'published'"
                [class.text-green-700]="exam.status === 'published'"
                [class.bg-amber-50]="exam.status === 'draft'"
                [class.text-amber-700]="exam.status === 'draft'"
              >
                {{
                  exam.status === 'published'
                    ? lang.t('admin.examQuestions.statusPublished')
                    : lang.t('admin.examQuestions.statusDraft')
                }}
              </span>
            </div>
            <p class="text-sm text-gray-500 mt-1">
              #{{ exam.examOrder }} · {{ exam.durationMinutes }}
              {{ lang.t('admin.examQuestions.minutes') }} · {{ exam.passingScore }}% ·
              {{ store.questions().length }} {{ lang.t('admin.examQuestions.questions') }}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            @if (canManage() && !preview()) {
              <ios-button variant="secondary" (clicked)="openTranslations()">
                {{ lang.t('admin.examQuestions.translations') }}
              </ios-button>
            }
            @if (store.questions().length > 0) {
              <ios-button variant="secondary" (clicked)="togglePreview()">
                {{
                  preview()
                    ? lang.t('admin.examQuestions.exitPreview')
                    : lang.t('admin.examQuestions.preview')
                }}
              </ios-button>
            }
            @if (canManage() && store.isDraft() && !preview()) {
              <ios-button variant="primary" (clicked)="openCreate()">
                {{ lang.t('admin.examQuestions.new') }}
              </ios-button>
            }
          </div>
        </header>

        @if (!store.isDraft()) {
          <div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p class="text-sm text-amber-800">{{ lang.t('admin.examQuestions.publishedNote') }}</p>
          </div>
        }

        @if (store.isEmpty()) {
          <div class="rounded-xl border border-gray-200 bg-white p-10 text-center">
            <p class="text-sm text-gray-500">{{ lang.t('admin.examQuestions.empty') }}</p>
          </div>
        } @else {
          <ol class="flex flex-col gap-3">
            @for (q of store.questions(); track q.id) {
              <li class="rounded-xl border border-gray-200 bg-white p-4">
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-xs text-gray-400">#{{ q.position }}</span>
                      <span class="text-xs uppercase tracking-wide text-gray-400">
                        {{ typeLabel(q.questionType) }}
                      </span>
                      <span class="text-xs text-gray-400">
                        · {{ q.marks }} {{ lang.t('admin.examQuestions.marks') }}
                      </span>
                    </div>
                    <p class="font-medium text-ios-brand-dark">{{ q.questionText }}</p>
                    <ul class="mt-2 flex flex-col gap-1">
                      @for (o of q.options; track o.id) {
                        <li class="flex items-center gap-2 text-sm">
                          @if (!preview()) {
                            <span
                              class="inline-flex items-center justify-center w-4 h-4 rounded-full text-xs"
                              [class.bg-green-100]="o.isCorrect"
                              [class.text-green-700]="o.isCorrect"
                              [class.bg-gray-100]="!o.isCorrect"
                              [class.text-transparent]="!o.isCorrect"
                              [attr.aria-label]="
                                o.isCorrect ? lang.t('admin.examQuestions.correct') : null
                              "
                            >
                              ✓
                            </span>
                          } @else {
                            <span
                              class="inline-block w-4 h-4 rounded-full border border-gray-300"
                            ></span>
                          }
                          <span
                            [class.font-medium]="o.isCorrect && !preview()"
                            [class.text-gray-600]="!(o.isCorrect && !preview())"
                          >
                            {{ o.optionText }}
                          </span>
                        </li>
                      }
                    </ul>
                  </div>
                  @if (canManage() && store.isDraft() && !preview()) {
                    <div class="flex shrink-0 flex-col items-end gap-2">
                      <button
                        type="button"
                        (click)="openEdit(q)"
                        class="text-sm text-ios-brand-primary underline"
                      >
                        {{ lang.t('admin.examQuestions.edit') }}
                      </button>
                      <button
                        type="button"
                        (click)="askDelete(q)"
                        class="text-sm text-red-600 hover:text-red-700"
                      >
                        {{ lang.t('admin.examQuestions.delete') }}
                      </button>
                    </div>
                  }
                </div>
              </li>
            }
          </ol>
        }

        @if (store.actionError() && !dialogOpen() && !pendingDelete() && !translationsOpen()) {
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
          aria-labelledby="q-dialog-title"
        >
          <div
            class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <h2 id="q-dialog-title" class="text-lg font-semibold text-ios-brand-dark mb-4">
              {{
                editingId()
                  ? lang.t('admin.examQuestions.editTitle')
                  : lang.t('admin.examQuestions.createTitle')
              }}
            </h2>

            <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
              <div>
                <label
                  for="q-text"
                  class="block text-sm font-heading font-medium text-ios-brand-dark mb-1"
                >
                  {{ lang.t('admin.examQuestions.questionLabel') }}
                </label>
                <textarea
                  id="q-text"
                  rows="3"
                  [formControl]="form.controls.questionText"
                  [placeholder]="lang.t('admin.examQuestions.questionPlaceholder')"
                  class="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
                ></textarea>
                @if (showError(form.controls.questionText)) {
                  <p class="mt-1 text-xs text-ios-brand-primary" role="alert">
                    {{ lang.t('admin.examQuestions.questionError') }}
                  </p>
                }
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ios-select
                  id="q-type"
                  [label]="lang.t('admin.examQuestions.typeLabel')"
                  [options]="typeOptions()"
                  [control]="form.controls.questionType"
                />
                <div>
                  <label
                    for="q-pos"
                    class="block text-sm font-heading font-medium text-ios-brand-dark mb-1"
                  >
                    {{ lang.t('admin.examQuestions.positionLabel') }}
                  </label>
                  <input
                    id="q-pos"
                    type="number"
                    min="0"
                    [formControl]="form.controls.position"
                    class="w-full h-12 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
                  />
                </div>
                <div>
                  <label
                    for="q-marks"
                    class="block text-sm font-heading font-medium text-ios-brand-dark mb-1"
                  >
                    {{ lang.t('admin.examQuestions.marksLabel') }}
                  </label>
                  <input
                    id="q-marks"
                    type="number"
                    min="1"
                    [formControl]="form.controls.marks"
                    class="w-full h-12 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
                  />
                </div>
              </div>

              <fieldset>
                <legend class="text-sm font-heading font-medium text-ios-brand-dark mb-1">
                  {{ lang.t('admin.examQuestions.optionsLabel') }}
                </legend>
                <p class="text-xs text-gray-500 mb-2">
                  {{ lang.t('admin.examQuestions.optionsHint') }}
                </p>
                <div class="flex flex-col gap-2">
                  @for (opt of options.controls; track $index) {
                    <div class="flex items-center gap-2">
                      <input
                        type="radio"
                        name="q-correct"
                        [checked]="correctIndex() === $index"
                        (change)="setCorrect($index)"
                        [attr.aria-label]="lang.t('admin.examQuestions.markCorrect')"
                        class="shrink-0 accent-ios-brand-primary"
                      />
                      <div class="grow">
                        <ios-input
                          [id]="'q-opt-' + $index"
                          label=""
                          type="text"
                          [control]="opt.controls.optionText"
                          [placeholder]="lang.t('admin.examQuestions.optionPlaceholder')"
                        />
                      </div>
                      <button
                        type="button"
                        (click)="removeOption($index)"
                        [disabled]="options.length <= 2"
                        class="shrink-0 text-sm text-red-600 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        [attr.aria-label]="lang.t('admin.examQuestions.removeOption')"
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
                  {{ lang.t('admin.examQuestions.addOption') }}
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
                  {{ lang.t('admin.examQuestions.cancel') }}
                </button>
                <ios-button
                  type="submit"
                  variant="primary"
                  [loading]="store.actionPendingId() === (editingId() ?? 'new')"
                >
                  {{ lang.t('admin.examQuestions.save') }}
                </ios-button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Title translations -->
      @if (translationsOpen()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="q-tr-title"
        >
          <div
            class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <h2 id="q-tr-title" class="text-lg font-semibold text-ios-brand-dark mb-1">
              {{ lang.t('admin.examQuestions.translationsTitle') }}
            </h2>
            <p class="text-xs text-gray-500 mb-4">
              {{ lang.t('admin.examQuestions.translationsHint') }}
            </p>

            <form
              [formGroup]="translationsForm"
              (ngSubmit)="submitTranslations()"
              class="flex flex-col gap-4"
            >
              <div class="rounded-lg bg-gray-50 border border-gray-200 px-4 py-2">
                <p class="text-xs text-gray-500">
                  {{ lang.t('admin.examQuestions.canonicalLabel') }}
                </p>
                <p class="text-sm text-ios-brand-dark">{{ store.exam()?.title }}</p>
              </div>
              <ios-input
                id="q-tr-ar"
                [label]="localeLabel('ar')"
                type="text"
                [control]="translationsForm.controls.ar"
                [placeholder]="store.exam()?.title ?? ''"
              />
              <ios-input
                id="q-tr-fr"
                [label]="localeLabel('fr')"
                type="text"
                [control]="translationsForm.controls.fr"
                [placeholder]="store.exam()?.title ?? ''"
              />

              @if (store.actionError()) {
                <p class="text-sm text-red-600" role="alert">{{ store.actionError() }}</p>
              }

              <div class="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  (click)="closeTranslations()"
                  class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  {{ lang.t('admin.examQuestions.cancel') }}
                </button>
                <ios-button
                  type="submit"
                  variant="primary"
                  [loading]="store.actionPendingId() === 'translations'"
                >
                  {{ lang.t('admin.examQuestions.save') }}
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
          aria-labelledby="q-delete-title"
        >
          <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="q-delete-title" class="text-lg font-semibold text-ios-brand-dark">
              {{ lang.t('admin.examQuestions.confirmTitle') }}
            </h2>
            <p class="mt-2 text-sm text-gray-600">
              {{ lang.t('admin.examQuestions.confirmBody') }}
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
                {{ lang.t('admin.examQuestions.cancel') }}
              </button>
              <ios-button
                variant="danger"
                [loading]="store.actionPendingId() === pending.id"
                (clicked)="confirmDelete()"
              >
                {{ lang.t('admin.examQuestions.delete') }}
              </ios-button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminExamQuestionsPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly store = inject(AdminExamQuestionsStore);
  protected readonly lang = inject(LanguageService);

  /** Question CRUD gate — backend allows content_creator + learning_admin. */
  protected readonly canManage = computed(
    () =>
      this.auth.hasRole('super_admin') ||
      this.auth.hasAnyRole(['content_creator', 'learning_admin']),
  );

  protected readonly preview = signal(false);
  protected readonly dialogOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly correctIndex = signal(0);
  protected readonly optionsError = signal<string | null>(null);
  protected readonly pendingDelete = signal<ExamQuestion | null>(null);
  protected readonly translationsOpen = signal(false);

  /** Non-English app locales get a translatable exam title (`en` is canonical). */
  private readonly localeLabels = new Map<string, string>(
    this.lang.supportedLocales.map((l) => [l.code, l.label]),
  );

  protected readonly translationsForm = this.fb.group({
    ar: this.fb.control(''),
    fr: this.fb.control(''),
  });

  protected readonly form = this.fb.group({
    questionText: this.fb.control('', { validators: [required] }),
    questionType: this.fb.control('mcq'),
    position: this.fb.control(0, { validators: [Validators.min(0)] }),
    marks: this.fb.control(1, { validators: [Validators.min(1)] }),
    options: this.fb.array([this.newOption(), this.newOption()]),
  });

  protected readonly typeOptions = computed<SelectOption[]>(() => [
    { value: 'mcq', label: this.lang.t('admin.examQuestions.typeMcq') },
    { value: 'true_false', label: this.lang.t('admin.examQuestions.typeTrueFalse') },
  ]);

  get options(): FormArray<OptionGroup> {
    return this.form.controls.options;
  }

  ngOnInit(): void {
    const examId = this.route.snapshot.paramMap.get('examId') ?? '';
    void this.store.load(examId);
  }

  protected retry(): void {
    void this.store.reload();
  }

  protected togglePreview(): void {
    this.preview.update((v) => !v);
  }

  protected localeLabel(code: string): string {
    return this.localeLabels.get(code) ?? code;
  }

  // ── Title translations ─────────────────────────────────────────────────

  protected openTranslations(): void {
    this.store.clearActionError();
    const t = this.store.exam()?.translations ?? {};
    this.translationsForm.reset({ ar: t['ar'] ?? '', fr: t['fr'] ?? '' });
    this.translationsOpen.set(true);
  }

  protected closeTranslations(): void {
    this.store.clearActionError();
    this.translationsOpen.set(false);
  }

  protected async submitTranslations(): Promise<void> {
    const ok = await this.store.saveTranslations(this.translationsForm.getRawValue());
    if (ok) this.translationsOpen.set(false);
  }

  protected typeLabel(type: ExamQuestionType): string {
    return type === 'true_false'
      ? this.lang.t('admin.examQuestions.typeTrueFalse')
      : this.lang.t('admin.examQuestions.typeMcq');
  }

  protected showError(control: FormControl<string>): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  // ── Dialog ─────────────────────────────────────────────────────────────

  protected openCreate(): void {
    this.store.clearActionError();
    this.editingId.set(null);
    this.resetForm('', 'mcq', this.store.questions().length, 1, ['', '']);
    this.correctIndex.set(0);
    this.optionsError.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(q: ExamQuestion): void {
    this.store.clearActionError();
    this.editingId.set(q.id);
    this.resetForm(
      q.questionText,
      q.questionType,
      q.position,
      q.marks,
      q.options.map((o) => o.optionText),
    );
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
        this.optionsError.set(this.lang.t('admin.examQuestions.optionTextError'));
      }
      return;
    }
    if (options.length < 2) {
      this.optionsError.set(this.lang.t('admin.examQuestions.minOptionsError'));
      return;
    }

    const raw = this.form.getRawValue();
    const questionType: ExamQuestionType = isExamQuestionType(raw.questionType)
      ? raw.questionType
      : 'mcq';
    const correct = this.correctIndex();
    const draft: QuestionDraft = {
      questionText: raw.questionText.trim(),
      questionType,
      position: raw.position,
      marks: raw.marks,
      options: options.map((optionText, i) => ({ optionText, isCorrect: i === correct })),
    };

    const ok = await this.store.save(draft, this.editingId() ?? undefined);
    if (ok) this.dialogOpen.set(false);
  }

  // ── Delete ─────────────────────────────────────────────────────────────

  protected askDelete(q: ExamQuestion): void {
    this.store.clearActionError();
    this.pendingDelete.set(q);
  }

  protected cancelDelete(): void {
    this.store.clearActionError();
    this.pendingDelete.set(null);
  }

  protected async confirmDelete(): Promise<void> {
    const pending = this.pendingDelete();
    if (!pending) return;
    const ok = await this.store.deleteQuestion(pending.id);
    if (ok) this.pendingDelete.set(null);
  }

  // ── Form helpers ─────────────────────────────────────────────────────────

  private newOption(text = ''): OptionGroup {
    return this.fb.group({ optionText: this.fb.control(text, { validators: [required] }) });
  }

  private resetForm(
    questionText: string,
    questionType: ExamQuestionType,
    position: number,
    marks: number,
    optionTexts: readonly string[],
  ): void {
    this.form.controls.questionText.setValue(questionText);
    this.form.controls.questionType.setValue(questionType);
    this.form.controls.position.setValue(position);
    this.form.controls.marks.setValue(marks);
    this.options.clear();
    const texts = optionTexts.length >= 2 ? optionTexts : ['', ''];
    for (const t of texts) this.options.push(this.newOption(t));
    this.form.markAsUntouched();
  }
}

export default AdminExamQuestionsPage;
