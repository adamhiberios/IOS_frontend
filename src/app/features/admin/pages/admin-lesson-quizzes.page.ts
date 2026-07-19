import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  type FormArray,
  type FormControl,
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
  QUIZ_MIN_OPTIONS,
  type QuestionDraft,
  type Quiz,
  type QuizQuestion,
  isMcq,
} from '../data-access/quiz.model';
import { AdminQuizStore } from '../data-access/quiz.store';

/** `Validators.required` wrapped as a call (FormArray + mixed controls, unbound-method rule). */
const required: ValidatorFn = (control) => Validators.required(control);

type QuestionMode = 'mcq' | 'free';

/** Which quiz/question the question dialog targets. */
interface QuestionTarget {
  readonly quizId: string;
  readonly question: QuizQuestion | null;
}

/**
 * Lesson-quiz authoring (`/admin/lessons/:lessonId/quizzes`, BE-I-06 / B5).
 * Reached from the curriculum page. Manage a lesson's quizzes and their
 * questions (MCQ or free-text) — authoring view shows the correct answer.
 * Styled to match the admin mock-question authoring page.
 *
 * Create/edit quiz + add/edit question: content_creator / learning_admin.
 * Deactivate quiz + delete question: learning_admin only (backend-enforced).
 */
@Component({
  selector: 'ios-admin-lesson-quizzes-page',
  imports: [ReactiveFormsModule, RouterLink, IosInput, Select, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <a routerLink="/admin/curriculum" class="text-sm text-ios-brand-primary underline">
        ← {{ lang.t('admin.quiz.back') }}
      </a>
      <header class="mt-2 mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-ios-brand-dark">{{ lang.t('admin.quiz.title') }}</h1>
          @if (lessonTitle()) {
            <p class="text-sm text-gray-500 mt-1">{{ lessonTitle() }}</p>
          }
        </div>
        @if (canAuthor()) {
          <ios-button variant="primary" (clicked)="openCreateQuiz()">
            {{ lang.t('admin.quiz.newQuiz') }}
          </ios-button>
        }
      </header>

      @if (store.error()) {
        <div class="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p class="text-sm text-red-700">{{ store.error() }}</p>
          <ios-button class="mt-3 inline-block" variant="secondary" (clicked)="retry()">
            {{ lang.t('admin.quiz.retry') }}
          </ios-button>
        </div>
      } @else if (store.loading()) {
        <p class="text-sm text-gray-500 py-10 text-center" role="status" aria-live="polite">
          {{ lang.t('admin.quiz.loading') }}
        </p>
      } @else if (store.isEmpty()) {
        <div class="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p class="text-sm text-gray-500">{{ lang.t('admin.quiz.empty') }}</p>
        </div>
      } @else {
        <div class="flex flex-col gap-4">
          @for (qz of store.quizzes(); track qz.id) {
            <article
              class="rounded-xl border border-gray-200 bg-white p-4"
              [class.opacity-60]="!qz.active"
            >
              <!-- Quiz header -->
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <h2 class="text-base font-semibold text-ios-brand-dark truncate">
                      {{ qz.title }}
                    </h2>
                    @if (!qz.active) {
                      <span
                        class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500"
                      >
                        {{ lang.t('admin.quiz.quizInactive') }}
                      </span>
                    }
                  </div>
                  <p class="text-xs text-gray-500">
                    {{ lang.t('admin.quiz.questionsCount', { count: qz.questions.length }) }}
                  </p>
                </div>
                @if (canAuthor()) {
                  <div class="flex shrink-0 flex-col items-end gap-2">
                    <button
                      type="button"
                      (click)="openRenameQuiz(qz)"
                      class="text-sm text-ios-brand-primary underline"
                    >
                      {{ lang.t('admin.quiz.editQuiz') }}
                    </button>
                    @if (qz.active) {
                      @if (canDelete()) {
                        <button
                          type="button"
                          (click)="askDeactivateQuiz(qz)"
                          class="text-sm text-red-600 hover:text-red-700"
                        >
                          {{ lang.t('admin.quiz.deactivateQuiz') }}
                        </button>
                      }
                    } @else {
                      <button
                        type="button"
                        [disabled]="store.actionPendingId() === qz.id"
                        (click)="reactivateQuiz(qz)"
                        class="text-sm text-ios-brand-primary hover:underline disabled:opacity-50"
                      >
                        {{ lang.t('admin.quiz.reactivateQuiz') }}
                      </button>
                    }
                  </div>
                }
              </div>

              <!-- Questions -->
              <ul class="mt-4 flex flex-col gap-3">
                @for (q of qz.questions; track q.id) {
                  <li class="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                    <div class="flex items-start justify-between gap-4">
                      <div class="min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                          <span class="text-xs text-gray-400">#{{ q.position }}</span>
                          <span class="text-xs uppercase tracking-wide text-gray-400">
                            {{ typeLabel(q) }}
                          </span>
                        </div>
                        <p class="font-medium text-ios-brand-dark">{{ q.questionText }}</p>
                        @if (mcq(q)) {
                          <ul class="mt-2 flex flex-col gap-1">
                            @for (o of q.options; track o) {
                              <li class="flex items-center gap-2 text-sm">
                                <span
                                  class="inline-flex items-center justify-center w-4 h-4 rounded-full text-xs"
                                  [class.bg-green-100]="o === q.correctAnswer"
                                  [class.text-green-700]="o === q.correctAnswer"
                                  [class.bg-gray-100]="o !== q.correctAnswer"
                                  [class.text-transparent]="o !== q.correctAnswer"
                                  [attr.aria-hidden]="o !== q.correctAnswer"
                                  [attr.aria-label]="
                                    o === q.correctAnswer ? lang.t('admin.quiz.correct') : null
                                  "
                                >
                                  ✓
                                </span>
                                <span
                                  [class.font-medium]="o === q.correctAnswer"
                                  [class.text-gray-600]="o !== q.correctAnswer"
                                >
                                  {{ o }}
                                </span>
                              </li>
                            }
                          </ul>
                        } @else {
                          <p class="mt-2 text-sm text-gray-600">
                            {{ lang.t('admin.quiz.freeTextAnswer', { answer: q.correctAnswer }) }}
                          </p>
                        }
                      </div>
                      @if (canAuthor()) {
                        <div class="flex shrink-0 flex-col items-end gap-2">
                          <button
                            type="button"
                            (click)="openEditQuestion(qz.id, q)"
                            class="text-sm text-ios-brand-primary underline"
                          >
                            {{ lang.t('admin.quiz.edit') }}
                          </button>
                          @if (canDelete()) {
                            <button
                              type="button"
                              [disabled]="store.actionPendingId() === q.id"
                              (click)="askDeleteQuestion(qz.id, q)"
                              class="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                            >
                              {{ lang.t('admin.quiz.delete') }}
                            </button>
                          }
                        </div>
                      }
                    </div>
                  </li>
                } @empty {
                  <li class="text-sm text-gray-400">{{ lang.t('admin.quiz.noQuestions') }}</li>
                }
              </ul>

              @if (canAuthor()) {
                <button
                  type="button"
                  (click)="openAddQuestion(qz.id)"
                  class="mt-3 text-sm text-ios-brand-primary hover:underline"
                >
                  {{ lang.t('admin.quiz.addQuestion') }}
                </button>
              }
            </article>
          }
        </div>

        @if (
          store.actionError() &&
          !quizDialogOpen() &&
          !questionDialogOpen() &&
          !pendingQuizDeactivate() &&
          !pendingQuestionDelete()
        ) {
          <p class="text-sm text-red-600 mt-3 text-center" role="alert">
            {{ store.actionError() }}
          </p>
        }
      }

      <!-- Quiz create / rename dialog -->
      @if (quizDialogOpen()) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quiz-dialog-title"
        >
          <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="quiz-dialog-title" class="text-lg font-semibold text-ios-brand-dark mb-4">
              {{
                editingQuizId()
                  ? lang.t('admin.quiz.editQuizTitle')
                  : lang.t('admin.quiz.createQuizTitle')
              }}
            </h2>
            <form [formGroup]="quizForm" (ngSubmit)="submitQuiz()" class="flex flex-col gap-4">
              <ios-input
                id="quiz-title"
                [label]="lang.t('admin.quiz.quizTitleLabel')"
                type="text"
                [control]="quizForm.controls.title"
                [placeholder]="lang.t('admin.quiz.quizTitlePlaceholder')"
              />
              @if (quizFormError()) {
                <p class="text-xs text-ios-brand-primary" role="alert">{{ quizFormError() }}</p>
              }
              @if (store.actionError()) {
                <p class="text-sm text-red-600" role="alert">{{ store.actionError() }}</p>
              }
              <div class="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  (click)="closeQuizDialog()"
                  class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  {{ lang.t('admin.quiz.cancel') }}
                </button>
                <ios-button
                  type="submit"
                  variant="primary"
                  [loading]="store.actionPendingId() === (editingQuizId() ?? 'new')"
                >
                  {{ lang.t('admin.quiz.save') }}
                </ios-button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Question create / edit dialog -->
      @if (questionDialogOpen()) {
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
                editingQuestionId()
                  ? lang.t('admin.quiz.questionDialogEdit')
                  : lang.t('admin.quiz.questionDialogCreate')
              }}
            </h2>
            <form
              [formGroup]="questionForm"
              (ngSubmit)="submitQuestion()"
              class="flex flex-col gap-4"
            >
              <div>
                <label
                  for="q-text"
                  class="block text-sm font-heading font-medium text-ios-brand-dark mb-1"
                >
                  {{ lang.t('admin.quiz.questionTextLabel') }}
                </label>
                <textarea
                  id="q-text"
                  rows="3"
                  [formControl]="questionForm.controls.questionText"
                  [placeholder]="lang.t('admin.quiz.questionPlaceholder')"
                  class="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
                ></textarea>
                @if (showError(questionForm.controls.questionText)) {
                  <p class="mt-1 text-xs text-ios-brand-primary" role="alert">
                    {{ lang.t('admin.quiz.questionError') }}
                  </p>
                }
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ios-select
                  id="q-type"
                  [label]="lang.t('admin.quiz.questionTypeLabel')"
                  [options]="typeOptions()"
                  [control]="typeControl"
                />
                <div>
                  <label
                    for="q-pos"
                    class="block text-sm font-heading font-medium text-ios-brand-dark mb-1"
                  >
                    {{ lang.t('admin.quiz.positionLabel') }}
                  </label>
                  <input
                    id="q-pos"
                    type="number"
                    min="0"
                    [formControl]="questionForm.controls.position"
                    class="w-full h-12 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
                  />
                </div>
              </div>

              @if (mode() === 'mcq') {
                <fieldset>
                  <legend class="text-sm font-heading font-medium text-ios-brand-dark mb-1">
                    {{ lang.t('admin.quiz.optionsLabel') }}
                  </legend>
                  <p class="text-xs text-gray-500 mb-2">{{ lang.t('admin.quiz.optionsHint') }}</p>
                  <div class="flex flex-col gap-2">
                    @for (opt of options.controls; track $index) {
                      <div class="flex items-center gap-2">
                        <input
                          type="radio"
                          name="q-correct"
                          [checked]="correctIndex() === $index"
                          (change)="correctIndex.set($index)"
                          [attr.aria-label]="lang.t('admin.quiz.markCorrect')"
                          class="shrink-0 accent-ios-brand-primary"
                        />
                        <div class="grow">
                          <ios-input
                            [id]="'q-opt-' + $index"
                            label=""
                            type="text"
                            [control]="opt"
                            [placeholder]="lang.t('admin.quiz.optionPlaceholder')"
                          />
                        </div>
                        <button
                          type="button"
                          (click)="removeOption($index)"
                          [disabled]="options.length <= minOptions"
                          class="shrink-0 text-sm text-red-600 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                          [attr.aria-label]="lang.t('admin.quiz.removeOption')"
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
                    {{ lang.t('admin.quiz.addOption') }}
                  </button>
                </fieldset>
              } @else {
                <ios-input
                  id="q-answer"
                  [label]="lang.t('admin.quiz.correctAnswerLabel')"
                  type="text"
                  [control]="questionForm.controls.freeAnswer"
                />
              }

              @if (questionFormError()) {
                <p class="text-xs text-ios-brand-primary" role="alert">{{ questionFormError() }}</p>
              }
              @if (store.actionError()) {
                <p class="text-sm text-red-600" role="alert">{{ store.actionError() }}</p>
              }

              <div class="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  (click)="closeQuestionDialog()"
                  class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  {{ lang.t('admin.quiz.cancel') }}
                </button>
                <ios-button type="submit" variant="primary" [loading]="questionSaving()">
                  {{ lang.t('admin.quiz.save') }}
                </ios-button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Quiz deactivate confirm -->
      @if (pendingQuizDeactivate(); as pending) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quiz-deact-title"
        >
          <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="quiz-deact-title" class="text-lg font-semibold text-ios-brand-dark">
              {{ lang.t('admin.quiz.confirmDeactivateTitle') }}
            </h2>
            <p class="mt-2 text-sm text-gray-600">
              {{ lang.t('admin.quiz.confirmDeactivateBody') }}
              <span class="font-medium text-ios-brand-dark">{{ pending.title }}</span>
            </p>
            @if (store.actionError()) {
              <p class="mt-3 text-sm text-red-600" role="alert">{{ store.actionError() }}</p>
            }
            <div class="mt-5 flex justify-end gap-3">
              <button
                type="button"
                (click)="cancelDeactivateQuiz()"
                class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {{ lang.t('admin.quiz.cancel') }}
              </button>
              <ios-button
                variant="danger"
                [loading]="store.actionPendingId() === pending.id"
                (clicked)="confirmDeactivateQuiz()"
              >
                {{ lang.t('admin.quiz.deactivateQuiz') }}
              </ios-button>
            </div>
          </div>
        </div>
      }

      <!-- Question delete confirm -->
      @if (pendingQuestionDelete(); as pending) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="q-del-title"
        >
          <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="q-del-title" class="text-lg font-semibold text-ios-brand-dark">
              {{ lang.t('admin.quiz.confirmDeleteTitle') }}
            </h2>
            <p class="mt-2 text-sm text-gray-600">{{ lang.t('admin.quiz.confirmDeleteBody') }}</p>
            @if (store.actionError()) {
              <p class="mt-3 text-sm text-red-600" role="alert">{{ store.actionError() }}</p>
            }
            <div class="mt-5 flex justify-end gap-3">
              <button
                type="button"
                (click)="cancelDeleteQuestion()"
                class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {{ lang.t('admin.quiz.cancel') }}
              </button>
              <ios-button
                variant="danger"
                [loading]="store.actionPendingId() === pending.question.id"
                (clicked)="confirmDeleteQuestion()"
              >
                {{ lang.t('admin.quiz.delete') }}
              </ios-button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminLessonQuizzesPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly store = inject(AdminQuizStore);
  protected readonly lang = inject(LanguageService);
  protected readonly minOptions = QUIZ_MIN_OPTIONS;

  private readonly lessonId = this.route.snapshot.paramMap.get('lessonId') ?? '';
  protected readonly lessonTitle = signal(this.route.snapshot.queryParamMap.get('title') ?? '');

  protected readonly canAuthor = computed(
    () =>
      this.auth.hasRole('super_admin') ||
      this.auth.hasAnyRole(['content_creator', 'learning_admin']),
  );
  protected readonly canDelete = computed(
    () => this.auth.hasRole('super_admin') || this.auth.hasRole('learning_admin'),
  );

  // Quiz dialog
  protected readonly quizDialogOpen = signal(false);
  protected readonly editingQuizId = signal<string | null>(null);
  protected readonly quizFormError = signal<string | null>(null);
  protected readonly quizForm = this.fb.group({
    title: this.fb.control('', { validators: [required, Validators.maxLength(255)] }),
  });

  // Question dialog
  protected readonly questionDialogOpen = signal(false);
  protected readonly questionTarget = signal<QuestionTarget | null>(null);
  protected readonly editingQuestionId = signal<string | null>(null);
  protected readonly questionFormError = signal<string | null>(null);
  protected readonly correctIndex = signal(0);
  protected readonly typeControl = this.fb.control<QuestionMode>('mcq');
  protected readonly mode = toSignal(this.typeControl.valueChanges, {
    initialValue: this.typeControl.value,
  });
  protected readonly questionForm = this.fb.group({
    questionText: this.fb.control('', { validators: [required] }),
    freeAnswer: this.fb.control(''),
    position: this.fb.control(0, { validators: [Validators.min(0)] }),
    options: this.fb.array<FormControl<string>>([this.newOption(), this.newOption()]),
  });

  // Confirmations
  protected readonly pendingQuizDeactivate = signal<Quiz | null>(null);
  protected readonly pendingQuestionDelete = signal<{
    readonly quizId: string;
    readonly question: QuizQuestion;
  } | null>(null);

  protected readonly typeOptions = computed<SelectOption[]>(() => [
    { value: 'mcq', label: this.lang.t('admin.quiz.typeMcq') },
    { value: 'free', label: this.lang.t('admin.quiz.typeFree') },
  ]);

  protected readonly questionSaving = computed(() => {
    const t = this.questionTarget();
    if (!t) return false;
    const key = this.editingQuestionId() ?? `q-new-${t.quizId}`;
    return this.store.actionPendingId() === key;
  });

  ngOnInit(): void {
    if (this.lessonId) void this.store.load(this.lessonId);
  }

  protected mcq(q: QuizQuestion): boolean {
    return isMcq(q);
  }

  protected typeLabel(q: QuizQuestion): string {
    return isMcq(q) ? this.lang.t('admin.quiz.typeMcq') : this.lang.t('admin.quiz.typeFree');
  }

  protected showError(control: FormControl<string>): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  protected retry(): void {
    void this.store.reload();
  }

  get options(): FormArray<FormControl<string>> {
    return this.questionForm.controls.options;
  }

  private newOption(value = ''): FormControl<string> {
    return this.fb.control(value, { validators: [required] });
  }

  // ── Quiz dialog ────────────────────────────────────────────────────────────

  protected openCreateQuiz(): void {
    this.store.clearActionError();
    this.editingQuizId.set(null);
    this.quizFormError.set(null);
    this.quizForm.reset({ title: '' });
    this.quizDialogOpen.set(true);
  }

  protected openRenameQuiz(quiz: Quiz): void {
    this.store.clearActionError();
    this.editingQuizId.set(quiz.id);
    this.quizFormError.set(null);
    this.quizForm.reset({ title: quiz.title });
    this.quizDialogOpen.set(true);
  }

  protected closeQuizDialog(): void {
    this.store.clearActionError();
    this.quizDialogOpen.set(false);
  }

  protected async submitQuiz(): Promise<void> {
    this.quizForm.markAllAsTouched();
    this.quizFormError.set(null);
    if (this.quizForm.invalid) {
      this.quizFormError.set(this.lang.t('admin.quiz.formError'));
      return;
    }
    const title = this.quizForm.getRawValue().title;
    const id = this.editingQuizId();
    const ok = id ? await this.store.renameQuiz(id, title) : await this.store.createQuiz(title);
    if (ok) this.quizDialogOpen.set(false);
  }

  // ── Question dialog ──────────────────────────────────────────────────────

  protected openAddQuestion(quizId: string): void {
    this.store.clearActionError();
    this.questionTarget.set({ quizId, question: null });
    this.editingQuestionId.set(null);
    this.resetQuestionForm(null);
    this.questionDialogOpen.set(true);
  }

  protected openEditQuestion(quizId: string, question: QuizQuestion): void {
    this.store.clearActionError();
    this.questionTarget.set({ quizId, question });
    this.editingQuestionId.set(question.id);
    this.resetQuestionForm(question);
    this.questionDialogOpen.set(true);
  }

  protected closeQuestionDialog(): void {
    this.store.clearActionError();
    this.questionDialogOpen.set(false);
  }

  protected addOption(): void {
    this.options.push(this.newOption());
  }

  protected removeOption(index: number): void {
    if (this.options.length <= QUIZ_MIN_OPTIONS) return;
    this.options.removeAt(index);
    const current = this.correctIndex();
    if (index === current) this.correctIndex.set(0);
    else if (index < current) this.correctIndex.set(current - 1);
  }

  private resetQuestionForm(question: QuizQuestion | null): void {
    this.questionFormError.set(null);
    this.correctIndex.set(0);
    const isMcqQuestion = question ? isMcq(question) : true;
    this.typeControl.setValue(isMcqQuestion ? 'mcq' : 'free');
    this.options.clear();
    if (question && isMcqQuestion && question.options) {
      question.options.forEach((o) => this.options.push(this.newOption(o)));
      const idx = question.options.findIndex((o) => o === question.correctAnswer);
      this.correctIndex.set(idx >= 0 ? idx : 0);
    } else {
      this.options.push(this.newOption());
      this.options.push(this.newOption());
    }
    this.questionForm.controls.questionText.setValue(question?.questionText ?? '');
    this.questionForm.controls.freeAnswer.setValue(
      question && !isMcqQuestion ? question.correctAnswer : '',
    );
    this.questionForm.controls.position.setValue(question?.position ?? 0);
    this.questionForm.markAsUntouched();
  }

  protected async submitQuestion(): Promise<void> {
    const target = this.questionTarget();
    if (!target) return;
    this.questionFormError.set(null);
    this.questionForm.controls.questionText.markAsTouched();
    const questionText = this.questionForm.controls.questionText.value.trim();
    if (questionText === '') {
      this.questionFormError.set(this.lang.t('admin.quiz.formError'));
      return;
    }
    const position = this.questionForm.controls.position.value;

    let draft: QuestionDraft;
    if (this.mode() === 'mcq') {
      const options = this.options.controls.map((c) => c.value.trim()).filter((v) => v !== '');
      if (options.length < QUIZ_MIN_OPTIONS) {
        this.questionFormError.set(this.lang.t('admin.quiz.optionsError'));
        return;
      }
      const correct = this.options.controls[this.correctIndex()]?.value.trim() ?? '';
      if (correct === '' || !options.includes(correct)) {
        this.questionFormError.set(this.lang.t('admin.quiz.correctError'));
        return;
      }
      draft = { questionText, correctAnswer: correct, options, position };
    } else {
      const answer = this.questionForm.controls.freeAnswer.value.trim();
      if (answer === '') {
        this.questionFormError.set(this.lang.t('admin.quiz.correctError'));
        return;
      }
      draft = { questionText, correctAnswer: answer, options: [], position };
    }

    const editingId = this.editingQuestionId();
    const ok = editingId
      ? await this.store.updateQuestion(target.quizId, editingId, draft)
      : await this.store.addQuestion(target.quizId, draft);
    if (ok) this.questionDialogOpen.set(false);
  }

  // ── Confirmations ──────────────────────────────────────────────────────────

  protected askDeactivateQuiz(quiz: Quiz): void {
    this.store.clearActionError();
    this.pendingQuizDeactivate.set(quiz);
  }

  protected cancelDeactivateQuiz(): void {
    this.store.clearActionError();
    this.pendingQuizDeactivate.set(null);
  }

  protected async confirmDeactivateQuiz(): Promise<void> {
    const pending = this.pendingQuizDeactivate();
    if (!pending) return;
    const ok = await this.store.deactivateQuiz(pending.id);
    if (ok) this.pendingQuizDeactivate.set(null);
  }

  protected reactivateQuiz(quiz: Quiz): void {
    void this.store.reactivateQuiz(quiz.id);
  }

  protected askDeleteQuestion(quizId: string, question: QuizQuestion): void {
    this.store.clearActionError();
    this.pendingQuestionDelete.set({ quizId, question });
  }

  protected cancelDeleteQuestion(): void {
    this.store.clearActionError();
    this.pendingQuestionDelete.set(null);
  }

  protected async confirmDeleteQuestion(): Promise<void> {
    const pending = this.pendingQuestionDelete();
    if (!pending) return;
    const ok = await this.store.deleteQuestion(pending.quizId, pending.question.id);
    if (ok) this.pendingQuestionDelete.set(null);
  }
}

export default AdminLessonQuizzesPage;
