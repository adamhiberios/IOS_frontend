/**
 * Wire shapes for the admin mock-question authoring endpoints — mirror the
 * backend `mock-exam.dtos.ts` + the service's `adminQuestionDto`
 * (`docs/backend-analysis.md` §6.6, §7.5). The admin authoring view **exposes**
 * `isCorrect` on each option (unlike the student runner, which strips it).
 */

/** One answer option as returned by the authoring view. */
export interface MockQuestionOptionDto {
  readonly id: string;
  readonly optionText: string;
  readonly isCorrect: boolean;
}

/** One mock question (`adminQuestionDto`). */
export interface MockQuestionDto {
  readonly id: string;
  readonly certId: string;
  readonly questionText: string;
  /** `mcq | true_false`. */
  readonly questionType: string;
  readonly position: number;
  readonly active: boolean;
  readonly options: readonly MockQuestionOptionDto[];
}

/** `GET /admin/mock/certs/:certId/questions` — the full bank (no pagination). */
export interface MockQuestionsListResponseDto {
  readonly data: readonly MockQuestionDto[];
}

/** `POST` / `PATCH /admin/mock/questions[/:id]` — the single-question envelope. */
export interface MockQuestionDetailResponseDto {
  readonly data: MockQuestionDto;
}

/** One option in a write payload (`MockQuestionOptionDto` on the backend). */
export interface MockQuestionOptionInput {
  readonly optionText: string;
  readonly isCorrect: boolean;
}

/** Body for `POST /admin/mock/questions` (`CreateMockQuestionDto`). */
export interface CreateMockQuestionBody {
  readonly certId: string;
  readonly questionText: string;
  readonly questionType?: string;
  readonly position?: number;
  readonly options: readonly MockQuestionOptionInput[];
}

/**
 * Body for `PATCH /admin/mock/questions/:id` (`UpdateMockQuestionDto`).
 * All optional; when `options` is supplied it **replaces** the whole set.
 */
export interface UpdateMockQuestionBody {
  readonly questionText?: string;
  readonly questionType?: string;
  readonly position?: number;
  readonly active?: boolean;
  readonly options?: readonly MockQuestionOptionInput[];
}
