/**
 * Dashboard domain types — student overview surface.
 *
 * Wired to real data (checklist item 14, 2026-07-26):
 *  · `validCertifications` ← `CoursesStore.progress()` (`GET /learning/progress`)
 *    joined with `PublicCatalogStore` for the catalog title/track.
 *  · `monthlyScores` / `examSummary` ← `MockStore.history()` (`GET /mock/history`,
 *    the source the Figma "Mock test scores" chart always meant — matches the
 *    `dashboard.charts.mockTestScores` i18n key), bucketed client-side.
 *  · `learningCard` ← derived from the least-complete in-progress enrolment.
 *
 * The old three canned "empty / one-cert / two-certs" scenarios are gone —
 * `DashboardStore` is now a pure aggregator over other feature stores.
 */

import type { CertFamily, ExamSummary, MonthlyScore, ScoreFilterYear } from '@shared';

export type { ExamSummary, MonthlyScore, ScoreFilterYear };

// Moved to `@shared` so public pages (certificate verification) can use them
// without importing from this feature. Re-exported for existing callers.
export { type CertFamily, resolveBadgeAsset, resolveCertFamily } from '@shared';

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
  /** Underlying certificate id — used to route "Show details" / "Continue". */
  readonly certId: string;
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
