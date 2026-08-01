import { Injectable, computed, inject, signal } from '@angular/core';

import { LanguageService } from '@core/i18n';
import { CoursesStore } from '@features/courses/data-access/courses.store';
import { MockStore } from '@features/certificates/data-access/mock.store';
import { PublicCatalogStore } from '@features/landing/data-access/catalog.store';

import {
  type DashboardStats,
  type LearningCardContent,
  type MonthlyScore,
  type ScoreFilterYear,
  type ValidCertification,
  resolveBadgeAsset,
  resolveCertFamily,
} from './dashboard.model';

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

/**
 * `DashboardStore` — signals-based aggregator for the student overview page.
 *
 * Owns no server state of its own: it composes {@link CoursesStore} (enrolled
 * certs + progress, `GET /learning/progress`), {@link MockStore} (practice-exam
 * history, `GET /mock/history` — the real source for the "Mock test scores" bar
 * chart and the pass/fail donut), and {@link PublicCatalogStore} (public catalog
 * titles, `GET /catalog`) into the `DashboardStats` shape the overview template
 * renders. KPI tiles and the real-exam history list are wired separately on the
 * page via `StudentInsightsStore` / `ExamAttemptsStore`.
 *
 * Caveat (documented, not silently hidden): `MockStore.history()` only holds the
 * most-recently-loaded page (20 items, cursor-paginated) — there is no
 * backend monthly-aggregation endpoint, so the bar chart reflects the latest
 * attempts, not a guaranteed-complete year. Same trade-off already accepted for
 * the real-exam history list.
 *
 * Public API:
 *   · `stats`        Signal<DashboardStats>
 *   · `yearFilter`    Signal<ScoreFilterYear>
 *   · setYearFilter(year)
 *   · loadAll()        triggers the underlying stores' fetches
 */
@Injectable({ providedIn: 'root' })
export class DashboardStore {
  private readonly lang = inject(LanguageService);
  private readonly courses = inject(CoursesStore);
  private readonly mock = inject(MockStore);
  private readonly catalog = inject(PublicCatalogStore);

  private readonly _yearFilter = signal<ScoreFilterYear>('this_year');
  readonly yearFilter = this._yearFilter.asReadonly();

  /* ── validCertifications ─────────────────────────────────────────────── */

  readonly validCertifications = computed<readonly ValidCertification[]>(() =>
    this.courses.progress().map((p) => {
      const catalogEntry = this.catalog.byCode(p.programCode);
      return {
        code: p.programCode,
        name: catalogEntry?.title ?? p.title,
        badgeAsset: resolveBadgeAsset(p.programCode),
        progressPercent: p.percentComplete,
        family: resolveCertFamily(p.programCode),
        certId: p.certId,
      };
    }),
  );

  /* ── monthlyScores + examSummary (from mock-exam history) ───────────────── */

  private readonly submittedMockAttempts = computed(() =>
    this.mock.history().filter((h) => h.submittedAt !== null && h.score !== null),
  );

  readonly monthlyScores = computed<readonly MonthlyScore[]>(() => {
    const year = this.yearTarget();
    const buckets = new Map<number, { sum: number; count: number }>();
    for (const attempt of this.submittedMockAttempts()) {
      const d = new Date(attempt.submittedAt as string);
      if (d.getFullYear() !== year) continue;
      const bucket = buckets.get(d.getMonth()) ?? { sum: 0, count: 0 };
      bucket.sum += attempt.score as number;
      bucket.count += 1;
      buckets.set(d.getMonth(), bucket);
    }
    return MONTHS.map((month, i) => {
      const bucket = buckets.get(i);
      return { month, score: bucket ? Math.round(bucket.sum / bucket.count) : null };
    });
  });

  readonly examSummary = computed(() => {
    let passed = 0;
    let failed = 0;
    for (const attempt of this.submittedMockAttempts()) {
      if (attempt.readyForFinal) passed++;
      else failed++;
    }
    return { passed, failed };
  });

  /* ── learningCard — nudge toward the least-complete in-progress course ──── */

  readonly learningCard = computed<LearningCardContent | null>(() => {
    const inProgress = this.courses
      .progress()
      .filter((p) => p.percentComplete < 100)
      .sort((a, b) => a.percentComplete - b.percentComplete)[0];
    if (!inProgress) return null;
    const started = inProgress.completedLessons > 0;
    return {
      illustration: started
        ? 'assets/illustrations/ready-to-test.svg'
        : 'assets/illustrations/file-ready.svg',
      heading: started
        ? this.lang.t('dashboard.learning.continueHeading', { code: inProgress.programCode })
        : this.lang.t('dashboard.learning.startHeading', { code: inProgress.programCode }),
      body: inProgress.title,
      meta: this.lang.t('dashboard.learning.lessonsProgress', {
        completed: String(inProgress.completedLessons),
        total: String(inProgress.totalLessons),
      }),
      ctaLabel: started
        ? this.lang.t('dashboard.learning.ctaContinue')
        : this.lang.t('dashboard.learning.ctaStart'),
      ctaStyle: started ? 'dark' : 'primary',
      // The learning hub is `/dashboard/certificates`, keyed by **program code**
      // (the parallel `/courses` pages were removed as duplicates). `certId` is
      // still the backend key, but it isn't what this route takes.
      ctaRoute: `/dashboard/certificates/${inProgress.programCode}`,
    };
  });

  /* ── combined snapshot ───────────────────────────────────────────────── */

  readonly stats = computed<DashboardStats>(() => ({
    monthlyScores: this.monthlyScores(),
    examSummary: this.examSummary(),
    validCertifications: this.validCertifications(),
    learningCard: this.learningCard(),
  }));

  /** True once the student has any enrolment or mock-attempt history — drives the footer. */
  readonly hasActivity = computed(
    () => this.validCertifications().length > 0 || this.submittedMockAttempts().length > 0,
  );

  /* ── actions ─────────────────────────────────────────────────────────── */

  setYearFilter(year: ScoreFilterYear): void {
    this._yearFilter.set(year);
  }

  /** Kick off the underlying stores' fetches (idempotent-ish; safe to call on init). */
  async loadAll(): Promise<void> {
    await Promise.all([
      this.courses.loadProgress(),
      this.mock.loadHistory(),
      this.catalog.load(),
    ]);
  }

  private yearTarget(): number {
    const currentYear = new Date().getFullYear();
    return this._yearFilter() === 'this_year' ? currentYear : currentYear - 1;
  }
}
