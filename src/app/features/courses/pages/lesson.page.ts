import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideCheck } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { CanadaFlag, IosIcon, provideIcons } from '@ui';
import { DashboardNavbar } from '@layouts';

import { CoursesStore } from '../data-access/courses.store';
import { type QuizAnswerResult } from '../data-access/courses.model';

/**
 * `ios-lesson-page` — a single lesson: signed-URL video, sanitised HTML content,
 * an idempotent mark-complete, and an optional self-check quiz.
 *
 * Content is rendered with Angular's built-in `[innerHTML]` sanitizer
 * (`SecurityContext.HTML`) — never `bypassSecurityTrust*` (CLAUDE §4). The video
 * URL is a short-lived signed URL from the backend.
 */
@Component({
  selector: 'ios-lesson-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DashboardNavbar, CanadaFlag, IosIcon],
  providers: [provideIcons(LucideArrowLeft, LucideCheck)],
  styles: [
    `
      /* Prose styling for backend-authored lesson HTML injected via [innerHTML].
         ::ng-deep reaches the sanitized children (still sanitized by Angular). */
      .ios-lesson-prose ::ng-deep h2 {
        font-size: 1.35rem;
        font-weight: 700;
        margin: 1.5rem 0 0.75rem;
      }
      .ios-lesson-prose ::ng-deep h3 {
        font-size: 1.15rem;
        font-weight: 600;
        margin: 1.25rem 0 0.5rem;
      }
      .ios-lesson-prose ::ng-deep p {
        margin: 0.75rem 0;
        line-height: 1.7;
      }
      .ios-lesson-prose ::ng-deep ul,
      .ios-lesson-prose ::ng-deep ol {
        margin: 0.75rem 0;
        padding-inline-start: 1.5rem;
        list-style: revert;
      }
      .ios-lesson-prose ::ng-deep li {
        margin: 0.35rem 0;
      }
      .ios-lesson-prose ::ng-deep a {
        color: var(--color-ios-brand-primary-mid, #4b7d1a);
        text-decoration: underline;
      }
      .ios-lesson-prose ::ng-deep img {
        max-width: 100%;
        height: auto;
        border-radius: 0.5rem;
      }
    `,
  ],
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <main class="flex-1 w-full px-4 md:px-20 py-8" id="main-content">
        <div class="max-w-[820px] mx-auto flex flex-col gap-6">
          <a
            [routerLink]="['/courses', certId()]"
            class="inline-flex items-center gap-2 text-[14px] font-medium text-ios-fg-8
                   hover:text-ios-fg-11 transition-colors w-fit"
          >
            <ios-icon name="arrow-left" class="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
            {{ lang.t('courses.lesson.back') }}
          </a>

          @if (store.lessonLoading()) {
            <p class="text-ios-fg-8" aria-live="polite">{{ lang.t('courses.common.loading') }}</p>
          } @else if (store.lessonError()) {
            <p
              class="rounded-xl bg-ios-danger-soft px-4 py-3 text-sm font-medium text-ios-danger-mid"
              role="alert"
            >
              {{ store.lessonError() }}
            </p>
          } @else if (store.lesson(); as lesson) {
            <article class="flex flex-col gap-6">
              <h1
                class="text-[26px] md:text-[30px] font-bold text-ios-fg-13 leading-tight"
                dir="auto"
              >
                {{ lesson.title }}
              </h1>

              @if (lesson.videoUrl) {
                <video
                  controls
                  preload="metadata"
                  class="w-full rounded-xl bg-black aspect-video"
                  [src]="lesson.videoUrl"
                  [attr.aria-label]="lesson.title"
                ></video>
              }

              @if (lesson.contentHtml) {
                <div
                  class="ios-lesson-prose text-[15px] text-ios-fg-11"
                  dir="auto"
                  [innerHTML]="lesson.contentHtml"
                ></div>
              }

              <!-- Mark complete -->
              <div class="flex items-center gap-3 border-t border-ios-surface-soft pt-6">
                @if (lesson.completed) {
                  <span
                    class="inline-flex items-center gap-2 rounded-xl bg-ios-success-soft px-4 py-2.5
                           text-[14px] font-semibold text-ios-success-strong"
                    role="status"
                  >
                    <ios-icon name="check" class="size-4" aria-hidden="true" />
                    {{ lang.t('courses.lesson.completed') }}
                  </span>
                } @else {
                  <button
                    type="button"
                    (click)="onMarkComplete(lesson.id)"
                    class="inline-flex h-12 items-center justify-center rounded-xl bg-ios-brand-primary
                           px-6 font-semibold text-ios-brand-primary-soft transition-colors
                           hover:bg-ios-brand-primary-hover focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ios-brand-primary/50"
                  >
                    {{ lang.t('courses.lesson.markComplete') }}
                  </button>
                }
              </div>
            </article>

            <!-- ── Self-check quiz (only when the lesson has one) ─────────── -->
            @if (store.quiz(); as quiz) {
              <section class="flex flex-col gap-5 rounded-2xl bg-ios-surface-soft p-6 mt-2">
                <h2 class="text-[18px] font-semibold text-ios-fg-13" dir="auto">
                  {{ quiz.title }}
                </h2>

                @for (q of quiz.questions; track q.id; let qi = $index) {
                  <div class="flex flex-col gap-3">
                    <p class="text-[15px] font-medium text-ios-fg-13" dir="auto">
                      {{ qi + 1 }}. {{ q.questionText }}
                    </p>

                    @if (q.options) {
                      <div
                        class="flex flex-col gap-2"
                        role="radiogroup"
                        [attr.aria-label]="q.questionText"
                      >
                        @for (opt of q.options; track opt) {
                          <label [class]="optionClass(q.id, opt)">
                            <input
                              type="radio"
                              class="accent-ios-brand-primary"
                              [name]="q.id"
                              [value]="opt"
                              [checked]="answers()[q.id] === opt"
                              [disabled]="checked()"
                              (change)="setAnswer(q.id, opt)"
                            />
                            <span class="flex-1 min-w-0 text-start" dir="auto">{{ opt }}</span>
                            @if (resultFor(q.id); as r) {
                              @if (opt === r.correctAnswer) {
                                <ios-icon
                                  name="check"
                                  class="size-4 text-ios-success-mid shrink-0"
                                  aria-hidden="true"
                                />
                              }
                            }
                          </label>
                        }
                      </div>
                    } @else {
                      <input
                        type="text"
                        class="h-12 w-full rounded-xl border border-ios-surface-hover bg-white px-4 text-ios-fg-13
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                        [value]="answers()[q.id]"
                        [disabled]="checked()"
                        [attr.aria-label]="q.questionText"
                        (input)="onTextInput(q.id, $event)"
                      />
                    }

                    @if (resultFor(q.id); as r) {
                      <p
                        class="text-[13px] font-medium"
                        [class.text-ios-success-strong]="r.correct"
                        [class.text-ios-danger-mid]="!r.correct"
                        aria-live="polite"
                      >
                        @if (r.correct) {
                          {{ lang.t('courses.quiz.correct') }}
                        } @else {
                          {{ lang.t('courses.quiz.incorrectAnswer', { answer: r.correctAnswer }) }}
                        }
                      </p>
                    }
                  </div>
                }

                @if (store.quizError()) {
                  <p class="text-sm font-medium text-ios-danger-mid" role="alert">
                    {{ store.quizError() }}
                  </p>
                }

                @if (checked()) {
                  <div
                    class="flex flex-col sm:flex-row sm:items-center gap-3 border-t border-ios-border-light pt-4"
                  >
                    <p
                      class="flex-1 text-[15px] font-semibold text-ios-fg-13"
                      role="status"
                      aria-live="polite"
                    >
                      {{
                        lang.t('courses.quiz.scoreLine', {
                          correct: store.checkResult()!.correctCount,
                          total: store.checkResult()!.totalCount,
                        })
                      }}
                    </p>
                    <button
                      type="button"
                      (click)="onTryAgain()"
                      class="inline-flex h-12 items-center justify-center rounded-xl bg-white border border-ios-surface-hover
                             px-6 font-semibold text-ios-fg-11 transition-colors hover:bg-[#f8f8f8]
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                             focus-visible:ring-ios-brand-primary/40"
                    >
                      {{ lang.t('courses.quiz.tryAgain') }}
                    </button>
                  </div>
                } @else {
                  <button
                    type="button"
                    [disabled]="!allAnswered() || store.checking()"
                    (click)="onCheck()"
                    class="inline-flex h-12 w-fit items-center justify-center rounded-xl bg-ios-fg-13 px-6
                           font-semibold text-white transition-colors hover:bg-[#2a2b2a]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                           focus-visible:ring-ios-fg-13/50 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {{
                      store.checking()
                        ? lang.t('courses.quiz.checking')
                        : lang.t('courses.quiz.check')
                    }}
                  </button>
                }
              </section>
            }
          }
        </div>
      </main>

      <footer class="bg-ios-fg w-full py-4">
        <div
          class="max-w-[1400px] mx-auto px-4 md:px-8 flex items-center justify-center gap-2 text-ios-fg-7 text-xs"
        >
          <ios-canada-flag aria-hidden="true" />
          <span>{{ lang.t('common.copyright', { year: '2026' }) }}</span>
        </div>
      </footer>
    </div>
  `,
})
export class LessonPage {
  protected readonly lang = inject(LanguageService);
  protected readonly store = inject(CoursesStore);
  private readonly route = inject(ActivatedRoute);

  private readonly _certId = signal('');
  protected readonly certId = this._certId.asReadonly();

  /** questionId → the student's current answer. */
  private readonly answersMap = signal<Record<string, string>>({});
  protected readonly answers = this.answersMap.asReadonly();

  protected readonly checked = computed(() => this.store.checkResult() !== null);
  private readonly resultsByQuestion = computed(() => {
    const result = this.store.checkResult();
    return result ? new Map(result.results.map((r) => [r.questionId, r])) : null;
  });
  protected readonly allAnswered = computed(() => {
    const quiz = this.store.quiz();
    if (!quiz) return false;
    const answers = this.answersMap();
    return quiz.questions.every((q) => (answers[q.id] ?? '').trim().length > 0);
  });

  constructor() {
    const certId = this.route.snapshot.paramMap.get('certId') ?? '';
    const lessonId = this.route.snapshot.paramMap.get('lessonId');
    this._certId.set(certId);
    if (lessonId) {
      void this.store.loadLesson(lessonId);
      // A missing quiz simply 404s → the section stays hidden (quiz is optional).
      void this.store.loadQuiz(lessonId);
    }
  }

  protected setAnswer(questionId: string, value: string): void {
    this.answersMap.update((a) => ({ ...a, [questionId]: value }));
  }

  protected onTextInput(questionId: string, event: Event): void {
    this.setAnswer(questionId, (event.target as HTMLInputElement).value);
  }

  protected resultFor(questionId: string): QuizAnswerResult | undefined {
    return this.resultsByQuestion()?.get(questionId);
  }

  protected onCheck(): void {
    const lessonId = this.store.quiz()?.lessonId;
    if (lessonId) void this.store.checkQuiz(lessonId, this.answersMap());
  }

  protected onTryAgain(): void {
    this.answersMap.set({});
    this.store.resetQuizCheck();
  }

  protected onMarkComplete(lessonId: string): void {
    void this.store.markComplete(lessonId);
  }

  /** Option row classes, coloured by result once checked. */
  protected optionClass(questionId: string, opt: string): string {
    const base =
      'flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-[15px] font-medium transition-colors cursor-pointer';
    const result = this.resultFor(questionId);
    if (result) {
      if (opt === result.correctAnswer)
        return `${base} border-ios-success-mid bg-ios-success-soft text-ios-fg-13`;
      if (opt === result.yourAnswer)
        return `${base} border-ios-danger-mid bg-ios-danger-soft text-ios-fg-13`;
      return `${base} border-transparent bg-white text-ios-fg-10`;
    }
    if (this.answersMap()[questionId] === opt)
      return `${base} border-ios-brand-primary bg-white text-ios-fg-13`;
    return `${base} border-transparent bg-white text-ios-fg-11 hover:bg-[#f8f8f8]`;
  }
}

export default LessonPage;
