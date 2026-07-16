/**
 * Student learning-insights domain model (BE-I-20a / A5) — the aggregates shown
 * on the Dashboard overview. Mirrors `insights.dto.ts`.
 *
 * `realExam.passRate` is a **0–1 fraction** (format as a percentage in the UI);
 * the other counts/scores are plain numbers.
 */

export interface RealExamInsights {
  readonly attempts: number;
  readonly passed: number;
  /** 0–1 fraction — render as a percentage. */
  readonly passRate: number;
  readonly avgScore: number;
  readonly bestScore: number;
}

export interface MockExamInsights {
  readonly attempts: number;
  readonly avgScore: number;
}

export interface StudentInsights {
  readonly enrolledPrograms: number;
  readonly completedLessons: number;
  readonly inProgressPrograms: number;
  readonly realExam: RealExamInsights;
  readonly mockExam: MockExamInsights;
  readonly certificatesEarned: number;
}

/** Format a 0–1 pass-rate fraction as a whole-number percentage (e.g. `0.8` → `80%`). */
export function formatPassRate(fraction: number): string {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  return `${pct}%`;
}
