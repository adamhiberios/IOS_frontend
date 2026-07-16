/**
 * Wire shapes for the student learning-insights endpoint (BE-I-20a / A5).
 * `GET /insights` (student only — admins get 403) returns a **bare** aggregate
 * object (no envelope). Mirror the backend JSON exactly.
 *
 * Consumed only by the Dashboard overview. Distinct domain from the public
 * `features/insights` blog — the backend `/insights` path is student analytics.
 */

/** Real (proctored) exam aggregates. `passRate` is a 0–1 fraction. */
export interface RealExamInsightsDto {
  readonly attempts: number;
  readonly passed: number;
  readonly passRate: number;
  readonly avgScore: number;
  readonly bestScore: number;
}

/** Mock (practice) exam aggregates. */
export interface MockExamInsightsDto {
  readonly attempts: number;
  readonly avgScore: number;
}

/** Bare `GET /insights` response — the student's learning + exam aggregates. */
export interface StudentInsightsDto {
  readonly enrolledPrograms: number;
  readonly completedLessons: number;
  readonly inProgressPrograms: number;
  readonly realExam: RealExamInsightsDto;
  readonly mockExam: MockExamInsightsDto;
  readonly certificatesEarned: number;
}
