import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideCheck, LucideX, LucideArrowLeft, LucideArrowRight } from '@lucide/angular';

import { LanguageService } from '@core/i18n';

import { IosIcon, provideIcons } from '@ui';
import { DashboardNavbar } from '@layouts';

import { MockStore } from '../data-access/mock.store';

/**
 * `ios-mock-exam-result-page` — mock-attempt review, wired to `MockStore`
 * (`GET /mock/attempts/:id`). Mock attempts DO reveal the answer key (unlike the
 * graded final exam — BE-I-22), so this shows a per-question correct/incorrect
 * breakdown plus the advisory readiness signal.
 *
 * Entry: `?attemptId=<uuid>` (from the runner's submit).
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
              routerLink="/courses"
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
                  <a routerLink="/courses" class="hover:text-ios-fg-10 transition-colors">{{
                    lang.t('courses.index.title')
                  }}</a>
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

          @if (store.reviewLoading()) {
            <p class="text-ios-fg-8 py-16 text-center" aria-live="polite">
              {{ lang.t('courses.common.loading') }}
            </p>
          } @else if (store.reviewError()) {
            <p
              class="rounded-xl bg-ios-danger-soft px-4 py-3 text-sm font-medium text-ios-danger-mid"
              role="alert"
            >
              {{ store.reviewError() }}
            </p>
          } @else if (store.review(); as review) {
            <div class="flex gap-6 items-start">
              <!-- ── Left column: per-question review ─────────────────── -->
              <div class="flex flex-col gap-4 flex-1 min-w-0">
                <div class="flex items-center gap-3">
                  <h2 class="text-[18px] font-semibold leading-[1.4] text-ios-fg-13">
                    {{ lang.t('dashboard.examRunner.historyOfMockTest') }}
                  </h2>
                  <span class="text-[16px] font-medium leading-[1.4] text-ios-fg-8">{{
                    lang.t('dashboard.certs.tests', { count: review.questions.length })
                  }}</span>
                </div>

                @for (q of review.questions; track q.questionId; let idx = $index) {
                  <div class="bg-ios-surface-soft flex flex-col gap-3 p-6 rounded-xl w-full">
                    <div
                      class="flex gap-1.5 items-start text-[16px] font-medium leading-[1.4] text-ios-fg-11"
                    >
                      <span class="shrink-0">{{ idx + 1 }}.</span>
                      <span dir="auto">{{ q.questionText }}</span>
                    </div>

                    @for (opt of q.options; track opt.id; let oi = $index) {
                      @if (opt.id === q.correctOptionId || opt.id === q.selectedOptionId) {
                        <div class="bg-white flex items-center gap-3 p-[13px] rounded-xl w-full">
                          <div
                            class="flex items-center justify-center size-6 rounded-full shrink-0 bg-ios-fg-mid"
                          >
                            <span
                              class="text-[14px] font-semibold leading-[1.4] text-ios-surface-soft"
                              >{{ letterFor(oi) }}</span
                            >
                          </div>
                          <p
                            class="flex-1 min-w-px text-[16px] font-medium leading-[1.4] text-ios-fg"
                            dir="auto"
                          >
                            {{ opt.text }}
                          </p>
                          @if (opt.id === q.correctOptionId) {
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

              <!-- ── Right column: result summary ─────────────────────── -->
              <aside
                class="w-[354px] shrink-0 bg-ios-brand-dark rounded-2xl flex flex-col gap-6 p-8 sticky top-6"
                aria-label="Mock result summary"
              >
                <div
                  class="inline-flex items-center gap-2 bg-ios-fg-10 rounded-xl px-3 py-1.5 self-start text-[16px] whitespace-nowrap"
                >
                  <span class="font-semibold leading-[1.4] text-ios-brand-yellow-bright">{{
                    lang.t('dashboard.examRunner.resultLabel')
                  }}</span>
                  <span class="font-bold leading-[1.3] text-ios-brand-yellow-bright"
                    >({{ scorePercent() }}%)</span
                  >
                </div>

                <div class="h-1 rounded-full bg-[#917f33]" aria-hidden="true"></div>

                <div class="flex items-center gap-4">
                  <div class="flex items-center gap-3">
                    <div class="flex items-center gap-1">
                      <ios-icon name="check" class="size-7 text-[#a7d43e]" aria-hidden="true" />
                      <span class="text-[18px] font-medium leading-[1.4] text-[#a7d43e]">{{
                        review.correctCount
                      }}</span>
                    </div>
                    <span class="text-[18px] font-bold leading-[1.2] text-[#a7d43e]">{{
                      lang.t('dashboard.examRunner.trueLabel')
                    }}</span>
                  </div>
                  <span class="text-[18px] font-medium leading-[1.4] text-ios-fg-7">/</span>
                  <div class="flex items-center gap-3">
                    <div class="flex items-center gap-1">
                      <ios-icon name="x" class="size-7 text-[#ff715d]" aria-hidden="true" />
                      <span class="text-[18px] font-medium leading-[1.4] text-[#ff715d]">{{
                        review.falseCount
                      }}</span>
                    </div>
                    <span class="text-[18px] font-bold leading-[1.2] text-[#ff715d]">{{
                      lang.t('dashboard.examRunner.falseLabel')
                    }}</span>
                  </div>
                </div>

                <!-- Advisory readiness message -->
                <p class="text-[14px] font-medium leading-[1.5] text-ios-border-light">
                  {{ review.readiness.message }}
                </p>
              </aside>
            </div>

            <!-- ── "Ready for the final?" CTA ─────────────────────────── -->
            <section
              class="bg-ios-fg-13 w-full py-16 -mx-8 mt-2 px-8"
              aria-label="Final test call to action"
            >
              <div class="max-w-[1400px] mx-auto flex flex-col items-center gap-10">
                <div class="flex flex-col items-center gap-3">
                  <h2 class="text-[24px] font-bold leading-[1.2] text-white text-center">
                    {{
                      review.readyForFinal
                        ? lang.t('mock.readyHeading')
                        : lang.t('mock.keepPractisingHeading')
                    }}
                  </h2>
                  <div
                    class="h-1 rounded-full bg-ios-brand-gold w-[274px]"
                    aria-hidden="true"
                  ></div>
                </div>
                <a
                  routerLink="/assessments/verify"
                  class="inline-flex items-center gap-3 h-14 px-6 rounded-xl text-[18px] font-semibold leading-[1.4] text-ios-fg bg-white hover:bg-neutral-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  {{ lang.t('dashboard.examRunner.startFinalTestCta') }}
                  <ios-icon
                    name="arrow-right"
                    class="size-6 shrink-0 rtl:rotate-180"
                    aria-hidden="true"
                  />
                </a>
                <a
                  routerLink="/dashboard/certificates/mock-test/history"
                  class="text-[15px] font-medium text-white/80 hover:text-white underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  >{{ lang.t('mock.history.viewAll') }}</a
                >
              </div>
            </section>
          } @else {
            <div
              class="flex flex-col items-center justify-center gap-4 py-24 text-center"
              role="status"
            >
              <p class="text-[18px] font-medium text-ios-fg-8">
                {{ lang.t('dashboard.examRunner.noResultsFound') }}
              </p>
              <a
                routerLink="/courses"
                class="text-ios-brand-primary underline hover:no-underline"
                >{{ lang.t('mock.goToCourses') }}</a
              >
            </div>
          }
        </div>
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
  protected readonly store = inject(MockStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly yearStr = String(new Date().getFullYear());

  protected readonly scorePercent = computed(() => Math.round(this.store.review()?.score ?? 0));

  constructor() {
    const attemptId = this.route.snapshot.queryParamMap.get('attemptId');
    if (attemptId) void this.store.loadReview(attemptId);
  }

  protected letterFor(index: number): string {
    return String.fromCharCode(65 + index);
  }
}

export default MockExamResultPage;
