import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { AppEventBus } from '@core/event-bus';
import { problemDetailMessage } from '@core/http';

import { CoursesApi } from './courses.api';
import {
  type CourseProgress,
  type Curriculum,
  type Lesson,
  type LessonQuiz,
  type QuizCheckResult,
} from './courses.model';

/**
 * `CoursesStore` — student learning state (curriculum browsing, lesson viewing,
 * self-check quizzes, and per-cert progress). Root singleton; server state in
 * private signals, exposed via `.asReadonly()` + `computed()`, mutated only
 * through the action methods. Clears on logout. No Observables leak to the UI.
 *
 * Backed by `/learning/*` (see `courses.api.ts`). All reads are purchase-gated
 * server-side; a 403 surfaces as an inline error string.
 */
@Injectable({ providedIn: 'root' })
export class CoursesStore {
  private readonly api = inject(CoursesApi);
  private readonly bus = inject(AppEventBus);

  // ── Curriculum ─────────────────────────────────────────────────────────────
  private readonly _curriculum = signal<Curriculum | null>(null);
  private readonly _curriculumLoading = signal(false);
  private readonly _curriculumError = signal<string | null>(null);
  readonly curriculum = this._curriculum.asReadonly();
  readonly curriculumLoading = this._curriculumLoading.asReadonly();
  readonly curriculumError = this._curriculumError.asReadonly();

  // ── Current lesson ─────────────────────────────────────────────────────────
  private readonly _lesson = signal<Lesson | null>(null);
  private readonly _lessonLoading = signal(false);
  private readonly _lessonError = signal<string | null>(null);
  readonly lesson = this._lesson.asReadonly();
  readonly lessonLoading = this._lessonLoading.asReadonly();
  readonly lessonError = this._lessonError.asReadonly();

  // ── Lesson quiz + check result ─────────────────────────────────────────────
  private readonly _quiz = signal<LessonQuiz | null>(null);
  private readonly _quizLoading = signal(false);
  private readonly _quizError = signal<string | null>(null);
  private readonly _checkResult = signal<QuizCheckResult | null>(null);
  private readonly _checking = signal(false);
  readonly quiz = this._quiz.asReadonly();
  readonly quizLoading = this._quizLoading.asReadonly();
  readonly quizError = this._quizError.asReadonly();
  readonly checkResult = this._checkResult.asReadonly();
  readonly checking = this._checking.asReadonly();

  // ── Progress (courses index) ───────────────────────────────────────────────
  private readonly _progress = signal<readonly CourseProgress[]>([]);
  private readonly _progressLoaded = signal(false);
  private readonly _progressLoading = signal(false);
  private readonly _progressError = signal<string | null>(null);
  readonly progress = this._progress.asReadonly();
  readonly progressLoading = this._progressLoading.asReadonly();
  readonly progressError = this._progressError.asReadonly();
  readonly progressEmpty = computed(
    () => this._progressLoaded() && this._progressError() === null && this._progress().length === 0,
  );

  constructor() {
    this.bus
      .on('user.logged-out')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.clear());
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async loadCurriculum(certId: string): Promise<void> {
    this._curriculumLoading.set(true);
    this._curriculumError.set(null);
    try {
      this._curriculum.set(await firstValueFrom(this.api.getCurriculum(certId)));
    } catch (err) {
      this._curriculum.set(null);
      this._curriculumError.set(problemDetailMessage(err));
    } finally {
      this._curriculumLoading.set(false);
    }
  }

  async loadLesson(lessonId: string): Promise<void> {
    this._lessonLoading.set(true);
    this._lessonError.set(null);
    try {
      this._lesson.set(await firstValueFrom(this.api.getLesson(lessonId)));
    } catch (err) {
      this._lesson.set(null);
      this._lessonError.set(problemDetailMessage(err));
    } finally {
      this._lessonLoading.set(false);
    }
  }

  /** Load a lesson's quiz. Clears any previous check result. */
  async loadQuiz(lessonId: string): Promise<void> {
    this._quizLoading.set(true);
    this._quizError.set(null);
    this._checkResult.set(null);
    try {
      this._quiz.set(await firstValueFrom(this.api.getLessonQuiz(lessonId)));
    } catch (err) {
      this._quiz.set(null);
      this._quizError.set(problemDetailMessage(err));
    } finally {
      this._quizLoading.set(false);
    }
  }

  /** Check quiz answers (nothing persisted). Returns the result, or null on error. */
  async checkQuiz(
    lessonId: string,
    answers: Record<string, string>,
  ): Promise<QuizCheckResult | null> {
    this._checking.set(true);
    this._quizError.set(null);
    try {
      const result = await firstValueFrom(this.api.checkQuiz(lessonId, answers));
      this._checkResult.set(result);
      return result;
    } catch (err) {
      this._quizError.set(problemDetailMessage(err));
      return null;
    } finally {
      this._checking.set(false);
    }
  }

  /** Discard the last quiz check result (e.g. "try again"). */
  resetQuizCheck(): void {
    this._checkResult.set(null);
  }

  /**
   * Mark the given lesson complete and reflect it in the lesson + curriculum.
   * Failures are surfaced by the global error interceptor toast — deliberately
   * NOT written to `lessonError` (that gates the whole lesson view; a failed
   * mark-complete must not blank the page).
   */
  async markComplete(lessonId: string): Promise<void> {
    const done = await firstValueFrom(this.api.markComplete(lessonId)).catch(() => null);
    if (!done) return;
    const current = this._lesson();
    if (current && current.id === lessonId) {
      this._lesson.set({ ...current, completed: true, completedAt: done.completedAt });
    }
    this.markLessonCompleteInCurriculum(lessonId);
  }

  async loadProgress(): Promise<void> {
    this._progressLoading.set(true);
    this._progressError.set(null);
    try {
      this._progress.set(await firstValueFrom(this.api.getProgress()));
    } catch (err) {
      this._progressError.set(problemDetailMessage(err));
    } finally {
      this._progressLoading.set(false);
      this._progressLoaded.set(true);
    }
  }

  clear(): void {
    this._curriculum.set(null);
    this._curriculumError.set(null);
    this._lesson.set(null);
    this._lessonError.set(null);
    this._quiz.set(null);
    this._quizError.set(null);
    this._checkResult.set(null);
    this._progress.set([]);
    this._progressLoaded.set(false);
    this._progressError.set(null);
  }

  /** Flip the matching curriculum lesson's `completed` flag (immutably). */
  private markLessonCompleteInCurriculum(lessonId: string): void {
    const cur = this._curriculum();
    if (!cur) return;
    this._curriculum.set({
      ...cur,
      modules: cur.modules.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => (l.id === lessonId ? { ...l, completed: true } : l)),
      })),
    });
  }
}
