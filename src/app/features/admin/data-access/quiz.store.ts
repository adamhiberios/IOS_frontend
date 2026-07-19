import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { AppEventBus } from '@core/event-bus';
import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { AdminQuizApi } from './quiz.api';
import { toCreateQuestionBody, toUpdateQuestionBody } from './quiz.mappers';
import { type QuestionDraft, type Quiz } from './quiz.model';

/**
 * Signal store for a single lesson's quiz authoring (BE-I-06 / B5).
 *
 * Holds the quizzes (with questions, incl. `correctAnswer`) for one lesson and
 * owns quiz + question CRUD. Every mutation refetches the lesson's quizzes so
 * the tree stays authoritative. `actionPendingId` keys row/dialog spinners by
 * the quiz/question id (or `new`). Cleared on `user.logged-out`.
 */
@Injectable({ providedIn: 'root' })
export class AdminQuizStore {
  private readonly api = inject(AdminQuizApi);
  private readonly lang = inject(LanguageService);
  private readonly bus = inject(AppEventBus);

  constructor() {
    this.bus
      .on('user.logged-out')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.clear());
  }

  private readonly _lessonId = signal<string | null>(null);
  private readonly _quizzes = signal<readonly Quiz[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _loaded = signal(false);
  private readonly _actionPendingId = signal<string | null>(null);
  private readonly _actionError = signal<string | null>(null);

  readonly quizzes = this._quizzes.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly actionPendingId = this._actionPendingId.asReadonly();
  readonly actionError = this._actionError.asReadonly();
  readonly isEmpty = computed(
    () => !this._loading() && this._error() === null && this._quizzes().length === 0,
  );

  /** Load (or switch to) a lesson's quizzes. Reloads when the lesson changes. */
  async load(lessonId: string, force = false): Promise<void> {
    if (!force && this._loaded() && this._lessonId() === lessonId) return;
    this._lessonId.set(lessonId);
    await this.fetch();
  }

  async reload(): Promise<void> {
    await this.fetch();
  }

  // ── Quiz mutations ─────────────────────────────────────────────────────────

  async createQuiz(title: string): Promise<boolean> {
    const lessonId = this._lessonId();
    if (!lessonId) return false;
    return this.runAction('new', () =>
      firstValueFrom(this.api.createQuiz(lessonId, { title: title.trim() })),
    );
  }

  async renameQuiz(quizId: string, title: string): Promise<boolean> {
    return this.runAction(quizId, () =>
      firstValueFrom(this.api.updateQuiz(quizId, { title: title.trim() })),
    );
  }

  /** Deactivate a quiz (DELETE soft-delete). */
  async deactivateQuiz(quizId: string): Promise<boolean> {
    return this.runAction(quizId, () => firstValueFrom(this.api.deleteQuiz(quizId)));
  }

  /** Reactivate a quiz (`PATCH { active: true }`). */
  async reactivateQuiz(quizId: string): Promise<boolean> {
    return this.runAction(quizId, () =>
      firstValueFrom(this.api.updateQuiz(quizId, { active: true })),
    );
  }

  // ── Question mutations ─────────────────────────────────────────────────────

  async addQuestion(quizId: string, draft: QuestionDraft): Promise<boolean> {
    return this.runAction(`q-new-${quizId}`, () =>
      firstValueFrom(this.api.addQuestion(quizId, toCreateQuestionBody(draft))),
    );
  }

  async updateQuestion(quizId: string, questionId: string, draft: QuestionDraft): Promise<boolean> {
    return this.runAction(questionId, () =>
      firstValueFrom(this.api.updateQuestion(quizId, questionId, toUpdateQuestionBody(draft))),
    );
  }

  async deleteQuestion(quizId: string, questionId: string): Promise<boolean> {
    return this.runAction(questionId, () =>
      firstValueFrom(this.api.deleteQuestion(quizId, questionId)),
    );
  }

  clearActionError(): void {
    this._actionError.set(null);
  }

  private async runAction(pendingKey: string, action: () => Promise<unknown>): Promise<boolean> {
    if (this._actionPendingId() !== null) return false;
    this._actionPendingId.set(pendingKey);
    this._actionError.set(null);
    try {
      await action();
      await this.fetch();
      return true;
    } catch (err) {
      this._actionError.set(problemDetailMessage(err) ?? this.lang.t('admin.quiz.saveError'));
      return false;
    } finally {
      this._actionPendingId.set(null);
    }
  }

  private async fetch(): Promise<void> {
    const lessonId = this._lessonId();
    if (!lessonId) return;
    this._loading.set(true);
    this._error.set(null);
    try {
      this._quizzes.set(await firstValueFrom(this.api.listByLesson(lessonId)));
      this._loaded.set(true);
    } catch (err) {
      this._error.set(problemDetailMessage(err) ?? this.lang.t('admin.quiz.error'));
    } finally {
      this._loading.set(false);
    }
  }

  private clear(): void {
    this._lessonId.set(null);
    this._quizzes.set([]);
    this._error.set(null);
    this._actionError.set(null);
    this._loaded.set(false);
  }
}
