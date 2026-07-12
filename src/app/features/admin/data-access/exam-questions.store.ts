import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { AdminExamAuthoringApi } from './exam-authoring.api';
import { type ExamDetail, type QuestionDraft } from './exam-authoring.model';

/**
 * Signal store for the exam question editor (`GET/POST/PATCH/DELETE
 * /admin/exams/:examId/questions*`). Loads one exam's authoring view and owns
 * the add/update/delete-question actions; question CRUD is DRAFT-only
 * (the backend 409s `EXAM_LOCKED` on published exams). Business logic lives
 * here; the page only binds signals.
 */
@Injectable({ providedIn: 'root' })
export class AdminExamQuestionsStore {
  private readonly api = inject(AdminExamAuthoringApi);
  private readonly lang = inject(LanguageService);

  private readonly _examId = signal<string | null>(null);
  private readonly _exam = signal<ExamDetail | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _actionPendingId = signal<string | null>(null);
  private readonly _actionError = signal<string | null>(null);

  readonly exam = this._exam.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly actionPendingId = this._actionPendingId.asReadonly();
  readonly actionError = this._actionError.asReadonly();

  readonly questions = computed(() => this._exam()?.questions ?? []);
  readonly isDraft = computed(() => this._exam()?.status === 'draft');
  readonly isEmpty = computed(
    () => !this._loading() && this._error() === null && this.questions().length === 0,
  );

  /** Load an exam's authoring view (meta + questions). */
  async load(examId: string): Promise<void> {
    this._examId.set(examId);
    this._loading.set(true);
    this._error.set(null);
    try {
      this._exam.set(await firstValueFrom(this.api.getExam(examId)));
    } catch (err) {
      this._exam.set(null);
      this._error.set(problemDetailMessage(err) ?? this.lang.t('admin.examQuestions.error'));
    } finally {
      this._loading.set(false);
    }
  }

  /** Reload the current exam. */
  async reload(): Promise<void> {
    const id = this._examId();
    if (id !== null) await this.load(id);
  }

  /**
   * Add (`questionId` omitted) or update a question, then refresh. Returns
   * `true` on success; the failure reason is exposed via {@link actionError}.
   */
  async save(draft: QuestionDraft, questionId?: string): Promise<boolean> {
    const examId = this._examId();
    if (examId === null || this._actionPendingId() !== null) return false;
    this._actionPendingId.set(questionId ?? 'new');
    this._actionError.set(null);
    try {
      if (questionId) {
        await firstValueFrom(this.api.updateQuestion(examId, questionId, draft));
      } else {
        await firstValueFrom(this.api.addQuestion(examId, draft));
      }
      await this.reload();
      return true;
    } catch (err) {
      this._actionError.set(
        problemDetailMessage(err) ?? this.lang.t('admin.examQuestions.saveError'),
      );
      return false;
    } finally {
      this._actionPendingId.set(null);
    }
  }

  /**
   * Save per-locale exam **title** translations, then refresh. Only non-empty
   * titles are sent (the backend merges per supplied locale; a blank field is
   * omitted, preserving the existing value — it can't clear one). Works on both
   * draft and published exams. Returns `true` on success.
   */
  async saveTranslations(titles: Record<string, string>): Promise<boolean> {
    const examId = this._examId();
    if (examId === null || this._actionPendingId() !== null) return false;
    this._actionPendingId.set('translations');
    this._actionError.set(null);
    const translations: Record<string, { title: string }> = {};
    for (const [locale, title] of Object.entries(titles)) {
      const trimmed = title.trim();
      if (trimmed) translations[locale] = { title: trimmed };
    }
    try {
      await firstValueFrom(this.api.updateTranslations(examId, { translations }));
      await this.reload();
      return true;
    } catch (err) {
      this._actionError.set(
        problemDetailMessage(err) ?? this.lang.t('admin.examQuestions.translationsError'),
      );
      return false;
    } finally {
      this._actionPendingId.set(null);
    }
  }

  /** Delete a question, then refresh (DRAFT only). */
  async deleteQuestion(questionId: string): Promise<boolean> {
    const examId = this._examId();
    if (examId === null || this._actionPendingId() !== null) return false;
    this._actionPendingId.set(questionId);
    this._actionError.set(null);
    try {
      await firstValueFrom(this.api.deleteQuestion(examId, questionId));
      await this.reload();
      return true;
    } catch (err) {
      this._actionError.set(
        problemDetailMessage(err) ?? this.lang.t('admin.examQuestions.actionError'),
      );
      return false;
    } finally {
      this._actionPendingId.set(null);
    }
  }

  /** Clear a lingering row/form-action error (e.g. when a dialog closes). */
  clearActionError(): void {
    this._actionError.set(null);
  }
}
