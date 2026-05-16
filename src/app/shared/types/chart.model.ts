/**
 * Shared chart domain types — used by any feature that renders
 * mock-test score bar charts or exam-summary donut charts.
 */

/** One monthly bucket for the mock-test score bar chart. */
export interface MonthlyScore {
  /** Short month label shown on the x-axis (Jan, Feb, …). */
  readonly month: string;
  /** Average percentage score for that month (0–100). Null when no data. */
  readonly score: number | null;
}

/** Summary of passed / failed mock exams for the donut chart. */
export interface ExamSummary {
  readonly passed: number;
  readonly failed: number;
}

/** Which year filter is active on the bar chart. */
export type ScoreFilterYear = 'this_year' | 'last_year';

/** One daily bucket for the mock-test score line chart. */
export interface WeeklyScore {
  /** Short day label shown on the x-axis (Sat, Sun, Mon, …). */
  readonly day: string;
  /** Average percentage score for that day (0–100). Null when no data. */
  readonly score: number | null;
}

/** Which week filter is active on the line chart. */
export type ScoreFilterWeek = 'this_week' | 'last_week';
