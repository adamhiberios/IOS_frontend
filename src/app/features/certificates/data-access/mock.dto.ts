/**
 * Wire DTOs for the student mock-exam engine — verbatim shapes from the backend
 * `@Controller('mock')` (`IOS_Backend/src/modules/mock-exam`). Field names mirror
 * the backend; `mock.mappers.ts` translates to the domain model.
 *
 * Key differences from the real exam (see `features/assessments`): the mock timer
 * is **soft / non-terminal** (extendable, never auto-submits), the correct answer
 * IS revealed (reveal endpoint + review payload), and history is cursor-paginated.
 * The bearer token is attached by `authInterceptor`; `X-Lang` by `localeInterceptor`.
 */

// ── Requests ─────────────────────────────────────────────────────────────────

export interface StartMockRequestDto {
  readonly certId: string;
}

/** Autosave / submit bodies — questionId → optionId. Submit answers are optional. */
export interface MockAnswersRequestDto {
  readonly answers: Record<string, string>;
}

// ── Shared question shape (options stripped of `isCorrect`) ──────────────────

export interface MockOptionDto {
  readonly id: string;
  readonly optionText: string;
}

export interface MockQuestionDto {
  readonly id: string;
  readonly questionText: string;
  readonly questionType: string;
  readonly position: number;
  readonly options: readonly MockOptionDto[];
}

// ── Responses ────────────────────────────────────────────────────────────────

/** `POST /mock/start` → 201. */
export interface StartMockResponseDto {
  readonly attemptId: string;
  readonly certId: string;
  readonly durationSeconds: number;
  readonly expiresAt: string;
  readonly extensionsRemaining: number;
  readonly questionCount: number;
  readonly questions: readonly MockQuestionDto[];
}

/** `GET /mock/:id` — live session (resume). */
export interface MockSessionResponseDto {
  readonly attemptId: string;
  readonly certId: string;
  readonly status: string;
  readonly remainingSeconds: number;
  /** Advisory: soft timer hit zero; the attempt stays live. */
  readonly timeUp: boolean;
  readonly extensionsUsed: number;
  readonly extensionsRemaining: number;
  readonly answers: Record<string, string>;
  readonly questions: readonly MockQuestionDto[];
}

/** `POST /mock/:id/autosave` → 200. */
export interface MockAutosaveResponseDto {
  readonly saved: boolean;
  readonly answeredCount: number;
  readonly timeUp: boolean;
}

/** `POST /mock/:id/extend` → 200 (422 when the cap is exhausted). */
export interface MockExtendResponseDto {
  readonly attemptId: string;
  readonly extensionsUsed: number;
  readonly extensionsRemaining: number;
  readonly remainingSeconds: number;
}

/** Advisory readiness signal on submit / review. */
export interface MockReadinessDto {
  readonly readyForFinal: boolean;
  readonly thresholdPct: number;
  readonly advisory: boolean;
  readonly message: string;
  readonly finalExamAssignment: string;
}

/** `POST /mock/:id/submit` → 200 (graded result; 409 already submitted). */
export interface MockResultResponseDto {
  readonly attemptId: string;
  readonly certId: string;
  readonly status: string;
  readonly score: number;
  readonly correctCount: number;
  readonly totalCount: number;
  readonly falseCount: number;
  readonly readyForFinal: boolean;
  readonly readiness: MockReadinessDto;
  readonly durationSeconds: number;
}

/** `POST /mock/:id/questions/:questionId/reveal` → 200 (mock-only "Hint"). */
export interface MockRevealResponseDto {
  readonly selectedCorrect: boolean;
  readonly correctOptionId: string | null;
}

// ── History (GET /mock/history — cursor-paginated) ───────────────────────────

export interface MockHistoryItemDto {
  readonly attemptId: string;
  readonly certId: string;
  readonly status: string;
  readonly score: number | null;
  readonly correctCount: number | null;
  readonly totalCount: number | null;
  readonly falseCount: number | null;
  readonly readyForFinal: boolean | null;
  readonly extensionsUsed: number;
  readonly startedAt: string;
  readonly submittedAt: string | null;
}

// ── Review (GET /mock/attempts/:id — reveals answers; 422 if not submitted) ──

export interface MockReviewQuestionDto {
  readonly questionId: string;
  readonly questionText: string | null;
  readonly options: readonly MockOptionDto[];
  readonly selectedOptionId: string | null;
  readonly correctOptionId: string | null;
  readonly isCorrect: boolean;
}

export interface MockReviewResponseDto {
  readonly data: {
    readonly attemptId: string;
    readonly certId: string;
    readonly status: string;
    readonly score: number | null;
    readonly correctCount: number;
    readonly totalCount: number;
    readonly falseCount: number;
    readonly readyForFinal: boolean;
    readonly readiness: MockReadinessDto;
    readonly extensionsUsed: number;
    readonly startedAt: string;
    readonly submittedAt: string | null;
    readonly durationSeconds: number;
    readonly questions: readonly MockReviewQuestionDto[];
  };
}
