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
