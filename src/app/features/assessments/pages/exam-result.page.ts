import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideCheck, LucideX, LucideDownload } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { CanadaFlag, CertificatesBadge, IosIcon, provideIcons } from '@ui';
import { DashboardNavbar } from '@layouts';

import type { ExamQuestion, ExamResultNavState, OptionId } from '../data-access/exam.model';
import { DEMO_EXAM_QUESTIONS } from '../data-access/exam.model';

/**
 * `ios-exam-result-page` — Final exam results page.
 *
 * Reached after the learner submits the exam runner (`/assessments/run`).
 * State arrives via `router.getCurrentNavigation()?.extras?.state`.
 *
 * ┌── Layout ──────────────────────────────────────────────────────────────────┐
 * │  DashboardNavbar                                                           │
 * │  Breadcrumb: Final test / Final exam                                       │
 * │  ── max-w-[984px] centered col ───────────────────────────────────────── │
 * │  [Mock test result] pill                                                   │
 * │  Congrats heading / Fail heading                                           │
 * │  subtitle · gold underline                                                 │
 * │  [ certificate.png — full 984 px width ]                                  │
 * │  Share Certificate on:                                                     │
 * │  [LinkedIn] [X] [PDF]  ← each takes 1/3 of the full row                   │
 * │  ┌─ Result card (#F1F1F1) ──────────────────────────────────────────────┐ │
 * │  │  badge · EPO-P / name · ✓ N successful / ✗ N incorrect · Passed pill │ │
 * │  └──────────────────────────────────────────────────────────────────────┘ │
 * │  History of mock test (N tests)                                            │
 * │  ┌─ Q card (#F1F1F1) ─────────────────────────────────────────────────┐   │
 * │  │  N. Question text                                                   │   │
 * │  │  [A] correct option text                        [✓ outline-green]   │   │
 * │  │  [B] wrong pick (grayed)                        [✗ outline-red]     │   │
 * │  └────────────────────────────────────────────────────────────────────┘   │
 * │  Footer                                                                    │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * i18n keys: assessments.result.*  (en / fr / ar)
 * Design ref: Figma node 13172-56939. Content col = 984 px on 1728 px canvas.
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
        <nav aria-label="Breadcrumb">
          <ol class="flex items-center gap-2 text-[14px] font-medium leading-[1.4]" role="list">
            <li>
              <a
                routerLink="/assessments/run"
                class="text-ios-fg-8 hover:text-ios-fg-11 transition-colors"
                >{{ lang.t('assessments.result.breadcrumbParent') }}</a
              >
            </li>
            <li class="text-[#999]" aria-hidden="true">/</li>
            <li>
              <span class="font-bold text-ios-fg-13">
                {{ lang.t('assessments.result.breadcrumbCurrent') }}
              </span>
            </li>
          </ol>
        </nav>
      </div>

      <!-- ── Main content ────────────────────────────────────────────────── -->
      <main class="flex-1 w-full px-4 md:px-20 pb-16" id="main-content">
        <div class="max-w-[984px] mx-auto flex flex-col gap-8">
          <!-- ── Pass / Fail hero ─────────────────────────────────────────── -->
          <div class="flex flex-col items-center gap-3 pt-6 text-center">
            <!-- Status badge -->
            <span
              class="inline-flex items-center rounded-full px-4 py-1.5
                     text-[13px] font-semibold text-white bg-cer-green-strong leading-[1.4]"
              role="status"
            >
              {{ lang.t('assessments.result.statusBadge') }}
            </span>

            <!-- Heading -->
            @if (scorePercent >= 70) {
              <h1 class="text-[38px] md:text-[42px] font-bold text-ios-fg-13 leading-snug">
                {{ lang.t('assessments.result.congratsHeading') }}
                <span class="text-ios-brand-primary-mid">
                  {{ lang.t('assessments.result.finalTestLabel') }}</span
                >
              </h1>
            } @else {
              <h1 class="text-[38px] md:text-[42px] font-bold text-ios-fg-13 leading-snug">
                {{ lang.t('assessments.result.failHeading') }}
                <span class="text-ios-brand-primary-mid">
                  {{ lang.t('assessments.result.finalTestLabel') }}</span
                >
              </h1>
            }

            <!-- Subtitle -->
            <p class="text-[15px] font-medium text-ios-fg-8 leading-relaxed max-w-[560px]">
              {{ lang.t('assessments.result.subtitleBefore')
              }}<strong class="font-semibold text-[#3a5c1a]">{{
                lang.t('assessments.result.certName')
              }}</strong
              >{{ lang.t('assessments.result.subtitleAfter') }}
            </p>

            <!-- Gold underline -->
            <div class="h-[3px] w-20 rounded-full bg-ios-brand-gold" aria-hidden="true"></div>
          </div>

          <!-- ── Certificate image — full 984 px width ─────────────────── -->
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

          <!-- ── Share Certificate ─────────────────────────────────────── -->
          <div class="flex flex-col gap-4">
            <p class="text-[14px] font-medium text-ios-fg-11">
              {{ lang.t('assessments.result.shareCertOn') }}
            </p>

            <!-- 3 buttons — each takes exactly 1/3 of the full row -->
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#0a66c2" aria-hidden="true">
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

          <!-- ── Result summary card ────────────────────────────────────── -->
          <div
            class="rounded-2xl bg-ios-surface-soft px-6 py-5
                   flex items-center gap-5 flex-wrap"
            aria-label="Exam result summary"
          >
            <!-- EPO badge -->
            <div class="w-[72px] shrink-0">
              <ios-certificates-badge
                svgPath="/assets/badge/endorsed_product_owner_practitioner.svg"
                [code]="lang.t('assessments.result.epoCertCode')"
                [fullName]="lang.t('assessments.result.epoCertFullName')"
              />
            </div>

            <!-- Cert label -->
            <div class="flex flex-col gap-0.5 flex-1 min-w-0">
              <p class="font-bold text-ios-fg-13 text-[15px] leading-tight">
                {{ lang.t('assessments.result.epoCertCode') }}
              </p>
              <p class="font-medium text-ios-fg-8 text-[13px] leading-relaxed">
                {{ lang.t('assessments.result.epoCertFullName') }}
              </p>
            </div>

            <!-- Counts -->
            <div class="flex flex-col gap-1 text-[13px] font-medium shrink-0">
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex items-center justify-center size-5 rounded-full bg-ios-success-mid"
                  aria-hidden="true"
                >
                  <ios-icon name="check" class="size-3 text-white" />
                </span>
                <span class="font-bold text-ios-success-strong">{{ correctCount }}</span>
                <span class="text-ios-fg-8">
                  {{ lang.t('assessments.result.successfulAnswers') }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex items-center justify-center size-5 rounded-full bg-ios-danger-mid"
                  aria-hidden="true"
                >
                  <ios-icon name="x" class="size-3 text-white" />
                </span>
                <span class="font-bold text-ios-danger-mid">{{ incorrectCount }}</span>
                <span class="text-ios-fg-8">
                  {{ lang.t('assessments.result.incorrectAnswers') }}
                </span>
              </div>
            </div>

            <!-- Pass / Fail pill -->
            @if (scorePercent >= 70) {
              <div
                class="inline-flex items-center rounded-xl bg-ios-success-soft px-4 py-2.5
                       text-[14px] font-bold text-ios-success-strong shrink-0"
                role="status"
              >
                {{ lang.t('assessments.result.passed', { score: scorePercent.toString() }) }}
              </div>
            } @else {
              <div
                class="inline-flex items-center rounded-xl bg-ios-danger-soft px-4 py-2.5
                       text-[14px] font-bold text-ios-danger-mid shrink-0"
                role="status"
              >
                {{ lang.t('assessments.result.failed', { score: scorePercent.toString() }) }}
              </div>
            }
          </div>

          <!-- ── Question history ────────────────────────────────────────── -->
          <div class="flex flex-col gap-4">
            <h2 class="text-[16px] font-semibold text-ios-fg-13 leading-[1.4]">
              {{ lang.t('assessments.result.historyTitle') }}
              <span class="font-medium text-ios-fg-8">
                {{
                  lang.t('assessments.result.historyCount', { count: questions.length.toString() })
                }}
              </span>
            </h2>

            @for (q of questions; track q.id; let idx = $index) {
              <!-- Question card — bg #F1F1F1 -->
              <div
                class="rounded-xl bg-ios-surface-soft p-5 flex flex-col gap-3"
                [attr.aria-label]="'Question ' + (idx + 1)"
              >
                <!-- Question title -->
                <p class="text-[13px] font-medium text-ios-fg-8 leading-[1.5]">
                  {{ idx + 1 }}.&nbsp; {{ q.text }}
                </p>

                <!-- Answer rows -->
                <div class="flex flex-col gap-2">
                  @for (opt of q.options; track opt.id) {
                    @if (isCorrectAnswer(idx, opt.id) || isWrongPick(idx, opt.id)) {
                      <div class="flex items-center gap-3 rounded-xl bg-white px-4 py-3">
                        <!-- Letter badge -->
                        <span
                          class="inline-flex items-center justify-center size-7 rounded-full
                                 text-[13px] font-bold shrink-0"
                          [class]="optLetterClass(idx, opt.id)"
                          aria-hidden="true"
                          >{{ opt.id }}</span
                        >

                        <!-- Option text -->
                        <span
                          class="flex-1 min-w-px text-[14px] font-medium leading-[1.4]"
                          [class]="isWrongPick(idx, opt.id) ? 'text-[#aaaaaa]' : 'text-ios-fg-11'"
                          >{{ opt.text }}</span
                        >

                        <!-- Result icon — outlined circle -->
                        @if (isCorrectAnswer(idx, opt.id)) {
                          <span
                            class="inline-flex items-center justify-center size-7 rounded-full
                                   border-2 border-ios-success-mid shrink-0"
                            [attr.aria-label]="lang.t('dashboard.examRunner.correct')"
                          >
                            <ios-icon name="check" class="size-4 text-ios-success-mid" />
                          </span>
                        } @else {
                          <span
                            class="inline-flex items-center justify-center size-7 rounded-full
                                   border-2 border-ios-danger-mid shrink-0"
                            [attr.aria-label]="lang.t('dashboard.examRunner.incorrect')"
                          >
                            <ios-icon name="x" class="size-4 text-ios-danger-mid" />
                          </span>
                        }
                      </div>
                    }
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </main>

      <!-- ── Footer ────────────────────────────────────────────────────────── -->
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

  // Snapshot from Router state — set once in the constructor on entry to this page.
  protected readonly questions: readonly ExamQuestion[];
  private readonly _answers: Record<number, OptionId | null>;

  protected readonly copyLabel = signal('Copy link');

  constructor() {
    const router = inject(Router);
    const nav = router.getCurrentNavigation();
    const state = (nav?.extras?.state ?? {}) as Partial<ExamResultNavState>;

    this.questions = state.questions ?? DEMO_EXAM_QUESTIONS;
    this._answers = state.answers ?? {};
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

  protected isWrongPick(index: number, optId: string): boolean {
    return this._answers[index] === optId && !this.isCorrectAnswer(index, optId);
  }

  /** Letter badge: olive-green for correct, grayed for wrong pick. */
  protected optLetterClass(index: number, optId: string): string {
    if (this.isCorrectAnswer(index, optId)) return 'bg-cer-green-strong text-white';
    if (this.isWrongPick(index, optId)) return 'bg-[#e0e0e0] text-[#aaaaaa]';
    return 'bg-ios-fg-mid text-ios-surface-soft';
  }

  protected onShareLinkedIn(): void {
    const url = encodeURIComponent(window.location.origin + '/assessments/result');
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  protected onShareX(): void {
    const text = encodeURIComponent(
      `I scored ${this.scorePercent}% on the EPO-P Final Exam — Institute of Scrum 🎓`,
    );
    const url = encodeURIComponent(window.location.origin + '/assessments/result');
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  protected onDownloadPdf(): void {
    // Epic-9: replace with a signed PDF URL from the backend.
    window.open('/assets/images/certificate.png', '_blank', 'noopener,noreferrer');
  }
}

export default ExamResultPage;
