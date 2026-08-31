import { ChangeDetectionStrategy, Component, type OnInit, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideChartBar, LucideClock, LucidePercent } from '@lucide/angular';

import { LanguageService } from '@core/i18n';

import { CanadaFlag, IosIcon, provideIcons } from '@ui';

import { DashboardNavbar } from '@layouts';
import { CoursesStore } from '@features/courses/data-access/courses.store';
import { resolveBadgeAsset } from '@features/dashboard/data-access/dashboard.model';
import { CertLearningMaterials } from '../components/cert-learning-materials';
import { CertMockTest } from '../components/cert-mock-test';
import { CertSideNav } from '../components/cert-side-nav';
import type {
  CertDetailSection,
  CertificationCard,
  LearningMaterial,
  MaterialStatus,
  MockTestAttempt,
  MockTestStats,
  MockTestStatus,
} from '../data-access/certificates.model';
import { CertificatesStore } from '../data-access/certificates.store';
import { MockStore } from '../data-access/mock.store';

/**
 * `ios-cert-detail-page` — Certificate detail view.
 *
 * ┌── Layout ──────────────────────────────────────────────────────────────────┐
 * │  DashboardNavbar                                                           │
 * │  [← Back] breadcrumb                     [Start Final Test]               │
 * │                                                                            │
 * │  ┌─ side nav (228px) ──┐  ┌─ content ──────────────────────────────────┐  │
 * │  │   Overview          │  │  OVERVIEW:  3 stat tiles + progress bar +   │  │
 * │  │ • Learning Materials│  │             "continue learning" card        │  │
 * │  │   Mock test         │  │  MATERIALS: [Cert banner] + files list      │  │
 * │  └─────────────────────┘  │  MOCK TEST: [Cert banner] + 4 KPI cards +   │  │
 * │                           │             attempt history                 │  │
 * │                           └────────────────────────────────────────────┘  │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * All three tabs are wired to real data: Overview + the cert banner from
 * `CoursesStore` (`GET /learning/progress`, `GET /learning/certs/:id/curriculum`),
 * Mock test's KPIs/history from `MockStore` (`GET /mock/history`, filtered to
 * this cert). Nothing here reads the old `CertificatesStore` fixture snapshot
 * any more — that store now only tracks which side-nav tab is active.
 *
 * Figma: node 13567-14984 (overview) / 13567-15374 (learning materials) /
 * 13567-16238 (mock test).
 */
@Component({
  selector: 'ios-cert-detail-page',
  imports: [
    DashboardNavbar,
    CertSideNav,
    CertLearningMaterials,
    CertMockTest,
    RouterLink,
    IosIcon,
    CanadaFlag,
  ],
  providers: [provideIcons(LucideArrowLeft, LucidePercent, LucideClock, LucideChartBar)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <main class="flex-1 bg-white" id="main-content">
        <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-6">
          <!-- ── Breadcrumb row ── -->
          <div class="flex items-center justify-between mb-6">
            <!-- Back arrow + breadcrumb -->
            <div class="flex items-center gap-3">
              <a
                routerLink="/dashboard/certificates"
                class="flex items-center justify-center w-11 h-11 rounded-xl bg-ios-surface-soft text-ios-fg hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
                [attr.aria-label]="lang.t('dashboard.certs.backToCertificates')"
              >
                <ios-icon name="arrow-left" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
              </a>
              <nav aria-label="Breadcrumb">
                <ol
                  class="flex items-center gap-1.5 md:gap-3 text-[14px] md:text-[16px] font-medium leading-[1.4] text-ios-fg-8"
                  role="list"
                >
                  <li>
                    <span>{{ lang.t('dashboard.breadcrumb.dashboard') }}</span>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li>
                    <a
                      routerLink="/dashboard/certificates"
                      class="hover:text-ios-fg-10 transition-colors"
                    >
                      {{ lang.t('dashboard.nav.myCertificates') }}
                    </a>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li>
                    <!-- The route's own code, not the fixture's: this used to
                         read detail()?.code and so showed "ESM-P" on /PSM. -->
                    <span>{{ certCode }}</span>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li>
                    <!-- The section the side-nav is on. Without it the trail
                         stopped at the cert code, so opening Mock Exam left the
                         page with nothing naming where you were (IDD-340). -->
                    <span class="text-ios-fg-13 font-semibold" aria-current="page">
                      {{ lang.t(sectionLabelKey()) }}
                    </span>
                  </li>
                </ol>
              </nav>
            </div>

            <!-- Start Final Test CTA — only shown at high completion -->
            @if (showFinalTestCta()) {
              <a
                routerLink="/assessments/verify"
                class="inline-flex items-center justify-center h-11 px-6 rounded-2xl text-[16px] font-semibold text-ios-brand-primary-soft bg-ios-brand-primary hover:bg-ios-brand-primary-deep transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
              >
                {{ lang.t('dashboard.certs.startFinalExam') }}
              </a>
            }
          </div>

          <!-- ── Side nav + content grid ── -->
          <div class="flex gap-6 items-start">
            <!-- Left side nav -->
            <ios-cert-side-nav
              [activeSection]="store.activeSection()"
              (sectionChange)="store.setActiveSection($event)"
            />

            <!-- Right content (flex-1) -->
            <div class="flex flex-col gap-6 flex-1 min-w-0">
              <!-- ══════════════════════════════════════════════
                   OVERVIEW section
              ══════════════════════════════════════════════ -->
              @if (store.activeSection() === 'overview') {
                @if (courses.progressLoading() && !enrolled()) {
                  <p class="py-10 text-center text-ios-fg-8" role="status" aria-live="polite">
                    {{ lang.t('dashboard.certs.materialsLoading') }}
                  </p>
                } @else if (!enrolled()) {
                  <div class="rounded-2xl bg-ios-surface-muted px-6 py-10 text-center">
                    <p class="text-[15px] text-ios-fg-8">
                      {{ lang.t('dashboard.certs.notEnrolled') }}
                    </p>
                    <a
                      routerLink="/dashboard/certificates"
                      class="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-ios-fg-13 px-5 font-semibold text-white hover:bg-ios-fg transition-colors"
                    >
                      {{ lang.t('dashboard.certs.backToCertificates') }}
                    </a>
                  </div>
                } @else if (enrolled(); as progress) {
                  <!-- Real, certificate-specific progress. Every figure here comes
                       from GET /learning/progress for THIS cert. -->
                  <section
                    aria-label="Certification progress"
                    class="grid grid-cols-1 sm:grid-cols-3 gap-4"
                  >
                    <div class="flex items-center gap-3 bg-ios-surface-muted rounded-2xl px-5 py-3">
                      <ios-icon
                        name="chart-bar"
                        class="w-8 h-8 text-ios-fg shrink-0"
                        aria-hidden="true"
                      />
                      <div class="flex flex-col min-w-0">
                        <span class="text-[18px] font-bold leading-[1.2] text-ios-fg tabular-nums">
                          {{ completionPercent() }}%
                        </span>
                        <span class="text-[16px] font-medium leading-[1.4] text-ios-fg">
                          {{ lang.t('dashboard.certs.overallCompletion') }}
                        </span>
                      </div>
                    </div>

                    <div class="flex items-center gap-3 bg-ios-surface-muted rounded-2xl px-5 py-3">
                      <ios-icon
                        name="percent"
                        class="w-8 h-8 text-ios-fg shrink-0"
                        aria-hidden="true"
                      />
                      <div class="flex flex-col min-w-0">
                        <span class="text-[18px] font-bold leading-[1.2] text-ios-fg tabular-nums">
                          {{ progress.completedLessons }} / {{ progress.totalLessons }}
                        </span>
                        <span class="text-[16px] font-medium leading-[1.4] text-ios-fg">
                          {{ lang.t('dashboard.certs.lessonsCompleted') }}
                        </span>
                      </div>
                    </div>

                    <div class="flex items-center gap-3 bg-ios-surface-muted rounded-2xl px-5 py-3">
                      <ios-icon
                        name="clock"
                        class="w-8 h-8 text-ios-fg shrink-0"
                        aria-hidden="true"
                      />
                      <div class="flex flex-col min-w-0">
                        <span class="text-[18px] font-bold leading-[1.2] text-ios-fg tabular-nums">
                          {{ lessonsRemaining() }}
                        </span>
                        <span class="text-[16px] font-medium leading-[1.4] text-ios-fg">
                          {{ lang.t('dashboard.certs.lessonsRemaining') }}
                        </span>
                      </div>
                    </div>
                  </section>

                  <!-- Progress bar -->
                  <section aria-label="Completion" class="flex flex-col gap-2">
                    <div class="flex items-center justify-between text-[14px] text-ios-fg-8">
                      <span>{{ progress.title }}</span>
                      <span class="tabular-nums">{{ completionPercent() }}%</span>
                    </div>
                    <div
                      class="h-2 w-full rounded-full bg-ios-surface-soft overflow-hidden"
                      role="progressbar"
                      [attr.aria-valuenow]="completionPercent()"
                      aria-valuemin="0"
                      aria-valuemax="100"
                    >
                      <div
                        class="h-full rounded-full bg-ios-brand-primary transition-[width]"
                        [style.width.%]="completionPercent()"
                      ></div>
                    </div>
                  </section>

                  <!-- Continue where you left off -->
                  <section
                    aria-label="Continue learning"
                    class="bg-ios-surface-muted rounded-2xl px-6 py-6 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div class="flex flex-col gap-1 min-w-0">
                      <h2 class="text-[18px] font-semibold leading-[1.4] text-ios-fg-13">
                        {{
                          nextLesson()
                            ? lang.t('dashboard.certs.continueHeading')
                            : lang.t('dashboard.certs.allLessonsDone')
                        }}
                      </h2>
                      @if (nextLesson(); as next) {
                        <p class="text-[16px] text-ios-fg-8 truncate" dir="auto">
                          {{ next.title }}
                        </p>
                      }
                    </div>
                    @if (nextLesson(); as next) {
                      <a
                        [routerLink]="[
                          '/dashboard/certificates',
                          progress.programCode,
                          'session',
                          next.id,
                        ]"
                        class="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-ios-fg-13 px-6 font-semibold text-white hover:bg-ios-fg transition-colors"
                      >
                        {{ lang.t('dashboard.certs.continueCta') }}
                      </a>
                    } @else {
                      <a
                        routerLink="/assessments/verify"
                        class="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-ios-brand-primary px-6 font-semibold text-ios-brand-primary-soft hover:bg-ios-brand-primary-deep transition-colors"
                      >
                        {{ lang.t('dashboard.certs.startFinalExam') }}
                      </a>
                    }
                  </section>
                }
              }
              <!-- end @if overview -->

              <!-- ══════════════════════════════════════════════
                   LEARNING MATERIALS section
              ══════════════════════════════════════════════ -->
              @if (store.activeSection() === 'materials') {
                @if (courses.curriculumError(); as message) {
                  <div class="rounded-2xl bg-ios-surface-muted px-6 py-10 text-center" role="alert">
                    <p class="text-[15px] font-medium text-ios-fg-13">{{ message }}</p>
                  </div>
                } @else if (courses.curriculumLoading() && realMaterials().length === 0) {
                  <p class="py-10 text-center text-ios-fg-8" role="status" aria-live="polite">
                    {{ lang.t('dashboard.certs.materialsLoading') }}
                  </p>
                } @else if (realMaterials().length === 0) {
                  <div class="rounded-2xl bg-ios-surface-muted px-6 py-10 text-center">
                    <p class="text-[15px] text-ios-fg-8">
                      {{ lang.t('dashboard.certs.materialsEmpty') }}
                    </p>
                  </div>
                } @else if (certificationCard(); as card) {
                  <!--
                    materials comes from the real curriculum, so each row's id
                    is a lesson UUID. It used to be the ESM_P_MATERIALS fixture,
                    whose slug ids ("session-1-a") made the session route 400
                    with "Validation failed (uuid is expected)".
                  -->
                  <ios-cert-learning-materials
                    [cert]="card"
                    [materials]="realMaterials()"
                    (open)="onMaterialOpen($event)"
                  />
                }
              }

              <!-- ══════════════════════════════════════════════
                   MOCK TEST section
              ══════════════════════════════════════════════ -->
              @if (store.activeSection() === 'mock-test') {
                @if (courses.progressLoading() && !certificationCard()) {
                  <p class="py-10 text-center text-ios-fg-8" role="status" aria-live="polite">
                    {{ lang.t('dashboard.certs.materialsLoading') }}
                  </p>
                } @else if (!certificationCard()) {
                  <div class="rounded-2xl bg-ios-surface-muted px-6 py-10 text-center">
                    <p class="text-[15px] text-ios-fg-8">
                      {{ lang.t('dashboard.certs.notEnrolled') }}
                    </p>
                    <a
                      routerLink="/dashboard/certificates"
                      class="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-ios-fg-13 px-5 font-semibold text-white hover:bg-ios-fg transition-colors"
                    >
                      {{ lang.t('dashboard.certs.backToCertificates') }}
                    </a>
                  </div>
                } @else if (certificationCard(); as card) {
                  <!--
                    stats/history come from GET /mock/history filtered to this
                    cert's submitted attempts. It used to be the fixed
                    ESM_P_MOCK_TEST_STATS/HISTORY (5 attempts, 95% best score,
                    10h40m) shown identically under every certificate.
                  -->
                  <ios-cert-mock-test
                    [cert]="card"
                    [stats]="realMockStats()"
                    [history]="realMockHistory()"
                    (startTest)="onStartTest()"
                    (viewAttempt)="onViewAttempt($event)"
                    class="flex flex-col gap-6"
                  />
                }
              }
            </div>
            <!-- end right content -->
          </div>
          <!-- end side nav + content grid -->
        </div>
      </main>

      <footer class="bg-ios-brand-dark w-full py-4">
        <div
          class="max-w-[1400px] mx-auto px-4 md:px-8 flex items-center justify-center gap-2 text-ios-brand-muted text-xs"
        >
          <ios-canada-flag aria-hidden="true" />
          <span>{{ lang.t('common.copyright', { year: yearStr }) }}</span>
        </div>
      </footer>
    </div>
  `,
})
export class CertDetailPage implements OnInit {
  protected readonly lang = inject(LanguageService);
  protected readonly store = inject(CertificatesStore);
  protected readonly courses = inject(CoursesStore);
  protected readonly mock = inject(MockStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly currentYear = new Date().getFullYear();
  protected readonly yearStr = String(this.currentYear);

  /** Route `:code` — a **program code** (e.g. `ESM`), not a UUID. */
  protected readonly certCode = this.route.snapshot.params['code'] as string;

  /**
   * The enrolled certificate matching the route's program code. The backend
   * keys everything by `certId` (UUID) while the URL carries the human-readable
   * code, so `GET /learning/progress` is the lookup table between them — and it
   * only lists **enrolled** certificates, which is exactly the right gate here.
   */
  protected readonly enrolled = computed(() =>
    this.courses.progress().find((p) => p.programCode === this.certCode),
  );

  /** Whole-number completion for this certificate. */
  protected readonly completionPercent = computed(() =>
    Math.round(this.enrolled()?.percentComplete ?? 0),
  );

  protected readonly lessonsRemaining = computed(() => {
    const p = this.enrolled();
    return p ? Math.max(0, p.totalLessons - p.completedLessons) : 0;
  });

  /**
   * The first incomplete lesson, in curriculum order — the "continue where you
   * left off" target. `null` once everything is done, which is what flips the
   * card's CTA to the final exam.
   */
  protected readonly nextLesson = computed(() => {
    const curriculum = this.courses.curriculum();
    if (!curriculum) return null;
    for (const module of curriculum.modules) {
      const lesson = module.lessons.find((l) => !l.completed);
      if (lesson) return lesson;
    }
    return null;
  });

  /**
   * Learning-material rows built from the real curriculum. Each row's `id` is a
   * **lesson UUID**, which is what the session route now requires.
   *
   * Fields the design has but the backend does not (`currentPage`,
   * `totalPages`) are set to `0` rather than invented: there is no per-lesson
   * page tracking anywhere in the API, and showing a fabricated "page 3 of 12"
   * would be a lie the UI can't back up. `completionPercent` collapses to the
   * only real signal available — the boolean `completed`.
   */
  protected readonly realMaterials = computed<readonly LearningMaterial[]>(() => {
    const curriculum = this.courses.curriculum();
    if (!curriculum) return [];
    return curriculum.modules.flatMap((module) =>
      module.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        currentPage: 0,
        totalPages: 0,
        completionPercent: lesson.completed ? 100 : 0,
        status: (lesson.completed ? 'completed' : 'not_started') satisfies MaterialStatus,
        actionLabel: this.lang.t(
          lesson.completed ? 'dashboard.certs.reviewLesson' : 'dashboard.certs.openLesson',
        ),
      })),
    );
  });

  /**
   * The certification-card data shown at the top of both the Materials and
   * Mock test tabs. Built from real enrolment data — it used to be
   * `detail()!.certificationCard`, a hardcoded ESM-P fixture that displayed
   * the same title, badge and completion on every certificate's card.
   *
   * `issuer` is a static, cert-independent business fact (this platform is
   * the sole issuer), not fabricated data. `isEarned`/`issuedDate`/
   * `expiryDate` are left at their "not earned" defaults rather than guessed:
   * whether a credential has actually been issued lives behind
   * `GET /me/certificates` (the credentials feature), which this page does
   * not consume — same reasoning as `certificates.page.ts`'s `hasCertificate`.
   */
  protected readonly certificationCard = computed<CertificationCard | null>(() => {
    const progress = this.enrolled();
    if (!progress) return null;
    return {
      code: progress.programCode,
      title: progress.title,
      issuer: 'Institute of Scrum',
      imageAsset: resolveBadgeAsset(progress.programCode),
      isEarned: false,
      issuedDate: null,
      expiryDate: null,
      progressPercent: this.completionPercent(),
    };
  });

  /**
   * This certificate's submitted mock attempts, newest first — the real
   * source for the Mock test tab. `MockStore.history()` is global across all
   * of the student's certifications (there is no `certId` filter on
   * `GET /mock/history`), so it's filtered client-side here. In-progress
   * (unsubmitted) attempts are excluded: the KPI cards and history rows both
   * assume a final score, which only exists once an attempt is submitted.
   */
  private readonly certMockAttempts = computed(() => {
    const certId = this.enrolled()?.certId;
    if (!certId) return [];
    return this.mock
      .history()
      .filter((h) => h.certId === certId && h.status === 'submitted' && h.score !== null);
  });

  /**
   * Aggregate KPIs for the Mock test tab's 4-card stat row. Previously
   * `ESM_P_MOCK_TEST_STATS` — a fixed `{5, 95%, 46%, 640min}` shown
   * identically regardless of certificate or actual attempt history.
   * `totalTimeMinutes` is derived from `submittedAt - startedAt`, since the
   * backend doesn't return a duration field directly.
   */
  protected readonly realMockStats = computed<MockTestStats>(() => {
    const attempts = this.certMockAttempts();
    const totalAttempts = attempts.length;
    if (totalAttempts === 0) {
      return { totalAttempts: 0, bestScorePercent: 0, avgScorePercent: 0, totalTimeMinutes: 0 };
    }
    const scores = attempts.map((a) => a.score ?? 0);
    const totalTimeMinutes = attempts.reduce((sum, a) => {
      if (!a.submittedAt) return sum;
      const startedMs = new Date(a.startedAt).getTime();
      const submittedMs = new Date(a.submittedAt).getTime();
      if (Number.isNaN(startedMs) || Number.isNaN(submittedMs) || submittedMs <= startedMs) {
        return sum;
      }
      return sum + Math.round((submittedMs - startedMs) / 60_000);
    }, 0);
    return {
      totalAttempts,
      bestScorePercent: Math.round(Math.max(...scores)),
      avgScorePercent: Math.round(scores.reduce((sum, s) => sum + s, 0) / totalAttempts),
      totalTimeMinutes,
    };
  });

  /**
   * "History of mock test" rows. Previously `ESM_P_MOCK_TEST_HISTORY` — 7
   * hardcoded attempts (same dates, same scores) shown under every
   * certificate. `status` maps from the backend's `readyForFinal` advisory
   * flag (the closest real equivalent to "passed"); attempt numbers are
   * assigned oldest-first (`history()` itself is newest-first) so the label
   * reads the way the original design intended — "mock test 1" is the first
   * one taken, not the most recent.
   */
  protected readonly realMockHistory = computed<readonly MockTestAttempt[]>(() => {
    const attempts = this.certMockAttempts();
    const total = attempts.length;
    return attempts.map((a, i) => ({
      attemptId: a.attemptId,
      title: this.lang.t('dashboard.certs.mockTestAttemptLabel', { number: String(total - i) }),
      totalQuestions: a.totalCount ?? 0,
      date: this.formatAttemptDate(a.submittedAt ?? a.startedAt),
      correct: a.correctCount ?? 0,
      incorrect: a.falseCount ?? Math.max(0, (a.totalCount ?? 0) - (a.correctCount ?? 0)),
      status: (a.readyForFinal ? 'passed' : 'failed') satisfies MockTestStatus,
      scorePercent: Math.round(a.score ?? 0),
    }));
  });

  private formatAttemptDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  ngOnInit(): void {
    void this.loadRealCurriculum();
    void this.mock.loadHistory();
  }

  /**
   * Resolve the program code to a `certId` and load its curriculum. Progress is
   * fetched first because it is the only code → id mapping available; when the
   * code isn't in the enrolled list there is nothing to load, and the materials
   * section renders its empty state rather than firing a doomed request.
   */
  private async loadRealCurriculum(): Promise<void> {
    await this.courses.loadProgress();
    const certId = this.enrolled()?.certId;
    if (certId) await this.courses.loadCurriculum(certId);
  }

  /**
   * Show the "Start Final Test" CTA at ≥ 80 % completion — now measured against
   * **this** certificate's real progress. It previously read the fixture's
   * completion, so the CTA appeared (or didn't) identically on every cert.
   */
  protected readonly showFinalTestCta = computed(() => this.completionPercent() >= 80);

  protected onShowDetails(): void {
    // Navigate to cert list / trigger detail action — wired up when routing is finalised.
  }

  /**
   * i18n key for the active section, so the breadcrumb can name it. Same keys
   * the side-nav renders, so the trail and the highlighted nav item always read
   * identically.
   */
  private static readonly SECTION_LABEL_KEYS: Record<CertDetailSection, string> = {
    overview: 'dashboard.breadcrumb.overview',
    materials: 'dashboard.certs.learningMaterialsNav',
    'mock-test': 'dashboard.certs.mockTestNav',
  };

  protected readonly sectionLabelKey = computed<string>(
    () => CertDetailPage.SECTION_LABEL_KEYS[this.store.activeSection()],
  );

  protected onSectionChange(section: CertDetailSection): void {
    this.store.setActiveSection(section);
  }

  /**
   * Navigate to the mock test runner when the user clicks "Start" in the
   * settings dialog.
   *
   * A mock exam mirrors its Final Exam's duration and question count, and the
   * backend samples both from the program's own bank, so there is nothing for
   * the candidate to configure (IDD-342). The runner reads `?certId=` to start
   * a fresh attempt or `?attemptId=` to resume one; `POST /mock/start` accepts
   * only a certId.
   */
  protected onStartTest(): void {
    const certId = this.enrolled()?.certId;
    if (!certId) return;
    void this.router.navigate(['/dashboard/certificates', this.certCode, 'mock-test'], {
      queryParams: { certId },
    });
  }

  /**
   * Navigate to the real review for a past mock attempt. "Show details" on a
   * history row used to reuse the "Start Mock Test" handler and reopen the
   * settings dialog — clicking it silently launched a brand new attempt
   * instead of showing the one the student clicked on.
   */
  protected onViewAttempt(attemptId: string): void {
    void this.router.navigate(['/dashboard/certificates', this.certCode, 'mock-test', 'result'], {
      queryParams: { attemptId },
    });
  }

  /** Navigate to the session viewer when a file row CTA is clicked. */
  protected onMaterialOpen(materialId: string): void {
    const code = this.route.snapshot.params['code'] as string;
    void this.router.navigate(['/dashboard/certificates', code, 'session', materialId]);
  }
}

export default CertDetailPage;
