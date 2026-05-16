import { Injectable, computed, inject, signal } from '@angular/core';

import { LanguageService } from '@core/i18n';
import type {
  DashboardStats,
  LearningCardContent,
  MonthlyScore,
  ScoreFilterYear,
} from './dashboard.model';

/* --------------------------------------------------------------------------
 * Shared helpers
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

function monthScores(scoreMap: Partial<Record<string, number>>): readonly MonthlyScore[] {
  return MONTHS.map((month) => ({
    month,
    score: scoreMap[month] ?? null,
  }));
}

/* --------------------------------------------------------------------------
 * Mock datasets — replaced by real HTTP in a later epic
 * -------------------------------------------------------------------------- */

/** Empty state: 0 programmes, 0 exams, no subscription. */
const EMPTY_STATS: DashboardStats = {
  programsEnrolled: 0,
  averageScorePercent: 0,
  totalTimeMinutes: 0,
  monthlyScores: monthScores({ Feb: 68 }),
  examSummary: { passed: 0, failed: 0 },
  validCertifications: [],
  learningCard: null,
};

/**
 * One-cert state: enrolled, 1 active certification, 0 exams taken yet.
 * Layout: 3-column [bar | donut | learning-card], cert section below.
 * Figma: node 13570-24378 — "First file is ready to explore!" variant.
 */
const ONE_CERT_STATS: DashboardStats = {
  programsEnrolled: 12,
  averageScorePercent: 43,
  totalTimeMinutes: 763, // 12h 43m
  monthlyScores: monthScores({ Feb: 65 }),
  examSummary: { passed: 0, failed: 0 },
  validCertifications: [
    {
      code: 'ESM-P',
      name: 'Endorsed Scrum Master Practitioner',
      badgeAsset: 'assets/badge/endorsed_scrum_master_practitioner.svg',
      progressPercent: 53,
      family: 'esm',
    },
  ],
  learningCard: {
    illustration: 'assets/illustrations/file-ready.svg',
    heading: 'First file is ready to explore!',
    body: 'Agile Methodologies Overview',
    meta: '15 pages',
    ctaLabel: 'Start learning',
    ctaStyle: 'primary',
    ctaRoute: '/dashboard',
  },
};

/**
 * Two-cert state: enrolled, 2 active certifications, 44 exams taken.
 * Layout: 3-col [bar | donut | learning-card] + cert grid with 2 cards below.
 * Figma: node 17453-34583 — "Ready to pass the test" variant.
 */
const TWO_CERT_STATS: DashboardStats = {
  programsEnrolled: 12,
  averageScorePercent: 43,
  totalTimeMinutes: 763,
  monthlyScores: monthScores({ Feb: 65, Mar: 45, Apr: 50, May: 28 }),
  examSummary: { passed: 24, failed: 20 },
  validCertifications: [
    {
      code: 'ESM-P',
      name: 'Endorsed Scrum Master Practitioner',
      badgeAsset: 'assets/badge/endorsed_scrum_master_practitioner.svg',
      progressPercent: 53,
      family: 'esm',
    },
    {
      code: 'EPO-A',
      name: 'Endorsed Product Owner Authority',
      badgeAsset: 'assets/badge/endorsed_product_owner_authority.svg',
      progressPercent: 53,
      family: 'epo',
    },
  ],
  learningCard: {
    illustration: 'assets/illustrations/ready-to-test.svg',
    heading: 'We think you are ready to pass Test! (ESM-P)',
    body: 'You achieved amazing results in the mock exam, and reviewed all the attached files.',
    ctaLabel: 'Start Final Test',
    ctaStyle: 'dark',
    ctaRoute: '/dashboard',
  },
};

/** Three demo scenarios the dev can cycle through. */
export type DemoMode = 'empty' | 'one-cert' | 'two-certs';

const DATASET: Record<DemoMode, DashboardStats> = {
  empty: EMPTY_STATS,
  'one-cert': ONE_CERT_STATS,
  'two-certs': TWO_CERT_STATS,
};

/**
 * DashboardStore — signals-based store for the student overview page.
 *
 * Public API:
 *   · `stats`              Signal<DashboardStats>
 *   · `yearFilter`         Signal<ScoreFilterYear>
 *   · `demoMode`           Signal<DemoMode>
 *   · setYearFilter(year)
 *   · setDemoMode(mode)
 *   · toggleDemoMode()     cycles empty → one-cert → two-certs
 */
@Injectable({ providedIn: 'root' })
export class DashboardStore {
  /* ── private state ───────────────────────────────────────────────────── */

  private readonly lang = inject(LanguageService);
  private readonly _demoMode = signal<DemoMode>('empty');
  private readonly _yearFilter = signal<ScoreFilterYear>('this_year');

  /* ── public read-only views ──────────────────────────────────────────── */

  readonly demoMode = this._demoMode.asReadonly();
  readonly yearFilter = this._yearFilter.asReadonly();
  readonly stats = computed<DashboardStats>(() => DATASET[this._demoMode()]);

  /* ── convenience derivations ─────────────────────────────────────────── */

  readonly programsEnrolled = computed(() => this.stats().programsEnrolled);
  readonly averageScorePercent = computed(() => this.stats().averageScorePercent);
  readonly totalTimeMinutes = computed(() => this.stats().totalTimeMinutes);
  readonly monthlyScores = computed(() => this.stats().monthlyScores);
  readonly examSummary = computed(() => this.stats().examSummary);
  readonly validCertifications = computed(() => this.stats().validCertifications);
  readonly learningCard = computed<LearningCardContent | null>(() => {
    const card = this.stats().learningCard;
    if (!card) return null;
    if (card.ctaStyle === 'primary') {
      return {
        ...card,
        heading: this.lang.t('dashboard.learning.firstFileReady'),
        body: this.lang.t('dashboard.learning.agileOverview'),
        meta: this.lang.t('dashboard.learning.pagesCount', { count: '15' }),
        ctaLabel: this.lang.t('dashboard.learning.ctaStart'),
      };
    }
    return {
      ...card,
      heading: this.lang.t('dashboard.learning.readyToPass', { code: 'ESM-P' }),
      body: this.lang.t('dashboard.learning.amazingResults'),
      ctaLabel: this.lang.t('dashboard.learning.ctaFinalTest'),
    };
  });

  readonly totalTimeFormatted = computed<string>(() => {
    const mins = this.totalTimeMinutes();
    if (mins === 0) return this.lang.t('dashboard.certs.hoursAbbr', { count: '00' });
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const hStr = h.toString();
    if (m > 0) {
      return `${this.lang.t('dashboard.certs.hoursAbbr', { count: hStr })} ${this.lang.t('dashboard.certs.minutesAbbr', { count: m.toString() })}`;
    }
    return this.lang.t('dashboard.certs.hoursAbbr', { count: hStr });
  });

  /** "0%" or "43%" */
  readonly averageScoreFormatted = computed<string>(() => `${this.averageScorePercent()}%`);

  /* ── actions ─────────────────────────────────────────────────────────── */

  setYearFilter(year: ScoreFilterYear): void {
    this._yearFilter.set(year);
  }

  setDemoMode(mode: DemoMode): void {
    this._demoMode.set(mode);
  }

  /** Cycle: empty → one-cert → two-certs → empty */
  toggleDemoMode(): void {
    const order: DemoMode[] = ['empty', 'one-cert', 'two-certs'];
    const current = this._demoMode();
    const next = order[(order.indexOf(current) + 1) % order.length];
    this._demoMode.set(next);
  }
}
