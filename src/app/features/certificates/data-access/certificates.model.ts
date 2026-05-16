/**
 * Certificates feature domain types.
 *
 * Covers:
 *  · My Certificates list page — enrolled header rows + "All certifications" grid
 *  · Certificate detail page   — left side-nav, stat cards, charts, cert card
 */

import type {
  ExamSummary,
  MonthlyScore,
  ScoreFilterYear,
  WeeklyScore,
  ScoreFilterWeek,
} from '@shared';

// Re-export shared chart types so pages/components within this feature
// don't need a second import.
export type { ExamSummary, MonthlyScore, ScoreFilterYear, WeeklyScore, ScoreFilterWeek };

/* ─────────────────────────────────────────────────────────────────────────────
 * Learning Materials
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Progress/action status of a single learning material file.
 *
 * · 'not_started' — file has never been opened.
 * · 'in_progress' — partially read.
 * · 'completed'   — all pages read.
 */
export type MaterialStatus = 'not_started' | 'in_progress' | 'completed';

/**
 * One session/file row in the Learning Materials tab.
 *
 * Figma node 17732-48169 (files list).
 */
export interface LearningMaterial {
  /** Stable identifier — e.g. "session-1-a". */
  readonly id: string;
  /** Display title shown in bold — e.g. "Session 1". */
  readonly title: string;
  /** Current page the learner is on (1-based). */
  readonly currentPage: number;
  /** Total pages in the document. */
  readonly totalPages: number;
  /** Completion percentage 0–100 (drives the progress ring / checkmark). */
  readonly completionPercent: number;
  /** Lifecycle status used for the action label. */
  readonly status: MaterialStatus;
  /**
   * Call-to-action label shown at the end of the row.
   * Examples: "Open", "Continue", "In Progress", "Not Started", "Completed".
   */
  readonly actionLabel: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Session viewer
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * One chapter/section in the left sidebar of the session viewer.
 * Active item is highlighted with a dark left border (`#143d56`).
 *
 * Figma: node 17732-48585.
 */
export interface SessionChapter {
  /** Stable identifier — e.g. "ch-introduction". */
  readonly id: string;
  /** Sidebar label — e.g. "Introduction". */
  readonly title: string;
  /** Body content rendered in the main reading area (array of paragraphs). */
  readonly paragraphs: readonly string[];
}

/**
 * Full data for a single session viewer page.
 *
 * Mounted at `/dashboard/certificates/:code/session/:materialId`.
 * Figma: node 13110-52150.
 */
export interface CertSessionData {
  /** Matches `LearningMaterial.id` — used as the URL `:materialId` param. */
  readonly materialId: string;
  /** Display label for the session header card — e.g. "Session 1". */
  readonly sessionTitle: string;
  /** Cert code — used in the breadcrumb and Back link. */
  readonly certCode: string;
  /** Ordered list of chapters shown in the left sidebar. */
  readonly chapters: readonly SessionChapter[];
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Shared
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Certification family — drives card background colour and badge tint.
 * · 'esm' → ESM/esm-1  #E8EDF0 (blue-soft)
 * · 'epo' → EPO/epo-1  #EEEFED (green-soft)
 * · 'esf' → neutral    #F6F6F6
 */
export type CertFamily = 'esm' | 'epo' | 'esf';

/* ─────────────────────────────────────────────────────────────────────────────
 * List page
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Enrolled certification header row (top of the My Certificates list).
 * One row per actively enrolled program.
 *
 * Figma nodes 13227-10518 (1 cert) / 17669-39543 (2 certs).
 */
export interface EnrolledCertHeader {
  /** Short cert code — e.g. "ESM-P". Also used as router param. */
  readonly code: string;
  /** Certification family abbreviation shown as tag — e.g. "ESM". */
  readonly family: CertFamily;
  /** Human-readable family label shown as tag — e.g. "ESM". */
  readonly familyLabel: string;
  /** Sub-type / tier — e.g. "Practitioner". */
  readonly certType: string;
  /** Full display name — e.g. "ESM - Endorsed Scrum Master". */
  readonly fullName: string;
  /** Asset path for the badge image (89 × 111 px). */
  readonly badgeAsset: string;
  /** Completion progress 0–100 used in the detail page. */
  readonly progressPercent: number;
  /** Whether the cert is currently active (drives the green dot). */
  readonly isActive: boolean;
  /** Whether a downloadable certificate PDF is available. */
  readonly hasCertificate: boolean;
}

/** Exam result data shown on each "All certifications" grid card. */
export interface CertExamResult {
  /** Score percentage (0–100). */
  readonly score: number;
  /** Whether the exam was passed. */
  readonly passed: boolean;
  /** Human-readable status label: "Earned", "Failed", or "Revoked". */
  readonly status: 'earned' | 'failed' | 'revoked';
  /** Duration string — e.g. "40 min". */
  readonly duration: string;
  /** Date string — e.g. "03/06/2026 - 2:00pm". */
  readonly date: string;
  /** Number of correct answers. */
  readonly correct: number;
  /** Number of incorrect answers. */
  readonly incorrect: number;
}

/**
 * Single card in the "All certifications" grid (bottom section of the list page).
 * 2-column grid, ~6 cards total.
 */
export interface CertListCard {
  /** Short code — e.g. "ESM-P". */
  readonly code: string;
  /** Full display name. */
  readonly name: string;
  /** One-liner description shown below the name. */
  readonly description: string;
  /** Asset path for the badge SVG/PNG (70 × 87 px). */
  readonly badgeAsset: string;
  /** Family for background colour. */
  readonly family: CertFamily;
  /** Level / tier text — e.g. "Practitioner". */
  readonly level: string;
  /** Whether the student is currently enrolled in this program. */
  readonly isEnrolled: boolean;
  /** Completion %; only meaningful when isEnrolled === true. */
  readonly progressPercent: number;
  /** Exam result data; null if not yet attempted. */
  readonly examResult: CertExamResult | null;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Detail page
 * ───────────────────────────────────────────────────────────────────────────── */

/** Left side-nav sections in the certificate detail page. */
export type CertDetailSection = 'overview' | 'materials' | 'mock-test';

/** One item in the left vertical side-nav. */
export interface CertDetailNavItem {
  readonly id: CertDetailSection;
  readonly label: string;
}

/** The four KPI tiles at the top of the certificate detail page. */
export interface CertDetailStats {
  /** Overall course completion 0–100 (drives the circular progress ring). */
  readonly completionPercent: number;
  /** Weighted average mock-test score 0–100. */
  readonly averageScorePercent: number;
  /** Total learning time in minutes. */
  readonly totalTimeMinutes: number;
  /** Score trend relative to the previous period — e.g. "+5" or "-2". */
  readonly trendDelta: number;
}

/**
 * Content shown in the "Certification" card on the detail page right column.
 * Mirrors the actual credential the student earns.
 */
export interface CertificationCard {
  /** Short cert code — e.g. "ESM-P". */
  readonly code: string;
  /** Full certification title. */
  readonly title: string;
  /** Issuer name. */
  readonly issuer: string;
  /** Asset path for the certificate graphic / badge (large). */
  readonly imageAsset: string;
  /** Whether the student has already earned this cert. */
  readonly isEarned: boolean;
  /** ISO date string when the cert was issued; null if not yet earned. */
  readonly issuedDate: string | null;
  /** ISO date string when the cert expires; null if not earned or no expiry. */
  readonly expiryDate: string | null;
  /** Course completion percentage shown on the card (0–100). */
  readonly progressPercent: number;
}

/** Full data snapshot for the certificate detail page. */
export interface CertDetail {
  /** Short code — used in the breadcrumb and page title. */
  readonly code: string;
  /** Full certification name. */
  readonly fullName: string;
  readonly family: CertFamily;
  readonly badgeAsset: string;
  readonly stats: CertDetailStats;
  /** "Complete your learning" card content (left card in row 1). */
  readonly learningHeading: string;
  readonly learningBody: string;
  readonly learningMeta?: string;
  readonly learningCtaLabel: string;
  readonly learningCtaStyle: 'primary' | 'dark';
  /** Certification award card (right card in row 1). */
  readonly certificationCard: CertificationCard;
  /** Monthly mock-test scores for the bar chart (row 2 left). */
  readonly monthlyScores: readonly MonthlyScore[];
  /** Weekly mock-test scores for the line chart (row 2 left). */
  readonly weeklyScores: readonly WeeklyScore[];
  /** Exam passed/failed summary for the donut chart (row 2 right). */
  readonly examSummary: ExamSummary;
  /** Active year filter for the bar chart. */
  readonly yearFilter: ScoreFilterYear;
  /** Active week filter for the line chart. */
  readonly weekFilter: ScoreFilterWeek;
  /** Session files shown in the Learning Materials tab. */
  readonly learningMaterials: readonly LearningMaterial[];
  /** Aggregate KPIs for the Mock test tab. */
  readonly mockTestStats: MockTestStats;
  /** Ordered list of mock test attempts shown in the history list. */
  readonly mockTestHistory: readonly MockTestAttempt[];
  /** Full question bank for this certification's mock exams. */
  readonly mockTestQuestions: readonly MockTestQuestion[];
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Mock test section
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Pass/fail result of a single mock test attempt.
 * Figma: node 17733-49550 (history list rows).
 */
export type MockTestStatus = 'passed' | 'failed';

/**
 * One row in the "History of mock test" list.
 */
export interface MockTestAttempt {
  /** Display label — e.g. "mock test 1". */
  readonly title: string;
  /** Total questions in this attempt. */
  readonly totalQuestions: number;
  /** Date + time string — e.g. "03/06/2026 - 2:00pm". */
  readonly date: string;
  /** Number of correctly answered questions. */
  readonly correct: number;
  /** Number of incorrectly answered questions. */
  readonly incorrect: number;
  /** Whether the attempt was passed. */
  readonly status: MockTestStatus;
  /** Score percentage (0–100). */
  readonly scorePercent: number;
}

/**
 * Aggregate KPIs shown above the history list in the Mock test section.
 * Figma: node 17732-48712 (4-card stats row).
 */
export interface MockTestStats {
  /** Total number of attempts taken. */
  readonly totalAttempts: number;
  /** Highest score across all attempts (0–100). */
  readonly bestScorePercent: number;
  /** Average score across all attempts (0–100). */
  readonly avgScorePercent: number;
  /** Total time spent in minutes across all attempts. */
  readonly totalTimeMinutes: number;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Mock test runner
 * ───────────────────────────────────────────────────────────────────────────── */

/** A single answer choice inside a mock test question. */
export interface MockTestOption {
  /** Letter identifier shown in the option badge — 'A' | 'B' | 'C' | 'D'. */
  readonly id: 'A' | 'B' | 'C' | 'D';
  /** Answer text displayed to the learner. */
  readonly text: string;
}

/**
 * One question in the mock exam question bank.
 * Figma: nodes 17737-49884, 13144-55249, 13434-35306 (runner screens).
 */
export interface MockTestQuestion {
  /** Stable unique identifier — e.g. "q-esm-p-01". */
  readonly id: string;
  /** Full question text shown in the question panel. */
  readonly text: string;
  /** Exactly 4 answer options in display order. */
  readonly options: readonly MockTestOption[];
  /** The id of the correct option ('A' | 'B' | 'C' | 'D'). */
  readonly correctOptionId: 'A' | 'B' | 'C' | 'D';
  /** Hint text revealed when the learner clicks "Hint". */
  readonly hint: string;
}

/**
 * Settings chosen in the pre-exam dialog before starting a mock test.
 * Figma: node 13116-52954 (settings dialog).
 */
export interface MockTestSettings {
  /** Time limit in minutes; null = no time limit. */
  readonly timeMinutes: number | null;
  /** Number of questions drawn from the bank. */
  readonly questionCount: number;
}

/** Full store snapshot for the certificates feature. */
export interface CertificatesState {
  /** Enrolled cert header rows shown at the top of the list page. */
  readonly enrolledCerts: readonly EnrolledCertHeader[];
  /** All available certifications shown in the bottom grid. */
  readonly allCerts: readonly CertListCard[];
  /**
   * Certificate detail currently selected.
   * null → no cert selected / navigating from a list with no selection.
   */
  readonly selectedDetail: CertDetail | null;
  /** Which side-nav section is active in the detail view. */
  readonly activeSection: CertDetailSection;
  /** All session viewer data sets, keyed by materialId. */
  readonly sessions: readonly CertSessionData[];
}
