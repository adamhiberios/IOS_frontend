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
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthStore } from '@core/auth';
import { LanguageService } from '@core/i18n';
import { Button, Input as IosInput } from '@ui';

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
 *
 * Create/edit quiz + add/edit question: content_creator / learning_admin.
 * Deactivate quiz + delete question: learning_admin only (backend-enforced).
 */
@Component({
  selector: 'ios-admin-lesson-quizzes-page',
  imports: [ReactiveFormsModule, RouterLink, IosInput, Button],
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
              class="rounded-xl border bg-white"
              [class.border-gray-200]="qz.active"
              [class.border-gray-300]="!qz.active"
              [class.opacity-60]="!qz.active"
            >
              <div class="flex items-start justify-between gap-4 p-4 border-b border-gray-100">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h2 class="text-base font-semibold text-ios-brand-dark truncate">
                      {{ qz.title }}
                    </h2>
                    @if (!qz.active) {
                      <span
                        class="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5"
                      >
                        {{ lang.t('admin.quiz.quizInactive') }}
                      </span>
                    }
                  </div>
                  <p class="text-xs text-gray-500 mt-1">
                    {{ lang.t('admin.quiz.questionsCount', { count: qz.questions.length }) }}
                  </p>
                </div>
                @if (canAuthor()) {
                  <div class="flex items-center gap-3 shrink-0">
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
                          [disabled]="store.actionPendingId() === qz.id"
                          (click)="askDeactivateQuiz(qz)"
                          class="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          {{ lang.t('admin.quiz.deactivateQuiz') }}
                        </button>
                      }
                    } @else {
                      <button
                        type="button"
                        [disabled]="store.actionPendingId() === qz.id"
                        (click)="reactivateQuiz(qz)"
                        class="text-sm text-green-700 hover:text-green-800 disabled:opacity-50"
                      >
                        {{ lang.t('admin.quiz.reactivateQuiz') }}
                      </button>
                    }
                  </div>
                }
              </div>

              <!-- Questions -->
              <ul class="divide-y divide-gray-50">
                @for (q of qz.questions; track q.id) {
                  <li class="px-4 py-3">
                    <div class="flex items-start justify-between gap-4">
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-ios-brand-dark">
                          <span class="text-xs text-gray-400 me-1">#{{ q.position }}</span>
                          {{ q.questionText }}
                        </p>
                        @if (mcq(q)) {
                          <ul class="mt-1 flex flex-col gap-0.5">
                            @for (o of q.options; track o) {
                              <li class="text-xs text-gray-500 flex items-center gap-1">
                                <span [class.font-semibold]="o === q.correctAnswer">{{ o }}</span>
                                @if (o === q.correctAnswer) {
                                  <span class="text-green-700">{{
                                    lang.t('admin.quiz.correct')
                                  }}</span>
                                }
                              </li>
                            }
                          </ul>
                        } @else {
                          <p class="mt-1 text-xs text-gray-500">
                            {{ lang.t('admin.quiz.freeTextAnswer', { answer: q.correctAnswer }) }}
                          </p>
                        }
                      </div>
                      @if (canAuthor()) {
                        <div class="flex items-center gap-3 shrink-0">
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
                  <li class="px-4 py-3 text-sm text-gray-400">
                    {{ lang.t('admin.quiz.noQuestions') }}
                  </li>
                }
              </ul>

              @if (canAuthor()) {
                <div class="p-3 border-t border-gray-100">
                  <button
                    type="button"
                    (click)="openAddQuestion(qz.id)"
                    class="text-sm text-ios-brand-primary underline"
                  >
                    + {{ lang.t('admin.quiz.addQuestion') }}
                  </button>
                </div>
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
          class="fixed inset-0 z-50 overflow-y-auto bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quiz-dialog-title"
        >
          <div class="min-h-full flex items-center justify-center p-4">
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
        </div>
      }

      <!-- Question create / edit dialog -->
      @if (questionDialogOpen()) {
        <div
          class="fixed inset-0 z-50 overflow-y-auto bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="q-dialog-title"
        >
          <div class="min-h-full flex items-center justify-center p-4">
            <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
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
                    rows="2"
                    [formControl]="questionForm.controls.questionText"
                    class="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
                  ></textarea>
                </div>

                <!-- Type toggle -->
                <div
                  class="flex gap-4"
                  role="radiogroup"
                  [attr.aria-label]="lang.t('admin.quiz.questionTypeLabel')"
                >
                  <label class="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="q-mode"
                      [checked]="mode() === 'mcq'"
                      (change)="setMode('mcq')"
                    />
                    {{ lang.t('admin.quiz.typeMcq') }}
                  </label>
                  <label class="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="q-mode"
                      [checked]="mode() === 'free'"
                      (change)="setMode('free')"
                    />
                    {{ lang.t('admin.quiz.typeFree') }}
                  </label>
                </div>

                @if (mode() === 'mcq') {
                  <div>
                    <p class="text-sm font-heading font-medium text-ios-brand-dark mb-1">
                      {{ lang.t('admin.quiz.optionsLabel') }}
                    </p>
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
                          />
                          <input
                            type="text"
                            [formControl]="opt"
                            class="flex-1 h-11 px-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-ios-brand-dark focus:outline-none focus:border-ios-fg"
                          />
                          <button
                            type="button"
                            (click)="removeOption($index)"
                            [disabled]="options.length <= minOptions"
                            class="text-gray-400 hover:text-red-600 disabled:opacity-40 px-2"
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
                      class="mt-2 text-sm text-ios-brand-primary underline"
                    >
                      + {{ lang.t('admin.quiz.addOption') }}
                    </button>
                  </div>
                } @else {
                  <ios-input
                    id="q-answer"
                    [label]="lang.t('admin.quiz.correctAnswerLabel')"
                    type="text"
                    [control]="questionForm.controls.freeAnswer"
                  />
                }

                @if (questionFormError()) {
                  <p class="text-xs text-ios-brand-primary" role="alert">
                    {{ questionFormError() }}
                  </p>
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
  protected readonly mode = signal<QuestionMode>('mcq');
  protected readonly correctIndex = signal(0);
  protected readonly questionForm = this.fb.group({
    questionText: this.fb.control('', { validators: [required] }),
    freeAnswer: this.fb.control(''),
    options: this.fb.array<FormControl<string>>([this.newOption(), this.newOption()]),
  });

  // Confirmations
  protected readonly pendingQuizDeactivate = signal<Quiz | null>(null);
  protected readonly pendingQuestionDelete = signal<{
    readonly quizId: string;
    readonly question: QuizQuestion;
  } | null>(null);

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

  protected setMode(mode: QuestionMode): void {
    this.mode.set(mode);
    if (mode === 'mcq' && this.options.length < QUIZ_MIN_OPTIONS) {
      while (this.options.length < QUIZ_MIN_OPTIONS) this.options.push(this.newOption());
    }
  }

  protected addOption(): void {
    this.options.push(this.newOption());
  }

  protected removeOption(index: number): void {
    if (this.options.length <= QUIZ_MIN_OPTIONS) return;
    this.options.removeAt(index);
    if (this.correctIndex() >= this.options.length) this.correctIndex.set(this.options.length - 1);
    else if (this.correctIndex() > index) this.correctIndex.set(this.correctIndex() - 1);
  }

  private resetQuestionForm(question: QuizQuestion | null): void {
    this.questionFormError.set(null);
    this.correctIndex.set(0);
    // Rebuild the options array.
    this.options.clear();
    const isMcqQuestion = question ? isMcq(question) : true;
    this.mode.set(isMcqQuestion ? 'mcq' : 'free');
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
    this.questionForm.controls.questionText.markAsUntouched();
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
      draft = { questionText, correctAnswer: correct, options };
    } else {
      const answer = this.questionForm.controls.freeAnswer.value.trim();
      if (answer === '') {
        this.questionFormError.set(this.lang.t('admin.quiz.correctError'));
        return;
      }
      draft = { questionText, correctAnswer: answer, options: [] };
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
    if (!pending?.question) return;
    const ok = await this.store.deleteQuestion(pending.quizId, pending.question.id);
    if (ok) this.pendingQuestionDelete.set(null);
  }
}

export default AdminLessonQuizzesPage;
