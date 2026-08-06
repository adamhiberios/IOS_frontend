import { ChangeDetectionStrategy, Component, type OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';
import { CanadaFlag } from '@ui';
import { DashboardNavbar } from '@layouts';

import { ExamApi } from '../data-access/exam.api';
import { type ExamAttemptReview, type ExamReviewQuestion } from '../data-access/exam.model';

/** Why the review couldn't be shown, mapped to specific copy. */
type ReviewFailure = 'notFound' | 'forbidden' | 'notTerminal' | 'unknown';

/**
 * `ios-exam-review-page` — post-submission answer review for one real-exam
 * attempt (`/assessments/review/:attemptId`).
 *
 * **This is the "Review Correct Answers" section that BE-I-22 previously made
 * impossible.** The backend shipped `GET /exam/attempts/:attemptId/review` in
 * `66a7632`; it is the only real-exam surface that returns the answer key, and
 * it is owner-only and terminal-attempt-only.
 *
 * ## Why it is a route off the attempt history, not part of the result page
 * The design puts the review under the result screen. It cannot live there:
 * `/assessments/result/:sessionId` is keyed by **sessionId**, and the submit
 * response carries no `attemptId` (`ScoreResult` is
 * `{ score, passed, correctCount, totalCount }`), so the result page has no id
 * to review with. Filed as **BE-I-32**. Until submit returns the attempt id,
 * the review is reached from the dashboard's real-exam history, where the id
 * exists — one extra click, but no guessing which attempt is "the" attempt.
 *
 * Reads the param from the route snapshot rather than a signal `input()` — the
 * established pattern here after an absent optional param once crashed a page.
 */
@Component({
  selector: 'ios-exam-review-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DashboardNavbar, CanadaFlag],
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <div class="w-full px-4 md:px-20 pt-5 pb-3">
        <nav class="max-w-[1400px] mx-auto" aria-label="Breadcrumb">
          <ol class="flex items-center gap-2 text-[14px] font-medium leading-[1.4]" role="list">
            <li>
              <a
                routerLink="/dashboard"
                class="text-ios-fg-8 hover:text-ios-fg-11 transition-colors"
              >
                {{ lang.t('assessments.review.breadcrumbParent') }}
              </a>
            </li>
            <li class="text-[#999]" aria-hidden="true">/</li>
            <li>
              <span class="font-bold text-ios-fg-13">
                {{ lang.t('assessments.review.breadcrumbCurrent') }}
              </span>
            </li>
          </ol>
        </nav>
      </div>

      <main class="flex-1 w-full px-4 md:px-20 pb-16" id="main-content">
        <div class="max-w-[840px] mx-auto flex flex-col gap-6">
          @if (loading()) {
            <p class="py-16 text-center text-ios-fg-8" role="status" aria-live="polite">
              {{ lang.t('assessments.review.loading') }}
            </p>
          } @else if (failure(); as reason) {
            <div class="rounded-2xl bg-ios-surface-muted px-6 py-10 text-center" role="alert">
              <p class="text-[15px] font-medium text-ios-fg-13">
                {{ lang.t('assessments.review.failure.' + reason) }}
              </p>
              @if (serverMessage(); as detail) {
                <p class="mt-2 text-sm text-ios-fg-8">{{ detail }}</p>
              }
              <a
                routerLink="/dashboard"
                class="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-ios-fg-13
                       px-5 font-semibold text-white transition-colors hover:bg-[#2a2b2a]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                       focus-visible:ring-ios-fg-13/50"
              >
                {{ lang.t('assessments.review.backToDashboard') }}
              </a>
            </div>
          } @else if (review(); as r) {
            <!-- Summary -->
            <header class="flex flex-col gap-2">
              <h1 class="text-[26px] md:text-[30px] font-bold text-ios-fg-13 leading-snug">
                {{ r.examTitle }}
              </h1>
              <p class="text-[15px] text-ios-fg-8">{{ r.program }}</p>
              <div class="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <span
                  class="inline-flex items-center rounded-full px-3 py-1 font-semibold"
                  [class.bg-green-50]="r.passed"
                  [class.text-green-700]="r.passed"
                  [class.bg-red-50]="!r.passed"
                  [class.text-red-700]="!r.passed"
                >
                  {{
                    r.passed
                      ? lang.t('assessments.review.passed')
                      : lang.t('assessments.review.failed')
                  }}
                </span>
                <span class="text-ios-fg-8">
                  {{ lang.t('assessments.review.score') }}:
                  <strong class="text-ios-fg-13">{{ scoreLabel(r) }}%</strong>
                </span>
                <span class="text-ios-fg-8">
                  {{ lang.t('assessments.review.correctOf') }}:
                  <strong class="text-ios-fg-13">{{ r.correctCount }} / {{ r.totalCount }}</strong>
                </span>
                <span class="text-ios-fg-8">{{ formatDate(r.submittedAt) }}</span>
              </div>
            </header>

            <!-- Per-question review -->
            <ol class="flex flex-col gap-4" role="list">
              @for (q of r.questions; track q.questionId) {
                <li
                  class="rounded-2xl border p-5"
                  [class.border-green-200]="q.isCorrect"
                  [class.bg-green-50/30]="q.isCorrect"
                  [class.border-red-200]="!q.isCorrect"
                  [class.bg-red-50/30]="!q.isCorrect"
                >
                  <div class="mb-3 flex items-start justify-between gap-4">
                    <p class="font-semibold text-ios-fg-13" dir="auto">
                      <span class="me-2 text-ios-fg-8">{{ $index + 1 }}.</span>{{ q.questionText }}
                    </p>
                    <span
                      class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      [class.bg-green-100]="q.isCorrect"
                      [class.text-green-800]="q.isCorrect"
                      [class.bg-red-100]="!q.isCorrect"
                      [class.text-red-800]="!q.isCorrect"
                    >
                      {{
                        q.isCorrect
                          ? lang.t('assessments.review.correct')
                          : lang.t('assessments.review.incorrect')
                      }}
                    </span>
                  </div>

                  <ul class="flex flex-col gap-2" role="list">
                    @for (o of q.options; track o.id) {
                      <li
                        class="flex items-start gap-3 rounded-lg px-3 py-2 text-sm"
                        [class.bg-green-100]="o.isCorrect"
                        [class.bg-red-100]="isWrongPick(q, o.id)"
                      >
                        <span class="mt-0.5 shrink-0 text-xs font-semibold">
                          @if (o.isCorrect) {
                            <span class="text-green-700" aria-hidden="true">✓</span>
                          } @else if (isWrongPick(q, o.id)) {
                            <span class="text-red-700" aria-hidden="true">✕</span>
                          } @else {
                            <span class="inline-block h-4 w-4"></span>
                          }
                        </span>
                        <span class="flex-1 text-ios-fg-13" dir="auto">{{ o.optionText }}</span>
                        <span class="shrink-0 text-xs text-ios-fg-8">
                          @if (o.isCorrect) {
                            {{ lang.t('assessments.review.correctAnswer') }}
                          }
                          @if (q.selectedOptionId === o.id) {
                            {{ lang.t('assessments.review.yourAnswer') }}
                          }
                        </span>
                      </li>
                    }
                  </ul>

                  @if (q.selectedOptionId === null) {
                    <p class="mt-3 text-sm text-ios-fg-8">
                      {{ lang.t('assessments.review.unanswered') }}
                    </p>
                  }

                  <!--
                    The backend reserves "explanation" but always returns null
                    today, so this renders only if it ever starts arriving.
                  -->
                  @if (q.explanation; as explanation) {
                    <p class="mt-3 rounded-lg bg-white/60 p-3 text-sm text-ios-fg-11" dir="auto">
                      {{ explanation }}
                    </p>
                  }
                </li>
              }
            </ol>
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
export class ExamReviewPage implements OnInit {
  private readonly api = inject(ExamApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly lang = inject(LanguageService);
  protected readonly currentYear = String(new Date().getFullYear());

  private readonly attemptId = this.route.snapshot.paramMap.get('attemptId') ?? '';

  protected readonly review = signal<ExamAttemptReview | null>(null);
  protected readonly loading = signal(false);
  protected readonly failure = signal<ReviewFailure | null>(null);
  protected readonly serverMessage = signal<string | null>(null);

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    if (this.attemptId === '') {
      this.failure.set('notFound');
      return;
    }
    this.loading.set(true);
    this.failure.set(null);
    this.serverMessage.set(null);
    try {
      this.review.set(await firstValueFrom(this.api.getAttemptReview(this.attemptId)));
    } catch (err) {
      this.failure.set(classify(err));
      this.serverMessage.set(problemDetailMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  /** Score rounded to at most one decimal (`85.5`, `72`). */
  protected scoreLabel(review: ExamAttemptReview): string {
    return `${Math.round(review.score * 10) / 10}`;
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleString(this.lang.locale());
  }

  /** The student picked this option and it was wrong. */
  protected isWrongPick(question: ExamReviewQuestion, optionId: string): boolean {
    return question.selectedOptionId === optionId && !question.isCorrect;
  }
}

/**
 * Map the documented error contract to specific copy. **422 is the interesting
 * one** — it means the attempt is still in progress, which is a different thing
 * from "not found" and would otherwise read as a broken link.
 */
function classify(err: unknown): ReviewFailure {
  if (!(err instanceof HttpErrorResponse)) return 'unknown';
  if (err.status === 404) return 'notFound';
  if (err.status === 403) return 'forbidden';
  if (err.status === 422) return 'notTerminal';
  return 'unknown';
}

export default ExamReviewPage;
