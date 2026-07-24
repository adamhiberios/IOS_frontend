/**
 * Real-exam domain model — the backend-resolved types for the student exam
 * engine (`features/assessments`). See `/docs/08-exam-engine.md` (the exam-engine
 * spec, internally numbered 09) for the design, and the "Backend ↔ Frontend
 * reconciliation" note below for where the live backend differs from that spec.
 *
 * ── Reconciliation with docs 08/09 (the spec is aspirational) ────────────────
 * The deployed backend (`IOS_Backend/src/modules/exam`) implements a simpler
 * contract than the spec describes. The differences that shape these types:
 *
 *  • Answers are a flat `Record<questionId, optionId>` map — single-select only
 *    (`mcq` | `true_false`). There is no per-answer op on the wire, no
 *    discriminated `AnswerValue` union, and no essay type.
 *  • `clientSeq` is NOT sent to the server. Autosave/submit post the whole
 *    current answers map (last-write-wins). `clientSeq` here is a
 *    frontend-internal monotonic key used only to order/dedupe IndexedDB draft
 *    rows (Slice 2) — it never leaves the browser.
 *  • The backend never returns the answer key or per-question correctness after
 *    submission (BE-I-22) — only an aggregate `ExamScoreResult`. Hence there is
 *    no `correctOptionId` on `ExamQuestion`.
 *  • `POST /start` issues no per-session encryption key — draft encryption
 *    (spec §7) is out; drafts hold only `{ questionId, optionId }` (no PII).
 */

/** Question types the backend supports. Both are single-select. */
export type ExamQuestionType = 'mcq' | 'true_false';

/** A selectable answer option, with the correct-answer flag stripped by the backend. */
export interface ExamOption {
  /** Option UUID — the value posted back as the answer. */
  readonly id: string;
  /** Display text (`optionText` on the wire). */
  readonly text: string;
}

/** A single exam question as delivered by `POST /exam/start` (no correct answer). */
export interface ExamQuestion {
  /** Question UUID. */
  readonly id: string;
  /** Question prompt (`questionText` on the wire). */
  readonly text: string;
  /** `mcq` | `true_false`. */
  readonly type: ExamQuestionType;
  /** 1-based display order (`position` on the wire). */
  readonly position: number;
  /** Answer options in display order. */
  readonly options: readonly ExamOption[];
}

/**
 * The value of a single answer. v1 is single-select, so this is the chosen
 * option's UUID. Kept as a named alias (not a bare `string`) so the sync/draft
 * layers read intently and a future multi-select type has one place to grow.
 */
export type AnswerValue = string;

/** questionId → selected option UUID. The exact shape posted to autosave/submit. */
export type AnswerMap = Readonly<Record<string, AnswerValue>>;

/**
 * A frontend-internal answer operation for the IndexedDB draft queue (Slice 2).
 * `clientSeq` orders writes locally and is NEVER sent to the backend — the wire
 * payload is always the full {@link AnswerMap}.
 */
export interface AnswerOp {
  readonly sessionId: string;
  readonly questionId: string;
  readonly value: AnswerValue;
  /** Monotonic per session; frontend-only ordering/dedupe key. */
  readonly clientSeq: number;
}

/** High-level runner state machine (mirrors spec §4). */
export type SessionStatus =
  | 'idle'
  | 'starting'
  | 'in-exam'
  | 'reviewing'
  | 'submitting'
  | 'submitted'
  | 'expired'
  | 'error';

/** Draft/answer sync state surfaced to the connection indicator. */
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'queued' | 'error';

/**
 * Server-side session lifecycle status, mirrored from the backend
 * `TestSessionStatus` enum (`active` | `submitted` | `expired` | `auto_submitted`).
 */
export type TestSessionStatus = 'active' | 'submitted' | 'expired' | 'auto_submitted';

/**
 * Pre-start preview from `POST /exam/validate-access` — validates the one-time
 * access code WITHOUT consuming it and returns exam metadata + code expiry.
 * Note: the backend does NOT return `certId` here; the caller must carry it from
 * the originating page (dashboard / exam-history card) via navigation state.
 */
export interface ExamAccessPreview {
  readonly valid: boolean;
  readonly accessCodeId: string;
  /** ISO-8601 timestamp the access code expires. */
  readonly expiresAt: string;
  readonly exam: {
    readonly id: string;
    readonly title: string;
    readonly durationMinutes: number;
    /** Passing threshold as a percentage (0–100). */
    readonly passingScore: number;
  };
}

/** Result of `POST /exam/start` — the session is now live and the clock is running. */
export interface ExamSessionStart {
  readonly sessionId: string;
  readonly durationSeconds: number;
  /** ISO-8601 timestamp the session clock hits zero. */
  readonly expiresAt: string;
  readonly questions: readonly ExamQuestion[];
}

/**
 * Snapshot from `GET /exam/sessions/:sessionId` — the authoritative baseline used
 * to resume a reloaded tab. `answers` are the student's own last-saved picks
 * (never a key), `remainingSeconds` comes from the Redis TTL.
 */
export interface ExamSessionSnapshot {
  readonly sessionId: string;
  readonly remainingSeconds: number;
  readonly answers: AnswerMap;
  readonly status: TestSessionStatus;
}

/**
 * Aggregate scoring result from `POST /exam/sessions/:id/submit` and
 * `.../late-submit`. This is the ONLY post-submission data the backend exposes —
 * there is no per-question correctness or answer key (BE-I-22).
 */
export interface ExamScoreResult {
  /** 0–100, two decimal places. */
  readonly score: number;
  readonly passed: boolean;
  readonly correctCount: number;
  readonly totalCount: number;
}

/**
 * Router navigation state handed from the verify page to the ready page after a
 * successful `validate-access` — carries the (unconsumed) access code and the
 * resolved exam metadata so the ready page can `start` without re-validating.
 */
export interface ExamReadyNavState {
  readonly code: string;
  readonly examId: string;
  readonly examTitle: string;
  readonly durationMinutes: number;
  /** Attestation captured on verify (journeys p.4); display/context only. */
  readonly fullName?: string;
}

/**
 * Router navigation state handed from the runner to the result page on submit.
 * `score` is `null` for a terminal race (already-submitted / grace closed) where
 * the backend scored without returning a body — the result page then shows a
 * neutral "results are in your history" state.
 */
export interface ExamResultNavState {
  readonly score: ExamScoreResult | null;
  readonly examTitle?: string;
}

/**
 * Attestation payload for `POST /exam/pre-exam-confirmation`. `fullName` /
 * `idNumber` are validated client-side and NOT persisted by the backend — only
 * the purchase's `pre_exam_confirmed` flag is flipped. Required before starting
 * an exam when the student enrolled via purchase.
 */
export interface PreExamConfirmation {
  readonly certId: string;
  readonly fullName: string;
  readonly idNumber?: string;
}

/**
 * Locally-persisted session snapshot, written to IndexedDB at start so the
 * runner can rehydrate after a full tab reload — INCLUDING offline.
 *
 * ── Why this exists (backend gap BE-I-23) ────────────────────────────────────
 * `GET /exam/sessions/:id` returns the student's answers, remaining time, and
 * status but NOT the questions, and `POST /start` cannot be replayed (the code
 * is already consumed → 409). Without a local copy of the questions the runner
 * cannot redraw the exam on reload, and an offline reload cannot reach the
 * server at all. The questions carry no correct-answer flag and no PII, so
 * persisting them is a defence-in-depth-neutral extension of the draft buffer —
 * flagged for architect review (stretches the "answer drafts only" storage rule).
 */
export interface PersistedExamSession {
  readonly sessionId: string;
  readonly examId?: string;
  readonly examTitle?: string;
  /** Carried from the originating page so a resumed runner still knows its cert. */
  readonly certId?: string;
  readonly durationSeconds: number;
  /** ISO-8601 — used as an offline fallback to estimate remaining time. */
  readonly expiresAt: string;
  readonly questions: readonly ExamQuestion[];
}
