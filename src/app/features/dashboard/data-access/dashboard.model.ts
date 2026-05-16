/**
 * Dashboard domain types — student overview surface.
 *
 * Covers three view states driven by the student's enrolment & certification count:
 *  · empty     — 0 programs enrolled, 0 exams taken, no subscription
 *  · one-cert  — enrolled, 0 exams taken, 1 valid certification
 *  · two-certs — enrolled, 44 exams taken (24 passed / 20 failed), 2 certifications
 */

// Chart primitive types live in @shared so any feature can use them without
// cross-feature imports. Imported here for use in this file; re-exported for
// backward-compatibility so existing imports from this module keep working.
import type { ExamSummary, MonthlyScore, ScoreFilterYear } from '@shared';

export type { ExamSummary, MonthlyScore, ScoreFilterYear };

/**
 * Certification family — drives the card background colour.
 * · 'esm' → ESM/esm-1  #E8EDF0 (blue-soft)
 * · 'epo' → EPO/epo-1  #EEEFED (green-soft)
 * · 'esf' → neutral    #F6F6F6
 */
export type CertFamily = 'esm' | 'epo' | 'esf';

/** Lightweight certification record shown in the "Valid certification" section. */
export interface ValidCertification {
  /** Short cert code shown in the badge (e.g. "ESM-P"). */
  readonly code: string;
  /** Human-readable full name (e.g. "Endorsed Scrum Master Practitioner"). */
  readonly name: string;
  /** Asset path for the badge SVG/PNG (relative to deployed `/assets/`). */
  readonly badgeAsset: string;
  /** Completion progress 0–100 used for the progress row. */
  readonly progressPercent: number;
  /** Determines the card background colour. */
  readonly family: CertFamily;
}

/**
 * Content for the "Complete your learning" card — 3rd column of the charts row.
 *
 * Two Figma variants:
 *  · First-file state  → red CTA "Start learning"      (node 13570-24378)
 *  · Ready-to-test     → dark CTA "Start Final Test"   (node 17453-34583)
 */
export interface LearningCardContent {
  /** Asset path for the illustration image (148 × 148 px). */
  readonly illustration: string;
  /** Primary heading inside the card (18px Bold #272827). */
  readonly heading: string;
  /** Body text below the heading (16px Medium #373837). */
  readonly body: string;
  /** Optional meta line, e.g. "15 pages" (14px Medium #666766). */
  readonly meta?: string;
  /** CTA button label. */
  readonly ctaLabel: string;
  /** 'primary' → dark-red #8b0000  |  'dark' → near-black #272827. */
  readonly ctaStyle: 'primary' | 'dark';
  /** Router path the CTA navigates to. */
  readonly ctaRoute: string;
}

/**
 * Full snapshot of the student's dashboard stats.
 * The store exposes a `computed()` of this type.
 */
export interface DashboardStats {
  readonly programsEnrolled: number;
  /** Weighted average mock-test score across all attempts (0–100). */
  readonly averageScorePercent: number;
  /** Total learning time in minutes. Displayed as "Xh Ym" / "00h". */
  readonly totalTimeMinutes: number;
  readonly monthlyScores: readonly MonthlyScore[];
  readonly examSummary: ExamSummary;
  /**
   * Active certifications — drives cert section below charts row:
   *  · length 0  → no cert section
   *  · length 1+ → "Valid certification" heading + cert card(s)
   */
  readonly validCertifications: readonly ValidCertification[];
  /**
   * "Complete your learning" card shown as 3rd column of the charts row.
   * null → charts row is 2-col [bar | donut] only.
   * non-null → charts row is 3-col [bar | donut | learning-card].
   */
  readonly learningCard: LearningCardContent | null;
}
