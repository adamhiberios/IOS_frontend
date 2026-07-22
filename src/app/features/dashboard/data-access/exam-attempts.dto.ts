/**
 * Wire shapes for the student's real-exam attempt history — `GET /exam/attempts`
 * (BE-I-17 / A7). Cursor-paginated, newest-first, `{ data, meta.pagination }`
 * envelope. The backend NEVER returns the answer snapshot. Mirror the JSON
 * exactly; the shared {@link PagedResponse} carries the pagination meta.
 */

import { type PagedResponse } from '@core/http';

/** One real-exam attempt in the caller's own history. */
export interface ExamAttemptItemDto {
  readonly id: string;
  readonly examTitle: string;
  readonly program: string;
  /** Final score 0–100 (may be fractional, e.g. `85.5`). */
  readonly score: number;
  readonly passed: boolean;
  /** ISO-8601 timestamp. */
  readonly submittedAt: string;
  /** Wall-clock duration in seconds; `null` when not recorded. */
  readonly durationSeconds: number | null;
  /** `'submitted'` | `'auto_submitted'`. */
  readonly status: string;
  readonly lateFlag: boolean;
}

/** Cursor-paginated `GET /exam/attempts` response. */
export type ExamAttemptsResponseDto = PagedResponse<ExamAttemptItemDto>;
