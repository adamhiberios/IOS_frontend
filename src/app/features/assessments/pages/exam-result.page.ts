import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideCheck, LucideX, LucideDownload } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { CanadaFlag, CertificatesBadge, IosIcon, provideIcons } from '@ui';
import { DashboardNavbar } from '@layouts';

import { type ExamResultNavState, type ExamScoreResult } from '../data-access/exam.model';

/**
 * `ios-exam-result-page` — real-exam results.
 *
 * Reached after the runner submits (`/assessments/run/:sessionId` →
 * `/assessments/result/:sessionId`). The aggregate `ExamScoreResult` arrives via
 * `router.getCurrentNavigation()?.extras?.state` (see `ExamResultNavState`).
 *
 * **BE-I-22 is fixed** (backend `66a7632`): `GET /exam/attempts/:attemptId/review`
 * now returns the answer key for terminal attempts, and the review UI is built
 * — as `ios-exam-review-page` at `/assessments/review/:attemptId`.
 *
 * ⚠️ It is deliberately **not inlined here**, and cannot be: this route is keyed
 * by **sessionId**, while the review endpoint takes an **attemptId** that the
 * submit response does not return (`ScoreResult` is
 * `{ score, passed, correctCount, totalCount }`). Filed as **BE-I-32**. Until
 * submit returns the attempt id, the review is reached from the dashboard's
 * real-exam history, which has it. Do not "fix" this by fetching
 * `GET /exam/attempts` here and guessing which row is the attempt just
 * submitted — that is racy with a concurrent attempt and wrong under retakes.
 *
 * This page therefore shows the aggregate score / pass-fail. `score` may be
 * `null` for a terminal race (already-submitted / grace-closed auto-submit) —
 * then a neutral "submitted, see your history" state is shown.
 *
 * Design ref: Figma node 13172-56939.
 */
@Component({
  selector: 'ios-exam-result-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, RouterLink, DashboardNavbar, CanadaFlag, CertificatesBadge, IosIcon],
  providers: [provideIcons(LucideCheck, LucideX, LucideDownload)],
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <!-- ── Breadcrumb ──────────────────────────────────────────────────── -->
      <div class="w-full px-4 md:px-20 pt-5 pb-3">
        <nav class="max-w-[1400px] mx-auto" aria-label="Breadcrumb">
          <ol class="flex items-center gap-2 text-[14px] font-medium leading-[1.4]" role="list">
            <li>
              <a
                routerLink="/dashboard"
                class="text-ios-fg-8 hover:text-ios-fg-11 transition-colors"
                >{{ lang.t('assessments.result.breadcrumbParent') }}</a
              >
            </li>
            <li class="text-[#999]" aria-hidden="true">/</li>
            <li>
              <span class="font-bold text-ios-fg-13">{{
                lang.t('assessments.result.breadcrumbCurrent')
              }}</span>
            </li>
          </ol>
        </nav>
      </div>

      <main class="flex-1 w-full px-4 md:px-20 pb-16" id="main-content">
        <div class="max-w-[984px] mx-auto flex flex-col gap-8">
          @if (score; as result) {
            <!-- ── Pass / Fail hero ───────────────────────────────────────── -->
            <div class="flex flex-col items-center gap-3 pt-6 text-center">
              <span
                class="inline-flex items-center rounded-full px-4 py-1.5
                       text-[13px] font-semibold text-white bg-cer-green-strong leading-[1.4]"
                role="status"
              >
                {{ lang.t('assessments.result.statusBadge') }}
              </span>

              <h1 class="text-[38px] md:text-[42px] font-bold text-ios-fg-13 leading-snug">
                @if (result.passed) {
                  {{ lang.t('assessments.result.congratsHeading') }}
                } @else {
                  {{ lang.t('assessments.result.failHeading') }}
                }
                <span class="text-ios-brand-primary-mid">
                  {{ lang.t('assessments.result.finalTestLabel') }}</span
                >
              </h1>

              <p
                class="text-[15px] font-medium text-ios-fg-8 leading-relaxed max-w-[560px]"
                dir="auto"
              >
                {{ examTitle || lang.t('assessments.result.certName') }}
              </p>

              <div class="h-[3px] w-20 rounded-full bg-ios-brand-gold" aria-hidden="true"></div>
            </div>

            <!-- Certificate + share — only when passed -->
            @if (result.passed) {
              <div class="w-full">
                <img
                  ngSrc="/assets/images/certificate.png"
                  [alt]="lang.t('assessments.result.epoCertCode') + ' Certificate'"
                  class="w-full rounded-xl"
                  width="984"
                  height="700"
                  priority
                />
              </div>

              <div class="flex flex-col gap-4">
                <p class="text-[14px] font-medium text-ios-fg-11">
                  {{ lang.t('assessments.result.shareCertOn') }}
                </p>
                <div class="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    (click)="onShareLinkedIn()"
                    class="flex items-center justify-center gap-2 h-14 px-4 rounded-xl
                           border border-ios-surface-hover bg-white text-ios-fg-11
                           font-medium text-[14px] transition-colors hover:bg-[#f8f8f8]
                           focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-offset-2 focus-visible:ring-[#0a66c2]/40"
                    [attr.aria-label]="lang.t('assessments.result.shareLinkedin')"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="#0a66c2"
                      aria-hidden="true"
                    >
                      <path
                        d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"
                      />
                      <rect x="2" y="9" width="4" height="12" />
                      <circle cx="4" cy="4" r="2" />
                    </svg>
                    {{ lang.t('assessments.result.shareLinkedin') }}
                  </button>

                  <button
                    type="button"
                    (click)="onShareX()"
                    class="flex items-center justify-center gap-2 h-14 px-4 rounded-xl
                           border border-ios-surface-hover bg-white text-ios-fg-11
                           font-medium text-[14px] transition-colors hover:bg-[#f8f8f8]
                           focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-offset-2 focus-visible:ring-ios-fg-13/20"
                    [attr.aria-label]="lang.t('assessments.result.shareX')"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                      />
                    </svg>
                    {{ lang.t('assessments.result.shareX') }}
                  </button>

                  <button
                    type="button"
                    (click)="onDownloadPdf()"
                    class="flex items-center justify-center gap-2 h-14 px-4 rounded-xl
                           border border-ios-surface-hover bg-white text-ios-fg-11
                           font-medium text-[14px] transition-colors hover:bg-[#f8f8f8]
                           focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-offset-2 focus-visible:ring-ios-fg-11/20"
                    [attr.aria-label]="lang.t('assessments.result.downloadPdf')"
                  >
                    <ios-icon name="download" class="size-[18px]" aria-hidden="true" />
                    {{ lang.t('assessments.result.downloadPdf') }}
                  </button>
                </div>
              </div>
            }

            <!-- ── Result summary card ──────────────────────────────────────── -->
            <div
              class="rounded-2xl bg-ios-surface-soft px-6 py-5 flex items-center gap-5 flex-wrap"
              aria-label="Exam result summary"
            >
              <div class="w-[72px] shrink-0">
                <ios-certificates-badge
                  svgPath="/assets/badge/endorsed_product_owner_practitioner.svg"
                  [code]="examTitle || lang.t('assessments.result.epoCertCode')"
                  [fullName]="examTitle || lang.t('assessments.result.epoCertFullName')"
                />
              </div>

              <div class="flex flex-col gap-0.5 flex-1 min-w-0">
                <p class="font-bold text-ios-fg-13 text-[15px] leading-tight" dir="auto">
                  {{ examTitle || lang.t('assessments.result.epoCertCode') }}
                </p>
              </div>

              <div class="flex flex-col gap-1 text-[13px] font-medium shrink-0">
                <div class="flex items-center gap-2">
                  <span
                    class="inline-flex items-center justify-center size-5 rounded-full bg-ios-success-mid"
                    aria-hidden="true"
                  >
                    <ios-icon name="check" class="size-3 text-white" />
                  </span>
                  <span class="font-bold text-ios-success-strong">{{ result.correctCount }}</span>
                  <span class="text-ios-fg-8">{{
                    lang.t('assessments.result.successfulAnswers')
                  }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class="inline-flex items-center justify-center size-5 rounded-full bg-ios-danger-mid"
                    aria-hidden="true"
                  >
                    <ios-icon name="x" class="size-3 text-white" />
                  </span>
                  <span class="font-bold text-ios-danger-mid">{{ incorrectCount() }}</span>
                  <span class="text-ios-fg-8">{{
                    lang.t('assessments.result.incorrectAnswers')
                  }}</span>
                </div>
              </div>

              @if (result.passed) {
                <div
                  class="inline-flex items-center rounded-xl bg-ios-success-soft px-4 py-2.5
                         text-[14px] font-bold text-ios-success-strong shrink-0"
                  role="status"
                >
                  {{ lang.t('assessments.result.passed', { score: scorePercent().toString() }) }}
                </div>
              } @else {
                <div
                  class="inline-flex items-center rounded-xl bg-ios-danger-soft px-4 py-2.5
                         text-[14px] font-bold text-ios-danger-mid shrink-0"
                  role="status"
                >
                  {{ lang.t('assessments.result.failed', { score: scorePercent().toString() }) }}
                </div>
              }
            </div>

            <!--
              The per-question "Review Correct Answers" list lives at
              /assessments/review/:attemptId (ios-exam-review-page), not here:
              this route only knows the sessionId, and the review endpoint is
              keyed by attemptId which submit does not return (BE-I-32). It is
              linked from the dashboard's real-exam history, which has the id.
            -->
          } @else {
            <!-- Terminal race (already submitted / grace-closed auto-submit): no score body. -->
            <div class="flex flex-col items-center gap-4 pt-10 text-center" role="status">
              <h1 class="text-[30px] md:text-[34px] font-bold text-ios-fg-13 leading-snug">
                {{ lang.t('assessments.result.submittedNeutralTitle') }}
              </h1>
              <p class="text-[15px] font-medium text-ios-fg-8 leading-relaxed max-w-[520px]">
                {{ lang.t('assessments.result.submittedNeutralBody') }}
              </p>
              <a
                routerLink="/dashboard"
                class="inline-flex h-12 items-center justify-center rounded-xl bg-ios-fg-13 px-6
                       font-semibold text-white transition-colors hover:bg-[#2a2b2a]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                       focus-visible:ring-ios-fg-13/50"
                >{{ lang.t('assessments.result.viewInDashboard') }}</a
              >
            </div>
          }
        </div>
      </main>

      <footer class="bg-ios-fg w-full py-4 mt-4">
        <div
          class="max-w-[1400px] mx-auto px-8 flex items-center justify-center gap-2
                 text-ios-fg-7 text-xs"
        >
          <ios-canada-flag aria-hidden="true" />
          <span>{{ lang.t('common.copyright', { year: currentYear }) }}</span>
        </div>
      </footer>
    </div>
  `,
})
export class ExamResultPage {
  protected readonly lang = inject(LanguageService);
  protected readonly currentYear = String(new Date().getFullYear());

  // Immutable snapshot from Router state — read once on entry.
  protected readonly score: ExamScoreResult | null;
  protected readonly examTitle: string;

  constructor() {
    const router = inject(Router);
    const nav = router.getCurrentNavigation();
    const state = (nav?.extras?.state ?? {}) as Partial<ExamResultNavState>;
    this.score = state.score ?? null;
    this.examTitle = state.examTitle ?? '';
  }

  protected scorePercent(): number {
    return Math.round(this.score?.score ?? 0);
  }

  protected incorrectCount(): number {
    const s = this.score;
    return s ? Math.max(0, s.totalCount - s.correctCount) : 0;
  }

  protected onShareLinkedIn(): void {
    const url = encodeURIComponent(window.location.origin);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  protected onShareX(): void {
    const text = encodeURIComponent(
      `I scored ${this.scorePercent()}% on my Institute of Scrum final exam 🎓`,
    );
    const url = encodeURIComponent(window.location.origin);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  protected onDownloadPdf(): void {
    // Deferred: replace with a signed certificate PDF URL from the backend.
    window.open('/assets/images/certificate.png', '_blank', 'noopener,noreferrer');
  }
}

export default ExamResultPage;
