/**
 * Domain model for the student mock-exam engine (`features/certificates`, wired
 * to the backend `/mock/*` endpoints). Wire field names are kept out of the
 * store/UI via `mock.mappers.ts`.
 *
 * Mock vs. real exam: the timer is soft (extendable, never auto-submits), the
 * correct answer is revealed (reveal + review), and mock results never issue a
 * certificate — `readyForFinal` is advisory only.
 */

/** Backend attempt status — known values: `in_progress`, `submitted`. Kept as a
 *  loose alias (the backend types it loosely) so mappers pass it through as-is. */
export type MockAttemptStatus = string;

export interface MockOption {
  readonly id: string;
  readonly text: string;
}

export interface MockQuestion {
  readonly id: string;
  readonly text: string;
  readonly type: string;
  readonly position: number;
  readonly options: readonly MockOption[];
}

/** Result of `POST /mock/start` — the attempt is live. */
export interface MockStart {
  readonly attemptId: string;
  readonly certId: string;
  readonly durationSeconds: number;
  readonly expiresAt: string;
  readonly extensionsRemaining: number;
  readonly questionCount: number;
  readonly questions: readonly MockQuestion[];
}

/** Live session snapshot from `GET /mock/:id` (resume). */
export interface MockSession {
  readonly attemptId: string;
  readonly certId: string;
  readonly status: MockAttemptStatus;
  readonly remainingSeconds: number;
  /** Soft-timer hit zero; the attempt stays live (advisory). */
  readonly timeUp: boolean;
  readonly extensionsUsed: number;
  readonly extensionsRemaining: number;
  readonly answers: Readonly<Record<string, string>>;
  readonly questions: readonly MockQuestion[];
}

/** Outcome of `POST /mock/:id/extend`. */
export interface MockExtension {
  readonly extensionsUsed: number;
  readonly extensionsRemaining: number;
  readonly remainingSeconds: number;
}

/** Advisory readiness signal (never blocks the real exam). */
export interface MockReadiness {
  readonly readyForFinal: boolean;
  readonly thresholdPct: number;
  readonly message: string;
}

/** Graded result of `POST /mock/:id/submit`. */
export interface MockResult {
  readonly attemptId: string;
  readonly certId: string;
  readonly status: MockAttemptStatus;
  /** 0–100, two decimals. */
  readonly score: number;
  readonly correctCount: number;
  readonly totalCount: number;
  readonly falseCount: number;
  readonly readyForFinal: boolean;
  readonly readiness: MockReadiness;
  readonly durationSeconds: number;
}

/** Reveal result for a single question (mock-only "Hint"). */
export interface MockReveal {
  readonly selectedCorrect: boolean;
  readonly correctOptionId: string | null;
}

/** A row in the mock attempt history. */
export interface MockHistoryItem {
  readonly attemptId: string;
  readonly certId: string;
  readonly status: MockAttemptStatus;
  readonly score: number | null;
  readonly correctCount: number | null;
  readonly totalCount: number | null;
  readonly falseCount: number | null;
  readonly readyForFinal: boolean | null;
  readonly extensionsUsed: number;
  readonly startedAt: string;
  readonly submittedAt: string | null;
}

/** A per-question row in a submitted attempt's review (reveals the answer key). */
export interface MockReviewQuestion {
  readonly questionId: string;
  readonly questionText: string | null;
  readonly options: readonly MockOption[];
  readonly selectedOptionId: string | null;
  readonly correctOptionId: string | null;
  readonly isCorrect: boolean;
}

/** Full review payload for a submitted attempt (`GET /mock/attempts/:id`). */
export interface MockReview {
  readonly attemptId: string;
  readonly certId: string;
  readonly status: MockAttemptStatus;
  readonly score: number | null;
  readonly correctCount: number;
  readonly totalCount: number;
  readonly falseCount: number;
  readonly readyForFinal: boolean;
  readonly readiness: MockReadiness;
  readonly extensionsUsed: number;
  readonly startedAt: string;
  readonly submittedAt: string | null;
  readonly durationSeconds: number;
  readonly questions: readonly MockReviewQuestion[];
}
