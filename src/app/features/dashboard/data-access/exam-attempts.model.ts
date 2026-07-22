/**
 * Student real-exam attempt-history domain model (BE-I-17 / A7) — the "Real exam
 * results" list on the Dashboard overview. Mirrors `exam-attempts.dto.ts`.
 *
 * The list is cursor-paginated (newest-first). `score` is 0–100 and may be
 * fractional; the backend never exposes the answer snapshot here.
 */

import { type CursorQuery } from '@core/http';

/** Attempt terminal status as returned by the backend (`AttemptStatus`). */
export type ExamAttemptStatus = 'submitted' | 'auto_submitted';

export interface ExamAttempt {
  readonly id: string;
  readonly examTitle: string;
  readonly program: string;
  /** Final score 0–100 (may be fractional). */
  readonly score: number;
  readonly passed: boolean;
  /** ISO-8601 timestamp of submission. */
  readonly submittedAt: string;
  /** Duration in seconds, or `null` when not recorded. */
  readonly durationSeconds: number | null;
  readonly status: ExamAttemptStatus;
  /** `true` when the attempt was submitted after the deadline. */
  readonly lateFlag: boolean;
}

/** Query for the `GET /exam/attempts` list. */
export type ExamAttemptsQuery = CursorQuery;

/**
 * Format a duration in seconds as a compact `Hh Mm` / `Mm` / `Ss` string.
 * Returns `null` when the backend didn't record a duration so callers can
 * render a placeholder. Never shows a bare `0`.
 */
export function formatDuration(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return null;
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/** Round a 0–100 score to at most one decimal place for display (`85.5`, `72`). */
export function formatScore(score: number): string {
  return `${Math.round(score * 10) / 10}`;
}
