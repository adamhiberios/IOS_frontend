/**
 * Wire shapes for the admin exam-authoring endpoints — mirror the backend
 * `ExamAuthoringController` (`docs/backend-analysis.md` §6.5). This increment
 * covers the exam list + lifecycle; question authoring lands in a follow-up.
 */

/** One exam row from `GET /admin/certs/:certId/exams` (full entity + count). */
export interface ExamListItemDto {
  readonly id: string;
  readonly certId: string;
  readonly title: string;
  readonly examOrder: number;
  /** `draft | published`. */
  readonly status: string;
  readonly passingScore: number;
  readonly durationMinutes: number;
  readonly questionCount: number;
}

/** `GET /admin/certs/:certId/exams` response — all statuses, ordered by examOrder. */
export interface ExamListResponseDto {
  readonly data: readonly ExamListItemDto[];
}

/** Body for `POST /admin/certs/:certId/exams` (`CreateExamDto`, meta only). */
export interface CreateExamBody {
  readonly title: string;
  readonly examOrder: number;
  readonly durationMinutes: number;
  readonly passingScore?: number;
}

/** Body for `PATCH /admin/exams/:examId` (`UpdateExamDto`, all optional). */
export interface UpdateExamBody {
  readonly title?: string;
  readonly examOrder?: number;
  readonly durationMinutes?: number;
  readonly passingScore?: number;
}

// ── Authoring detail (exam + questions) ──────────────────────────────────────

/** One answer option in the authoring view (`isCorrect` IS exposed here). */
export interface ExamQuestionOptionDto {
  readonly id: string;
  readonly optionText: string;
  readonly isCorrect: boolean;
}

/** One question with its options (`ExamQuestion`). */
export interface ExamQuestionDto {
  readonly id: string;
  readonly questionText: string;
  /** `mcq | true_false`. */
  readonly questionType: string;
  readonly position: number;
  readonly marks: number;
  readonly options: readonly ExamQuestionOptionDto[];
}

/** `GET /admin/exams/:examId` — the full authoring view (exam meta + questions). */
export interface ExamDetailDto {
  readonly id: string;
  readonly certId: string;
  readonly title: string;
  readonly examOrder: number;
  readonly status: string;
  readonly passingScore: number;
  readonly durationMinutes: number;
  readonly questions: readonly ExamQuestionDto[];
}

/** `GET /admin/exams/:examId` response envelope. */
export interface ExamDetailResponseDto {
  readonly data: ExamDetailDto;
}

/** One option in a question write payload (`CreateOptionDto`). */
export interface QuestionOptionInput {
  readonly optionText: string;
  readonly isCorrect: boolean;
}

/** Body for `POST /admin/exams/:examId/questions` (`CreateQuestionDto`). */
export interface CreateQuestionBody {
  readonly questionText: string;
  readonly questionType: string;
  readonly position?: number;
  readonly marks?: number;
  readonly options: readonly QuestionOptionInput[];
}

/**
 * Body for `PATCH /admin/exams/:examId/questions/:questionId`
 * (`UpdateQuestionDto`). When `options` is supplied it **replaces** the set.
 */
export interface UpdateQuestionBody {
  readonly questionText?: string;
  readonly questionType?: string;
  readonly position?: number;
  readonly marks?: number;
  readonly options?: readonly QuestionOptionInput[];
}
