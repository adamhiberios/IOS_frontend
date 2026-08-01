import { Injectable, computed, inject, signal } from '@angular/core';

import { LanguageService } from '@core/i18n';

import type {
  CertDetail,
  CertDetailSection,
  CertificatesState,
  MockTestAttempt,
  MockTestQuestion,
  MockTestStats,
  ScoreFilterWeek,
  WeeklyScore,
} from './certificates.model';

/* --------------------------------------------------------------------------
 * Learning materials mock data — shared across all demo states for ESM-P
 * -------------------------------------------------------------------------- */

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function monthScores(scoreMap: Partial<Record<string, number>>) {
  return MONTHS.map((month) => ({
    month,
    score: scoreMap[month] ?? null,
  }));
}

const DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

function weekScores(scoreMap: Partial<Record<string, number>>): readonly WeeklyScore[] {
  return DAYS.map((day) => ({
    day,
    score: scoreMap[day] ?? null,
  }));
}

/* --------------------------------------------------------------------------
 * Mock data — "All certifications" grid (bottom section, same in both states)
 * -------------------------------------------------------------------------- */

const ESM_P_MOCK_TEST_QUESTIONS: readonly MockTestQuestion[] = [
  {
    id: 'q-esm-p-01',
    text: 'Which of the following best describes the primary purpose of the Sprint in Scrum?',
    options: [
      { id: 'A', text: 'To plan all project work for the next quarter' },
      { id: 'B', text: 'To create a usable, potentially releasable product increment' },
      { id: 'C', text: "To review the team's performance and assign tasks" },
      { id: 'D', text: 'To document requirements for stakeholder approval' },
    ],
    correctOptionId: 'B',
    hint: 'Think about what a Sprint produces at the end — it must be something the stakeholders can inspect and potentially use.',
  },
  {
    id: 'q-esm-p-02',
    text: 'Who is responsible for maximizing the value of the product and the work of the Development Team?',
    options: [
      { id: 'A', text: 'Scrum Master' },
      { id: 'B', text: 'Development Team' },
      { id: 'C', text: 'Product Owner' },
      { id: 'D', text: 'Stakeholder' },
    ],
    correctOptionId: 'C',
    hint: 'This role owns the Product Backlog and decides on the order of work items.',
  },
  {
    id: 'q-esm-p-03',
    text: 'What is the recommended duration of a Sprint according to the Scrum Guide?',
    options: [
      { id: 'A', text: 'One to six weeks' },
      { id: 'B', text: 'Exactly two weeks' },
      { id: 'C', text: 'No more than one month' },
      { id: 'D', text: 'As long as needed to complete the Sprint Goal' },
    ],
    correctOptionId: 'C',
    hint: 'The Scrum Guide states a fixed upper boundary for Sprint length to maintain predictability and limit risk.',
  },
  {
    id: 'q-esm-p-04',
    text: 'Which Scrum event serves as an opportunity for the Development Team to inspect its own process and create a plan for improvements?',
    options: [
      { id: 'A', text: 'Sprint Review' },
      { id: 'B', text: 'Sprint Retrospective' },
      { id: 'C', text: 'Daily Scrum' },
      { id: 'D', text: 'Sprint Planning' },
    ],
    correctOptionId: 'B',
    hint: 'This event focuses on the team itself — how it works, not what it builds.',
  },
  {
    id: 'q-esm-p-05',
    text: 'What artifact provides transparency into the work selected for the Sprint and the progress toward the Sprint Goal?',
    options: [
      { id: 'A', text: 'Product Backlog' },
      { id: 'B', text: 'Increment' },
      { id: 'C', text: 'Sprint Backlog' },
      { id: 'D', text: 'Release Plan' },
    ],
    correctOptionId: 'C',
    hint: 'This artifact is owned by the Development Team and is visible only for the current Sprint.',
  },
  {
    id: 'q-esm-p-06',
    text: 'The Scrum Master serves the Product Owner in which of the following ways?',
    options: [
      { id: 'A', text: 'Writing acceptance criteria for Product Backlog items' },
      { id: 'B', text: 'Ensuring the team completes all Product Backlog items in a Sprint' },
      { id: 'C', text: 'Facilitating Scrum events as requested or needed' },
      {
        id: 'D',
        text: 'Helping understand product goal techniques and finding techniques for effective Product Backlog management',
      },
    ],
    correctOptionId: 'D',
    hint: 'The Scrum Master helps the Product Owner understand how to manage the Product Backlog effectively.',
  },
  {
    id: 'q-esm-p-07',
    text: 'Which of the following best describes the "Definition of Done" in Scrum?',
    options: [
      { id: 'A', text: 'A checklist created by the Product Owner to approve Sprint Backlog items' },
      {
        id: 'B',
        text: 'A formal understanding of the state of the Increment when it meets the quality measures required',
      },
      { id: 'C', text: 'A document signed by stakeholders confirming the Sprint deliverables' },
      { id: 'D', text: 'A set of requirements agreed upon before each Sprint Planning' },
    ],
    correctOptionId: 'B',
    hint: 'This is a shared standard that gives the team a shared understanding of what "complete" means for an Increment.',
  },
  {
    id: 'q-esm-p-08',
    text: 'During a Sprint, who has the authority to cancel the Sprint?',
    options: [
      { id: 'A', text: 'Scrum Master' },
      { id: 'B', text: 'Development Team' },
      { id: 'C', text: 'Product Owner' },
      { id: 'D', text: 'Any Scrum Team member' },
    ],
    correctOptionId: 'C',
    hint: 'Only one role can cancel a Sprint, and they do so when the Sprint Goal becomes obsolete.',
  },
  {
    id: 'q-esm-p-09',
    text: 'What is the primary outcome of the Sprint Review?',
    options: [
      { id: 'A', text: 'An updated Sprint Backlog for the next Sprint' },
      { id: 'B', text: 'A revised Product Backlog based on stakeholder feedback' },
      { id: 'C', text: 'Acceptance of all completed Sprint Backlog items by the Product Owner' },
      { id: 'D', text: 'A performance report for the Development Team' },
    ],
    correctOptionId: 'B',
    hint: 'The Sprint Review is an opportunity to inspect the Increment and adapt the Product Backlog if needed.',
  },
  {
    id: 'q-esm-p-10',
    text: 'Which of the following is NOT an accountability of the Development Team in Scrum?',
    options: [
      { id: 'A', text: 'Self-organizing to accomplish the Sprint Goal' },
      { id: 'B', text: 'Ordering the Product Backlog to achieve goals' },
      { id: 'C', text: 'Creating the Sprint Backlog' },
      { id: 'D', text: 'Delivering a Done Increment each Sprint' },
    ],
    correctOptionId: 'B',
    hint: 'Ordering the Product Backlog is a responsibility belonging to a different role on the Scrum Team.',
  },
];

/* --------------------------------------------------------------------------
 * Mock test data — ESM-P
 * Figma: node 13567-16238 (Mock test section)
 * -------------------------------------------------------------------------- */

const ESM_P_MOCK_TEST_STATS: MockTestStats = {
  totalAttempts: 5,
  bestScorePercent: 95,
  avgScorePercent: 46,
  totalTimeMinutes: 640, // 10h 40m
};

const ESM_P_MOCK_TEST_HISTORY: readonly MockTestAttempt[] = [
  {
    title: 'mock test 1',
    totalQuestions: 70,
    date: '03/06/2026 - 2:00pm',
    correct: 31,
    incorrect: 43,
    status: 'passed',
    scorePercent: 64,
  },
  {
    title: 'mock test 2',
    totalQuestions: 75,
    date: '04/06/2026 - 3:00pm',
    correct: 29,
    incorrect: 46,
    status: 'passed',
    scorePercent: 68,
  },
  {
    title: 'mock test 3',
    totalQuestions: 80,
    date: '05/06/2026 - 1:00pm',
    correct: 32,
    incorrect: 50,
    status: 'passed',
    scorePercent: 70,
  },
  {
    title: 'mock test 4',
    totalQuestions: 65,
    date: '06/06/2026 - 4:00pm',
    correct: 35,
    incorrect: 40,
    status: 'passed',
    scorePercent: 72,
  },
  {
    title: 'mock test 5',
    totalQuestions: 90,
    date: '07/06/2026 - 10:00am',
    correct: 30,
    incorrect: 55,
    status: 'passed',
    scorePercent: 75,
  },
  {
    title: 'mock test 6',
    totalQuestions: 100,
    date: '08/06/2026 - 5:00pm',
    correct: 28,
    incorrect: 60,
    status: 'passed',
    scorePercent: 78,
  },
  {
    title: 'mock test 7',
    totalQuestions: 85,
    date: '09/06/2026 - 11:00am',
    correct: 24,
    incorrect: 54,
    status: 'failed',
    scorePercent: 40,
  },
];

/* --------------------------------------------------------------------------
 * Mock detail — ESM-P (low completion, 12%)
 * Figma node 13567-14984
 * -------------------------------------------------------------------------- */

const ESM_P_DETAIL_LOW: CertDetail = {
  code: 'ESM-P',
  fullName: 'Endorsed Scrum Master Practitioner',
  family: 'esm',
  badgeAsset: 'assets/badge/endorsed_scrum_master_practitioner.svg',
  stats: {
    completionPercent: 12,
    averageScorePercent: 0,
    totalTimeMinutes: 45,
    trendDelta: 0,
  },
  learningHeading: 'First file is ready to explore!',
  learningBody: 'Agile Methodologies Overview',
  learningMeta: '15 pages',
  learningCtaLabel: 'Start learning',
  learningCtaStyle: 'primary',
  certificationCard: {
    code: 'ESM-P',
    title: 'Endorsed Scrum Master Practitioner',
    issuer: 'Institute of Scrum',
    imageAsset: 'assets/badge/endorsed_scrum_master_practitioner.svg',
    isEarned: false,
    issuedDate: null,
    expiryDate: null,
    progressPercent: 12,
  },
  monthlyScores: monthScores({ Feb: 0 }),
  weeklyScores: weekScores({}),
  examSummary: { passed: 0, failed: 0 },
  yearFilter: 'this_year',
  weekFilter: 'this_week',
  mockTestStats: ESM_P_MOCK_TEST_STATS,
  mockTestHistory: ESM_P_MOCK_TEST_HISTORY,
  mockTestQuestions: ESM_P_MOCK_TEST_QUESTIONS,
};

/* --------------------------------------------------------------------------
 * Mock detail — ESM-P (high completion, 95%)
 * Figma node 13568-23341
 * -------------------------------------------------------------------------- */

const ESM_P_DETAIL_HIGH: CertDetail = {
  code: 'ESM-P',
  fullName: 'Endorsed Scrum Master Practitioner',
  family: 'esm',
  badgeAsset: 'assets/badge/endorsed_scrum_master_practitioner.svg',
  stats: {
    completionPercent: 95,
    averageScorePercent: 43,
    totalTimeMinutes: 763, // 12h 43m
    trendDelta: 10,
  },
  learningHeading: 'We think you are ready to pass Test! (ESM-P)',
  learningBody:
    'You achieved amazing results in the mock exam, and reviewed all the attached files.',
  learningCtaLabel: 'Start Exam',
  learningCtaStyle: 'primary',
  certificationCard: {
    code: 'ESM-P',
    title: 'Endorsed Scrum Master Practitioner',
    issuer: 'Institute of Scrum',
    imageAsset: 'assets/badge/endorsed_scrum_master_practitioner.svg',
    isEarned: false,
    issuedDate: null,
    expiryDate: null,
    progressPercent: 53,
  },
  monthlyScores: monthScores({ Feb: 65, Mar: 45, Apr: 50, May: 28 }),
  weeklyScores: weekScores({ Sat: 35, Sun: 38, Mon: 42, Tue: 44, Wed: 48, Thu: 52, Fri: 60 }),
  examSummary: { passed: 24, failed: 20 },
  yearFilter: 'this_year',
  weekFilter: 'this_week',
  mockTestStats: ESM_P_MOCK_TEST_STATS,
  mockTestHistory: ESM_P_MOCK_TEST_HISTORY,
  mockTestQuestions: ESM_P_MOCK_TEST_QUESTIONS,
};

/* --------------------------------------------------------------------------
 * Enrolled cert headers — 1-cert and 2-cert list states
 * -------------------------------------------------------------------------- */


/* --------------------------------------------------------------------------
 * Demo mode
 * -------------------------------------------------------------------------- */

/** Demo modes to cycle through while developing. */
export type CertDemoMode =
  | 'one-cert-low' // 1 enrolled cert, 12% completion detail
  | 'one-cert-high' // 1 enrolled cert, 95% completion detail
  | 'two-certs-low' // 2 enrolled certs, 12% completion detail
  | 'two-certs-high'; // 2 enrolled certs, 95% completion detail

const STATES: Record<CertDemoMode, CertificatesState> = {
  'one-cert-low': {
    selectedDetail: ESM_P_DETAIL_LOW,
    activeSection: 'overview',
  },
  'one-cert-high': {
    selectedDetail: ESM_P_DETAIL_HIGH,
    activeSection: 'overview',
  },
  'two-certs-low': {
    selectedDetail: ESM_P_DETAIL_LOW,
    activeSection: 'overview',
  },
  'two-certs-high': {
    selectedDetail: ESM_P_DETAIL_HIGH,
    activeSection: 'overview',
  },
};

/* --------------------------------------------------------------------------
 * Store
 * -------------------------------------------------------------------------- */

/**
 * CertificatesStore — signals-based store for the My Certificates feature.
 *
 * Public API:
 *   · state             Signal<CertificatesState>
 *   · demoMode          Signal<CertDemoMode>
 *   · setDemoMode(mode)
 *   · setActiveSection(section)
 *   · setYearFilter(year)   — changes the year filter on the detail chart
 *   · Derived signals: selectedDetail, activeSection, totalTimeFormatted,
 *     averageScoreFormatted, trendFormatted, yearFilter
 *
 * Scope note: this store is now **detail-page only**. The list and session
 * pages read real data from `CoursesStore` (`/learning/*`); what remains here
 * backs the Overview charts and the mock-test section, which have no real
 * source yet.
 */
@Injectable({ providedIn: 'root' })
export class CertificatesStore {
  /* ── private state ───────────────────────────────────────────────────── */

  private readonly lang = inject(LanguageService);
  private readonly _demoMode = signal<CertDemoMode>('one-cert-high');
  private readonly _activeSection = signal<CertDetailSection>('overview');
  private readonly _yearFilter = signal<'this_year' | 'last_year'>('this_year');
  private readonly _weekFilter = signal<ScoreFilterWeek>('this_week');

  /* ── public read-only views ──────────────────────────────────────────── */

  readonly demoMode = this._demoMode.asReadonly();
  readonly state = computed<CertificatesState>(() => STATES[this._demoMode()]);
  readonly yearFilter = this._yearFilter.asReadonly();
  readonly weekFilter = this._weekFilter.asReadonly();

  /* ── convenience derivations ─────────────────────────────────────────── */

  readonly selectedDetail = computed(() => {
    const detail = this.state().selectedDetail;
    if (!detail) return null;
    if (detail.learningCtaLabel === 'Start learning') {
      return {
        ...detail,
        learningHeading: this.lang.t('dashboard.learning.firstFileReady'),
        learningBody: this.lang.t('dashboard.learning.agileOverview'),
        learningMeta: this.lang.t('dashboard.learning.pagesCount', { count: '15' }),
        learningCtaLabel: this.lang.t('dashboard.learning.ctaStart'),
      };
    }
    return {
      ...detail,
      learningHeading: this.lang.t('dashboard.learning.readyToPass', { code: detail.code }),
      learningBody: this.lang.t('dashboard.learning.amazingResults'),
      learningCtaLabel: this.lang.t(
        detail.learningCtaLabel === 'Start Final Test'
          ? 'dashboard.learning.ctaFinalTest'
          : 'dashboard.learning.ctaStartExam',
      ),
    };
  });
  readonly activeSection = computed(() => this._activeSection());

  readonly stats = computed(() => this.selectedDetail()?.stats ?? null);

  /** "0%" or "43%" */
  readonly averageScoreFormatted = computed(() => {
    const s = this.stats();
    return s ? `${s.averageScorePercent}%` : '0%';
  });

  /** "00{hours}" or "12{hours} 43{minutes}" */
  readonly totalTimeFormatted = computed(() => {
    const mins = this.stats()?.totalTimeMinutes ?? 0;
    if (mins === 0) return this.lang.t('dashboard.certs.hoursAbbr', { count: '00' });
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const hStr = h.toString();
    if (m > 0) {
      return `${this.lang.t('dashboard.certs.hoursAbbr', { count: hStr })} ${this.lang.t('dashboard.certs.minutesAbbr', { count: m.toString() })}`;
    }
    return this.lang.t('dashboard.certs.hoursAbbr', { count: hStr });
  });

  /** "+5%" or "-2%" or "—" */
  readonly trendFormatted = computed(() => {
    const delta = this.stats()?.trendDelta ?? 0;
    if (delta === 0) return '—';
    return delta > 0 ? `+${delta}%` : `${delta}%`;
  });

  readonly trendIsPositive = computed(() => (this.stats()?.trendDelta ?? 0) > 0);

  /* ── actions ─────────────────────────────────────────────────────────── */

  setDemoMode(mode: CertDemoMode): void {
    this._demoMode.set(mode);
    this._activeSection.set('overview');
  }

  setActiveSection(section: CertDetailSection): void {
    this._activeSection.set(section);
  }

  setYearFilter(year: 'this_year' | 'last_year'): void {
    this._yearFilter.set(year);
  }

  setWeekFilter(week: ScoreFilterWeek): void {
    this._weekFilter.set(week);
  }

}
