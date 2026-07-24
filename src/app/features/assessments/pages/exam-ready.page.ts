import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { LanguageService } from '@core/i18n';
import { problemDetailMessage } from '@core/http';

import { AuthFooter, AuthHeader } from '@layouts/auth-shell';
import { CertificatesBadge } from '@ui';

import { ExamApi } from '../data-access/exam.api';
import { type StartContext } from '../data-access/exam-session.store';
import { type ExamReadyNavState } from '../data-access/exam.model';

/**
 * `ios-exam-ready-page` — final pre-start screen. Receives the validated access
 * code + exam metadata from the verify page (router nav state), shows the exam
 * details, and on "Let's start" consumes the code via `POST /exam/start` and
 * hands the live session to the runner.
 *
 * If reached without nav state (e.g. a direct link / refresh), there is no code
 * to start with — a "start from your dashboard" fallback is shown instead.
 *
 * Design reference: Figma node 13271-14042.
 */
@Component({
  selector: 'ios-exam-ready-page',
  imports: [RouterLink, AuthHeader, AuthFooter, CertificatesBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-auth-header />

      <main
        class="flex-1 flex items-center pt-16 px-4 md:px-20 pb-10"
        aria-labelledby="exam-ready-heading"
      >
        <div class="w-full max-w-[606px] flex flex-col gap-14">
          @if (navState(); as exam) {
            <!-- ── Exam info card ─────────────────────────────────────────── -->
            <div class="flex items-center gap-4 rounded-2xl bg-cer-green-soft px-6 py-4">
              <div class="w-24 shrink-0">
                <ios-certificates-badge
                  svgPath="/assets/badge/endorsed_product_owner_practitioner.svg"
                  [code]="exam.examTitle"
                  [fullName]="exam.examTitle"
                />
              </div>
              <div class="flex flex-col">
                <p class="font-bold text-ios-fg text-lg leading-tight" dir="auto">
                  {{ exam.examTitle }}
                </p>
                <p class="font-medium text-ios-fg-10 text-base leading-relaxed">
                  {{ lang.t('assessments.ready.durationLine', { minutes: exam.durationMinutes }) }}
                </p>
              </div>
            </div>

            <div class="flex flex-col gap-[60px]">
              <div class="flex flex-col gap-6">
                <h1
                  id="exam-ready-heading"
                  class="text-[40px] font-bold text-ios-fg-13 leading-snug"
                  dir="auto"
                >
                  {{ lang.t('assessments.ready.heading') }}
                </h1>

                <ul class="space-y-4 text-lg font-medium text-ios-fg-8 list-disc ps-5">
                  <li class="leading-relaxed">
                    {{
                      lang.t('assessments.ready.durationBullet', { minutes: exam.durationMinutes })
                    }}
                  </li>
                  <li class="leading-relaxed">
                    {{ lang.t('assessments.ready.noPauseBullet') }}
                  </li>
                </ul>

                @if (errorMessage()) {
                  <p
                    class="rounded-xl bg-ios-danger-soft px-4 py-3 text-base font-medium text-ios-danger-mid"
                    role="alert"
                  >
                    {{ errorMessage() }}
                  </p>
                }
              </div>

              <button
                type="button"
                [disabled]="starting()"
                (click)="onStart()"
                class="flex h-14 w-full max-w-[444px] items-center justify-center rounded-xl
                       bg-ios-brand-primary text-ios-brand-primary-soft font-semibold text-lg
                       transition-colors hover:bg-ios-brand-primary-hover
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                       focus-visible:ring-ios-brand-primary/50
                       disabled:opacity-50 disabled:pointer-events-none"
              >
                {{
                  starting()
                    ? lang.t('assessments.ready.starting')
                    : lang.t('assessments.ready.letsStart')
                }}
              </button>
            </div>
          } @else {
            <!-- No nav state — nothing to start. -->
            <div class="flex flex-col gap-6" role="status">
              <h1 id="exam-ready-heading" class="text-[32px] font-bold text-ios-fg-13 leading-snug">
                {{ lang.t('assessments.ready.noSessionTitle') }}
              </h1>
              <p class="text-lg font-medium text-ios-fg-8 leading-relaxed">
                {{ lang.t('assessments.ready.noSessionBody') }}
              </p>
              <a
                routerLink="/dashboard"
                class="flex h-14 w-full max-w-[444px] items-center justify-center rounded-xl
                       bg-ios-fg-13 text-white font-semibold text-lg transition-colors hover:bg-[#2a2b2a]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                       focus-visible:ring-ios-fg-13/50"
                >{{ lang.t('assessments.ready.goToDashboard') }}</a
              >
            </div>
          }
        </div>
      </main>

      <ios-auth-footer />
    </div>
  `,
})
export class ExamReadyPage {
  protected readonly lang = inject(LanguageService);
  private readonly api = inject(ExamApi);
  private readonly router = inject(Router);

  private readonly _navState = signal<ExamReadyNavState | null>(null);
  protected readonly navState = this._navState.asReadonly();

  protected readonly starting = signal(false);
  private readonly _error = signal<string | null>(null);
  protected readonly errorMessage = this._error.asReadonly();

  constructor() {
    const nav = this.router.getCurrentNavigation();
    const state = (nav?.extras?.state ?? {}) as Partial<ExamReadyNavState>;
    if (
      state.code &&
      state.examId &&
      state.examTitle &&
      typeof state.durationMinutes === 'number'
    ) {
      this._navState.set({
        code: state.code,
        examId: state.examId,
        examTitle: state.examTitle,
        durationMinutes: state.durationMinutes,
        fullName: state.fullName,
      });
    }
  }

  protected async onStart(): Promise<void> {
    const exam = this._navState();
    if (!exam || this.starting()) return;
    this._error.set(null);
    this.starting.set(true);
    try {
      const start = await firstValueFrom(this.api.start(exam.code, exam.examId));
      const ctx: StartContext = { examTitle: exam.examTitle, examId: exam.examId };
      await this.router.navigate(['/assessments/run', start.sessionId], {
        state: { start, ctx },
      });
    } catch (err) {
      // 409 = active session already exists / code used / pre-exam confirmation
      // required (BE-I-24). Surface the backend's message; fall back to i18n.
      this._error.set(problemDetailMessage(err) ?? this.startFallbackMessage(err));
      this.starting.set(false);
    }
  }

  private startFallbackMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.status === 409) {
      return this.lang.t('assessments.ready.startConflict');
    }
    return this.lang.t('assessments.ready.startError');
  }
}

export default ExamReadyPage;
