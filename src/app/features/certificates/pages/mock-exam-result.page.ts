import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideCheck, LucideX, LucideArrowLeft, LucideArrowRight } from '@lucide/angular';

import { LanguageService } from '@core/i18n';

import { IosIcon, provideIcons } from '@ui';
import { DashboardNavbar } from '@layouts';
import type { MockTestQuestion } from '../data-access/certificates.model';

interface ExamResultData {
  certCode: string;
  questions: MockTestQuestion[];
  answers: Record<number, 'A' | 'B' | 'C' | 'D' | null>;
}

/**
 * `ios-mock-exam-result-page` — Mock exam results page.
 *
 * ┌── Layout ─────────────────────────────────────────────────────────────┐
 * │  DashboardNavbar                                                       │
 * │  [←] Dashboard / My certificates / ESM-P / Results                    │
 * │                                                                        │
 * │  ┌─ Left column (858px) ───────────┐  ┌─ Right card (354px) ───────┐  │
 * │  │  History of mock test (N tests)  │  │  Result: (60%)             │  │
 * │  │  ┌─ Q1 card ─────────────────┐   │  │  ────────────────────      │  │
 * │  │  │  [✓] answer A        │   │  │  │   ✓ 32 True                  │  │
 * │  │  │  [✗] answer B        │   │  │  │   ✗ 18 False                 │  │
 * │  │  └──────────────────────────┘   │  │  └───────────────────────────┘  │
 * │  │  ...                             │                                     │
 * │  └──────────────────────────────────┘                                     │
 * │                                                                           │
 * │  ┌── Final test? CTA (full-width) ─────────────────────────────────────┐  │
 * │  │  "I guess you are ready! let's start Final test?"                   │  │
 * │  │  [Start final test →]                                               │  │
 * │  └─────────────────────────────────────────────────────────────────────┘  │
 * │                                                                           │
 * │  [footer]                                                                 │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * Figma: node 13144-55075 (Dashboard-result mock exam).
 */
@Component({
  selector: 'ios-mock-exam-result-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DashboardNavbar, IosIcon, RouterLink],
  providers: [provideIcons(LucideCheck, LucideX, LucideArrowLeft, LucideArrowRight)],
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <main class="flex-1 bg-white" id="main-content">
        <div class="max-w-[1400px] mx-auto px-8 py-6 flex flex-col gap-6">
          <!-- ── Breadcrumb row ─────────────────────────────────────── -->
          <div class="flex items-center gap-3">
            <a
              [routerLink]="['/dashboard/certificates', certCode]"
              [queryParams]="{ section: 'mock-test' }"
              class="flex items-center justify-center w-11 h-11 rounded-xl bg-ios-surface-soft text-ios-fg hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
              [attr.aria-label]="lang.t('dashboard.certs.backToCertDetail')"
            >
              <ios-icon name="arrow-left" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
            </a>
            <nav aria-label="Breadcrumb">
              <ol
                class="flex items-center gap-3 text-[16px] font-medium leading-[1.4] text-ios-fg-8"
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
                  <a
                    [routerLink]="['/dashboard/certificates', certCode]"
                    class="hover:text-ios-fg-10 transition-colors"
                  >
                    {{ certCode }}
                  </a>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <span class="text-ios-fg-13 font-semibold">{{
                    lang.t('dashboard.examRunner.resultLabel')
                  }}</span>
                </li>
              </ol>
            </nav>
          </div>

          <!-- ── Two-column layout ─────────────────────────────────── -->
          @if (questions.length === 0) {
            <div
              class="flex flex-col items-center justify-center gap-4 py-24 text-center"
              role="status"
            >
              <p class="text-[18px] font-medium text-ios-fg-8">
                {{ lang.t('dashboard.examRunner.noResultsFound') }}
              </p>
              <p class="text-[16px] text-ios-fg-7 max-w-md">
                {{ lang.t('dashboard.examRunner.noResultsAction') }}
                <a
                  [routerLink]="['/dashboard/certificates', certCode, 'mock-test']"
                  class="text-ios-brand-primary underline hover:no-underline"
                >
                  {{ lang.t('dashboard.examRunner.startNewMockTest') }} </a
                >.
              </p>
            </div>
          } @else {
            <div class="flex gap-6 items-start">
              <!-- ── Left column: Question list ─────────────────────── -->
              <div class="flex flex-col gap-4 flex-1 min-w-0">
                <!-- Section heading -->
                <div class="flex items-center gap-3">
                  <h2 class="text-[18px] font-semibold leading-[1.4] text-ios-fg-13">
                    {{ lang.t('dashboard.examRunner.historyOfMockTest') }}
                  </h2>
                  <span class="text-[16px] font-medium leading-[1.4] text-ios-fg-8">
                    {{ lang.t('dashboard.certs.tests', { count: questions.length.toString() }) }}
                  </span>
                </div>

                <!-- Question cards -->
                @for (q of questions; track q.id; let idx = $index) {
                  <div class="bg-ios-surface-soft flex flex-col gap-3 p-6 rounded-xl w-full">
                    <!-- Question heading -->
                    <div
                      class="flex gap-1.5 items-start text-[16px] font-medium leading-[1.4] text-ios-fg-11"
                    >
                      <span class="shrink-0">{{ idx + 1 }}.</span>
                      <span>{{ q.text }}</span>
                    </div>

                    <!-- Answer options — correct answer always shown, wrong selection shown if exists -->
                    @for (opt of q.options; track opt.id) {
                      @if (isCorrectAnswer(idx, opt.id) || isUserSelected(idx, opt.id)) {
                        <div class="bg-white flex items-center gap-3 p-[13px] rounded-xl w-full">
                          <!-- Letter badge -->
                          <div
                            class="flex items-center justify-center size-6 rounded-full shrink-0"
                            [class.bg-ios-fg-mid]="!isUserSelected(idx, opt.id)"
                            [class.bg-ios-fg-mid/60]="
                              isUserSelected(idx, opt.id) && !isCorrectAnswer(idx, opt.id)
                            "
                          >
                            <span
                              class="flex flex-col items-center justify-center size-6 text-[14px] font-semibold leading-[1.4] text-ios-surface-soft text-center"
                            >
                              {{ opt.id }}
                            </span>
                          </div>

                          <!-- Option text -->
                          <p
                            class="flex-1 min-w-px text-[16px] font-medium leading-[1.4]"
                            [class.text-ios-fg]="isCorrectAnswer(idx, opt.id)"
                            [class.text-ios-fg/60]="
                              isUserSelected(idx, opt.id) && !isCorrectAnswer(idx, opt.id)
                            "
                          >
                            {{ opt.text }}
                          </p>

                          <!-- Status icon -->
                          @if (isCorrectAnswer(idx, opt.id)) {
                            <div
                              class="flex items-center justify-center size-[42px] rounded-full bg-ios-success-soft shrink-0"
                            >
                              <ios-icon
                                name="check"
                                class="size-6 text-ios-success-strong"
                                [attr.aria-label]="lang.t('dashboard.examRunner.correct')"
                              />
                            </div>
                          } @else {
                            <div
                              class="flex items-center justify-center size-[42px] rounded-full bg-ios-danger-soft shrink-0"
                            >
                              <ios-icon
                                name="x"
                                class="size-6 text-ios-danger-mid"
                                [attr.aria-label]="lang.t('dashboard.examRunner.incorrect')"
                              />
                            </div>
                          }
                        </div>
                      }
                    }
                  </div>
                }
              </div>

              <!-- ── Right column: Result summary card ──────────────── -->
              <aside
                class="w-[354px] shrink-0 bg-ios-brand-dark rounded-2xl flex flex-col gap-6 p-8 sticky top-6"
                aria-label="Exam result summary"
              >
                <!-- Result badge -->
                <div
                  class="inline-flex items-center gap-2 bg-ios-fg-10 rounded-xl px-3 py-1.5 self-start text-[16px] whitespace-nowrap"
                >
                  <span class="font-semibold leading-[1.4] text-ios-brand-yellow-bright">{{
                    lang.t('dashboard.examRunner.resultLabel')
                  }}</span>
                  <span class="font-bold leading-[1.3] text-ios-brand-yellow-bright"
                    >({{ scorePercent }}%)</span
                  >
                </div>

                <!-- Gold divider -->
                <div class="h-1 rounded-full bg-[#917f33]" aria-hidden="true"></div>

                <!-- True / False stats -->
                <div class="flex items-center gap-4">
                  <!-- Correct -->
                  <div class="flex items-center gap-3">
                    <div class="flex items-center gap-1">
                      <ios-icon name="check" class="size-7 text-[#a7d43e]" aria-hidden="true" />
                      <span class="text-[18px] font-medium leading-[1.4] text-[#a7d43e]">{{
                        correctCount
                      }}</span>
                    </div>
                    <span class="text-[18px] font-bold leading-[1.2] text-[#a7d43e]">{{
                      lang.t('dashboard.examRunner.trueLabel')
                    }}</span>
                  </div>

                  <!-- Separator -->
                  <span class="text-[18px] font-medium leading-[1.4] text-ios-fg-7">/</span>

                  <!-- Incorrect -->
                  <div class="flex items-center gap-3">
                    <div class="flex items-center gap-1">
                      <ios-icon name="x" class="size-7 text-[#ff715d]" aria-hidden="true" />
                      <span class="text-[18px] font-medium leading-[1.4] text-[#ff715d]">{{
                        incorrectCount
                      }}</span>
                    </div>
                    <span class="text-[18px] font-bold leading-[1.2] text-[#ff715d]">{{
                      lang.t('dashboard.examRunner.falseLabel')
                    }}</span>
                  </div>
                </div>
              </aside>
            </div>
          }
        </div>

        <!-- ── "Final test?" CTA (full-width) ───────────────────────── -->
        <section class="bg-ios-fg-13 w-full py-16" aria-label="Final test call to action">
          <div class="max-w-[1400px] mx-auto px-8 flex flex-col items-center gap-10">
            <!-- Heading -->
            <div class="flex flex-col items-center gap-3">
              <h2 class="text-[24px] font-bold leading-[1.2] text-white text-center">
                {{ lang.t('dashboard.examRunner.readyCtaHeading1') }}
                <span class="text-[#ffe477]">{{
                  lang.t('dashboard.examRunner.readyCtaHeading2')
                }}</span>
              </h2>
              <div class="h-1 rounded-full bg-ios-brand-gold w-[274px]" aria-hidden="true"></div>
            </div>

            <!-- CTA button -->
            <a
              [routerLink]="['/dashboard/certificates', certCode]"
              [queryParams]="{ section: 'mock-test' }"
              class="inline-flex items-center gap-3 h-14 px-6 rounded-xl text-[18px] font-semibold leading-[1.4] text-ios-fg bg-white hover:bg-neutral-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              {{ lang.t('dashboard.examRunner.startFinalTestCta') }}
              <ios-icon
                name="arrow-right"
                class="size-6 shrink-0 rtl:rotate-180"
                aria-hidden="true"
              />
            </a>
          </div>
        </section>
      </main>

      <footer class="bg-ios-brand-dark w-full py-4">
        <div
          class="max-w-[1400px] mx-auto px-8 flex items-center justify-center gap-2 text-ios-brand-muted text-xs"
        >
          <span>{{ lang.t('common.copyright', { year: yearStr }) }}</span>
        </div>
      </footer>
    </div>
  `,
})
export class MockExamResultPage {
  protected readonly lang = inject(LanguageService);
  protected readonly currentYear = new Date().getFullYear();
  protected readonly yearStr = String(this.currentYear);

  protected readonly certCode: string;
  protected readonly questions: readonly MockTestQuestion[];
  private readonly _answers: Record<number, 'A' | 'B' | 'C' | 'D' | null>;

  constructor() {
    const route = inject(ActivatedRoute);
    const router = inject(Router);

    // :code resolves on any entry path (direct URL or programmatic nav); questions/answers only
    // arrive via router state (programmatic nav from the mock-test page) — empty fallback otherwise.
    this.certCode = route.snapshot.paramMap.get('code') ?? '';
    const nav = router.getCurrentNavigation();
    const data = (nav?.extras?.state ?? {}) as Partial<ExamResultData>;
    this.questions = data.questions ?? [];
    this._answers = data.answers ?? {};
  }

  protected get correctCount(): number {
    return this.questions.filter(
      (q, i) => this._answers[i] != null && this._answers[i] === q.correctOptionId,
    ).length;
  }

  protected get incorrectCount(): number {
    return this.questions.filter(
      (q, i) => this._answers[i] != null && this._answers[i] !== q.correctOptionId,
    ).length;
  }

  protected get scorePercent(): number {
    if (this.questions.length === 0) return 0;
    return Math.round((this.correctCount / this.questions.length) * 100);
  }

  protected isCorrectAnswer(index: number, optId: string): boolean {
    return this.questions[index]?.correctOptionId === optId;
  }

  protected isUserSelected(index: number, optId: string): boolean {
    return this._answers[index] === optId;
  }
}

export default MockExamResultPage;
