/**
 * Wire shapes for the admin exam-assignment endpoints — mirror the backend
 * `ExamAdminController` (`docs/backend-analysis.md` §6.5). Assignment issues a
 * one-time access code (`plainCode`) that is **shown only once**.
 */

/** One published exam in the assign picker (`listPublishedExamsForCert`). */
export interface PublishedExamDto {
  readonly id: string;
  readonly title: string;
  readonly examOrder: number;
  readonly status: string;
  readonly durationMinutes: number;
  readonly passingScore: number;
}

/** `GET /admin/exam?certId=` response — a cert's published exams (no pagination). */
export interface PublishedExamsResponseDto {
  readonly data: readonly PublishedExamDto[];
}

/** Body for `POST /admin/exam/assign` (`AssignExamDto`). Omit `examId` to auto-assign. */
export interface AssignExamBody {
  readonly userId: string;
  readonly certId: string;
  readonly examId?: string;
}

/**
 * `POST /admin/exam/assign` response. `examOrder`/`examTitle` are only present on
 * the auto-assign path (`assignNextExam`); the explicit path omits them.
 */
export interface AssignExamResponseDto {
  readonly plainCode: string;
  readonly expiresAt: string;
  readonly examId: string;
  readonly message: string;
  readonly examOrder?: number;
  readonly examTitle?: string;
}
