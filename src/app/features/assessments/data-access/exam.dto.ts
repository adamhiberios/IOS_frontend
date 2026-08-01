/**
 * Wire DTOs for the real-exam engine — verbatim shapes from the backend
 * `@Controller('exam')` (`IOS_Backend/src/modules/exam/exam.controller.ts` +
 * `dto/exam.dtos.ts`). Field names mirror the backend exactly; the mappers
 * (`exam.mappers.ts`) translate to/from the domain model.
 *
 * All exam endpoints return BARE DTOs (no `{ data }` envelope) — cf. BE-I-01.
 * The bearer token is attached by `authInterceptor`; `X-Lang` by `localeInterceptor`.
 */

// ── Requests ─────────────────────────────────────────────────────────────────

/** Body for `POST /exam/pre-exam-confirmation`. */
export interface PreExamConfirmationRequestDto {
  readonly certId: string;
  /** Attestation only — NOT persisted by the backend. */
  readonly fullName: string;
  /** Attestation only — NOT persisted by the backend. */
  readonly idNumber?: string;
}

/** Body for `POST /exam/validate-access`. `examId` is optional (resolved from the code). */
export interface ValidateAccessRequestDto {
  readonly code: string;
  readonly examId?: string;
}

/** Body for `POST /exam/start`. Same token as validate-access. */
export interface StartExamRequestDto {
  readonly code: string;
  readonly examId?: string;
}

/** Body for `POST /exam/sessions/:id/autosave` and `.../submit` / `.../late-submit`. */
export interface AnswersRequestDto {
  /** questionId → optionId. */
  readonly answers: Record<string, string>;
}

// ── Responses ────────────────────────────────────────────────────────────────

/** `POST /exam/pre-exam-confirmation` → 200. */
export interface PreExamConfirmationResponseDto {
  readonly message: string;
}

/** Option as delivered by `POST /exam/start` — `isCorrect` is stripped server-side. */
export interface ExamOptionDto {
  readonly id: string;
  readonly optionText: string;
}

/** Question as delivered by `POST /exam/start`. */
export interface ExamQuestionDto {
  readonly id: string;
  readonly questionText: string;
  /** `mcq` | `true_false`. */
  readonly questionType: string;
  readonly position: number;
  readonly options?: readonly ExamOptionDto[];
}

/** `POST /exam/validate-access` → 200. */
export interface ValidateAccessResponseDto {
  readonly valid: boolean;
  readonly accessCodeId: string;
  /** ISO-8601 (backend serialises a Date). */
  readonly expiresAt: string;
  readonly exam: {
    readonly id: string;
    readonly title: string;
    readonly durationMinutes: number;
    readonly passingScore: number;
  };
}

/** `POST /exam/start` → 201. */
export interface StartExamResponseDto {
  readonly sessionId: string;
  readonly durationSeconds: number;
  /** ISO-8601 (backend serialises a Date). */
  readonly expiresAt: string;
  readonly questions: readonly ExamQuestionDto[];
}

/** `GET /exam/sessions/:sessionId` → 200. */
export interface SessionStatusResponseDto {
  readonly sessionId: string;
  readonly remainingSeconds: number;
  /** questionId → optionId (the student's own last-saved picks). */
  readonly answers: Record<string, string>;
  /** Backend `TestSessionStatus` enum: active | submitted | expired | auto_submitted. */
  readonly status: string;
}

/** `POST /exam/sessions/:id/autosave` → 200. */
export interface AutosaveResponseDto {
  readonly saved: boolean;
}

/** `POST /exam/sessions/:id/submit` and `.../late-submit` → 200. */
export interface ScoreResultDto {
  readonly score: number;
  readonly passed: boolean;
  readonly correctCount: number;
  readonly totalCount: number;
}

/* ─── Post-submission answer review (BE-I-22, fixed by backend `66a7632`) ─── */

/**
 * `GET /exam/attempts/:attemptId/review` — the **only** real-exam surface that
 * exposes the answer key (`exam-attempt-review-response.dto.ts`).
 *
 * Owner-only (`exam_attempts` is FORCE-RLS) and gated to **terminal** attempts:
 *   - **403** the attempt belongs to someone else
 *   - **404** unknown attempt
 *   - **422** the attempt is still in progress
 *
 * Unlike every other student exam endpoint, options here carry `isCorrect`.
 */
export interface ReviewOptionDto {
  readonly id: string;
  readonly optionText: string;
  readonly isCorrect: boolean;
}

export interface ReviewQuestionDto {
  readonly questionId: string;
  readonly questionText: string;
  /** `mcq | true_false`. */
  readonly questionType: string;
  readonly position: number;
  readonly options: readonly ReviewOptionDto[];
  /** The student's pick, or `null` when they left it unanswered. */
  readonly selectedOptionId: string | null;
  readonly correctOptionId: string | null;
  readonly isCorrect: boolean;
  /**
   * Rationale for the correct answer. **Always `null` today** — the backend
   * documents it as reserved until an explanation field is added to the
   * question bank, so the UI must treat it as optional, not assume prose.
   */
  readonly explanation: string | null;
}

export interface ExamAttemptReviewDto {
  readonly attemptId: string;
  readonly examId: string;
  readonly examTitle: string;
  readonly program: string;
  readonly score: number;
  readonly passed: boolean;
  readonly correctCount: number;
  readonly totalCount: number;
  readonly submittedAt: string;
  readonly status: string;
  readonly questions: readonly ReviewQuestionDto[];
}

/** `{ data }` envelope. */
export interface ExamAttemptReviewResponseDto {
  readonly data: ExamAttemptReviewDto;
}
