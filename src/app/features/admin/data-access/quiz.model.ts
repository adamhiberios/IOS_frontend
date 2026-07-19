/**
 * Frontend domain model for lesson-quiz authoring (BE-I-06 / B5).
 * Mirrors `quiz.dto.ts`. Authoring views expose `correctAnswer` (the
 * student-facing endpoints strip it).
 *
 * Create/edit quiz + add/edit question: content_creator / learning_admin.
 * Delete quiz + delete question: learning_admin only (backend-enforced).
 */

export interface QuizQuestion {
  readonly id: string;
  readonly quizId: string;
  readonly questionText: string;
  readonly correctAnswer: string;
  /** MCQ options; null (or empty) means a free-text question. */
  readonly options: readonly string[] | null;
  readonly position: number;
}

export interface Quiz {
  readonly id: string;
  readonly lessonId: string;
  readonly title: string;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly questions: readonly QuizQuestion[];
}

/** True when the question is multiple-choice (has a non-empty option set). */
export function isMcq(question: QuizQuestion): boolean {
  return question.options !== null && question.options.length > 0;
}

/**
 * A question being authored. `options` empty = free-text; otherwise it must hold
 * ≥ 2 entries **including** `correctAnswer` (the backend enforces this too).
 */
export interface QuestionDraft {
  readonly questionText: string;
  readonly correctAnswer: string;
  readonly options: readonly string[];
  readonly position?: number;
}

/** Minimum options for a multiple-choice question. */
export const QUIZ_MIN_OPTIONS = 2;
