import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { LucideArrowLeft, LucideArrowRight, LucideClock, LucideWifiOff } from '@lucide/angular';

import { AuthHeader } from '@layouts/auth-shell';
import { CanadaFlag, CertificatesBadge, IosIcon, provideIcons } from '@ui';

import { LanguageService } from '@core/i18n';

import { ExamSessionStore, type StartContext } from '../data-access/exam-session.store';
import { ExamSessionWs } from '../data-access/exam-session.ws';
import {
  type ExamQuestion,
  type ExamResultNavState,
  type ExamSessionStart,
} from '../data-access/exam.model';

/**
 * `ios-exam-runner-page` — the live real-exam runner. Wired to the route-scoped
 * `ExamSessionStore` + `ExamSessionWs` (provided by `assessments.routes.ts`).
 *
 * CLAUDE §10 / `/docs/08-exam-engine.md` discipline enforced here:
 *   · Timer is read from `ws.serverTick()` (Socket.IO `timer_tick`), interpolated
 *     down locally between ticks — never anchored to a local wall clock.
 *   · Submit is gated by `store.canSubmit()` (blocked while pending / not synced).
 *   · Answers flow through `store.setAnswer` → IndexedDB → debounced bulk autosave.
 *   · No correct-answer state leaks — options show default / selected only.
 *
 * Entry: on `run/:sessionId`, either `hydrateFromStart` (fresh start payload in
 * router nav state, from the ready page — Slice 5b) or `resume` (reload).
 * Design reference: Figma node 13271-13907.
 */
@Component({
  selector: 'ios-exam-runner-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuthHeader, CanadaFlag, CertificatesBadge, IosIcon, RouterLink],
  providers: [provideIcons(LucideArrowLeft, LucideArrowRight, LucideClock, LucideWifiOff)],
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-auth-header />

      <div class="flex flex-col flex-1 pt-16">
        <!-- ── Loading / restore-error gates ─────────────────────────────── -->
        @switch (store.sessionStatus()) {
          @case ('starting') {
            <div class="flex-1 flex items-center justify-center p-8" aria-live="polite">
              <p class="text-ios-fg-8 text-base">{{ lang.t('assessments.runner.loading') }}</p>
            </div>
          }
          @case ('error') {
            <div class="flex-1 flex items-center justify-center p-8">
              <div class="max-w-md text-center flex flex-col items-center gap-4" role="alert">
                <h1 class="text-xl font-semibold text-ios-fg-13">
                  {{ lang.t('assessments.runner.restoreErrorTitle') }}
                </h1>
                <p class="text-ios-fg-8">
                  {{ store.error() ?? lang.t('assessments.runner.restoreErrorBody') }}
                </p>
                <a
                  routerLink="/dashboard"
                  class="inline-flex h-12 items-center justify-center rounded-xl bg-ios-fg-13
                         px-6 font-semibold text-white transition-colors hover:bg-[#2a2b2a]
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                         focus-visible:ring-ios-fg-13/50"
                  >{{ lang.t('assessments.runner.backToDashboard') }}</a
                >
              </div>
            </div>
          }
          @default {
            <!-- ── Breadcrumb ───────────────────────────────────────────── -->
            <div
              class="w-full border-b border-ios-surface-soft bg-white flex items-center
                     justify-between gap-3 px-4 md:px-20 h-[70px]"
              [attr.aria-label]="lang.t('assessments.runner.currentPageAriaLabel')"
            >
              <span class="font-semibold text-ios-fg-13 text-base leading-tight">{{
                lang.t('assessments.runner.finalTest')
              }}</span>

              <!-- Connection indicator -->
              @if (connectionBanner(); as banner) {
                <span
                  class="inline-flex items-center gap-2 rounded-full bg-ios-surface-soft
                         px-3 py-1.5 text-[13px] font-medium text-ios-fg-10"
                  role="status"
                  aria-live="polite"
                >
                  <ios-icon name="wifi-off" class="w-4 h-4 text-ios-fg-8" aria-hidden="true" />
                  {{ banner }}
                </span>
              }
            </div>

            <!-- Visually-hidden live regions for time warnings + sync status -->
            <p class="sr-only" aria-live="polite">{{ warningMessage() }}</p>
            <p class="sr-only" aria-live="polite">{{ syncStatusMessage() }}</p>

            <main
              class="flex-1 px-4 md:px-20 py-8 flex flex-col gap-6"
              id="main-content"
              [attr.aria-label]="lang.t('assessments.runner.examQuestionsAriaLabel')"
            >
              <!-- Local-save failure banner (answers still go to the server) -->
              @if (store.draftError()) {
                <div
                  class="rounded-xl bg-ios-danger-soft px-4 py-3 text-[14px] font-medium
                         text-ios-danger-mid"
                  role="alert"
                >
                  {{ lang.t('assessments.runner.draftFailed') }}
                </div>
              }

              <div class="flex flex-col lg:flex-row gap-6 items-start">
                <!-- ── Left: Question panel ──────────────────────────────── -->
                <div
                  class="flex-1 min-w-0 w-full flex flex-col gap-6 rounded-xl bg-ios-surface-soft p-4 md:p-6"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <div class="flex flex-col gap-1.5">
                    <p class="text-[14px] font-medium leading-[1.4] text-ios-fg-8">
                      {{ lang.t('assessments.runner.questionLabel') }}
                    </p>
                    <h1 class="text-[16px] font-medium leading-[1.4] text-ios-fg-11" dir="auto">
                      {{ currentQuestion()?.text }}
                    </h1>
                  </div>

                  <div class="h-1 w-[57px] rounded-full bg-ios-brand-gold" aria-hidden="true"></div>

                  <div
                    class="flex flex-col gap-3"
                    role="radiogroup"
                    [attr.aria-label]="lang.t('assessments.runner.answerOptionsAriaLabel')"
                  >
                    @for (opt of currentQuestion()?.options ?? []; track opt.id; let i = $index) {
                      <button
                        type="button"
                        role="radio"
                        [attr.aria-checked]="selectedOptionId() === opt.id"
                        [disabled]="!canAnswer()"
                        [class]="optionClass(opt.id)"
                        (click)="onSelectOption(opt.id)"
                      >
                        <span [class]="letterBadgeClass(opt.id)" aria-hidden="true">{{
                          letterFor(i)
                        }}</span>
                        <span
                          class="flex-1 min-w-px text-[16px] font-medium leading-[1.5] text-start"
                          dir="auto"
                        >
                          {{ opt.text }}
                        </span>
                      </button>
                    }
                  </div>
                </div>

                <!-- ── Right: sidebar ─────────────────────────────────────── -->
                <aside
                  class="w-full lg:w-[354px] shrink-0 rounded-2xl bg-cer-green-strong p-6 lg:p-8 flex flex-col gap-6"
                  [attr.aria-label]="lang.t('assessments.runner.examProgressAriaLabel')"
                >
                  <div class="flex items-center gap-4">
                    <div class="w-[80px] shrink-0">
                      <ios-certificates-badge
                        svgPath="/assets/badge/endorsed_product_owner_practitioner.svg"
                        [code]="store.examTitle() ?? lang.t('assessments.runner.finalTest')"
                        [fullName]="store.examTitle() ?? ''"
                      />
                    </div>
                    <div class="flex flex-col min-w-0">
                      <p class="font-bold text-white text-lg leading-tight" dir="auto">
                        {{ store.examTitle() ?? lang.t('assessments.runner.finalTest') }}
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center justify-between gap-3">
                    <p class="text-[16px] font-semibold text-white leading-[1.4]">
                      {{ lang.t('dashboard.examRunner.question', { number: currentIndex() + 1 }) }}
                      {{ lang.t('dashboard.examRunner.of', { total: questions().length }) }}
                    </p>
                    <div
                      class="inline-flex items-center gap-2 rounded-[10px] bg-cer-green-deep
                             px-3 py-1.5 h-8 shrink-0"
                      [attr.aria-label]="lang.t('assessments.runner.timeRemainingAriaLabel')"
                    >
                      <ios-icon
                        name="clock"
                        class="w-5 h-5 text-cer-green-soft shrink-0"
                        aria-hidden="true"
                      />
                      <span
                        class="text-[14px] font-semibold text-cer-green-soft tabular-nums leading-[1.4]"
                        >{{ formattedTime() }}</span
                      >
                    </div>
                  </div>

                  <div class="h-px w-full bg-cer-green-text" aria-hidden="true"></div>

                  <div class="flex flex-col gap-2">
                    <div class="flex items-center justify-between">
                      <span class="text-[14px] font-medium text-ios-border-light leading-[1.4]">
                        {{ lang.t('dashboard.examRunner.progress') }}
                      </span>
                      <span
                        class="text-[14px] font-medium text-ios-border-light leading-[1.4] tabular-nums"
                      >
                        {{ progress().answered }} / {{ progress().total }}
                      </span>
                    </div>

                    <div
                      class="h-2 rounded-full bg-cer-green-text overflow-hidden"
                      role="progressbar"
                      [attr.aria-valuenow]="progress().answered"
                      [attr.aria-valuemax]="progress().total"
                      aria-valuemin="0"
                      [attr.aria-label]="
                        lang.t('assessments.runner.progressAriaLabel', {
                          answered: progress().answered,
                          total: progress().total,
                        })
                      "
                    >
                      <div
                        class="h-full rounded-full bg-ios-brand-yellow-bright transition-all duration-300"
                        [style.width.%]="progress().pct"
                      ></div>
                    </div>
                  </div>
                </aside>
              </div>

              <!-- ── Back / Next / Submit ─────────────────────────────────── -->
              <div class="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-6">
                <button
                  type="button"
                  [disabled]="currentIndex() === 0"
                  class="flex h-14 w-full sm:w-[190px] items-center justify-center rounded-xl
                         bg-ios-surface-soft text-ios-fg-10 font-semibold text-lg
                         transition-colors hover:bg-ios-surface-hover
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                         focus-visible:ring-[#d0d0d0]
                         disabled:opacity-40 disabled:pointer-events-none"
                  (click)="onBack()"
                >
                  <ios-icon
                    name="arrow-left"
                    class="w-5 h-5 me-2 rtl:rotate-180"
                    aria-hidden="true"
                  />
                  {{ lang.t('dashboard.examRunner.back') }}
                </button>

                @if (isLastQuestion()) {
                  <button
                    type="button"
                    [disabled]="!store.canSubmit()"
                    class="flex h-14 w-full sm:w-[238px] items-center justify-center rounded-xl
                           bg-ios-fg-13 text-white font-semibold text-lg
                           transition-colors hover:bg-[#2a2b2a]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                           focus-visible:ring-ios-fg-13/50
                           disabled:opacity-40 disabled:pointer-events-none"
                    (click)="onSubmit()"
                  >
                    @if (store.sessionStatus() === 'submitting') {
                      {{ lang.t('assessments.runner.submitting') }}
                    } @else {
                      {{ lang.t('assessments.runner.submitExam') }}
                      <ios-icon
                        name="arrow-right"
                        class="w-5 h-5 ms-2 rtl:rotate-180"
                        aria-hidden="true"
                      />
                    }
                  </button>
                } @else {
                  <button
                    type="button"
                    class="flex h-14 w-full sm:w-[238px] items-center justify-center rounded-xl
                           bg-ios-fg-13 text-white font-semibold text-lg
                           transition-colors hover:bg-[#2a2b2a]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                           focus-visible:ring-ios-fg-13/50"
                    (click)="onNext()"
                  >
                    {{ lang.t('dashboard.examRunner.next') }}
                    <ios-icon
                      name="arrow-right"
                      class="w-5 h-5 ms-2 rtl:rotate-180"
                      aria-hidden="true"
                    />
                  </button>
                }
              </div>
            </main>
          }
        }

        <footer class="bg-ios-fg w-full py-4">
          <div
            class="max-w-[1400px] mx-auto px-4 md:px-8 flex items-center justify-center gap-2
                   text-ios-fg-7 text-xs"
          >
            <ios-canada-flag aria-hidden="true" />
            <span>{{ lang.t('common.copyright', { year: '2026' }) }}</span>
          </div>
        </footer>
      </div>
    </div>
  `,
})
export class ExamRunnerPage {
  protected readonly lang = inject(LanguageService);
  protected readonly store = inject(ExamSessionStore);
  protected readonly ws = inject(ExamSessionWs);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly sessionId = this.route.snapshot.paramMap.get('sessionId');

  /** 0-based index of the currently displayed question (local UI navigation). */
  protected readonly currentIndex = signal(0);

  protected readonly questions = this.store.questions;
  protected readonly progress = this.store.progress;

  protected readonly currentQuestion = computed<ExamQuestion | null>(
    () => this.questions()[this.currentIndex()] ?? null,
  );
  protected readonly isLastQuestion = computed(
    () => this.questions().length > 0 && this.currentIndex() === this.questions().length - 1,
  );
  protected readonly selectedOptionId = computed<string | null>(() => {
    const q = this.currentQuestion();
    return q ? (this.store.answers()[q.id] ?? null) : null;
  });
  protected readonly canAnswer = computed(
    () => this.store.sessionStatus() === 'in-exam' || this.store.sessionStatus() === 'reviewing',
  );

  // ── Timer: read serverTick(), interpolate DOWN locally between ticks ───────
  private readonly uiTick = toSignal(interval(1000), { initialValue: 0 });
  protected readonly displayedRemaining = computed(() => {
    this.uiTick(); // re-evaluate every second
    const tick = this.ws.serverTick();
    if (!tick) return this.store.remainingSeconds();
    const elapsed = Math.floor((Date.now() - tick.receivedAt) / 1000);
    return Math.max(0, tick.remainingSeconds - elapsed);
  });
  protected readonly formattedTime = computed(() => {
    const total = this.displayedRemaining();
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n: number): string => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  });

  protected readonly warningMessage = computed(() => {
    const w = this.ws.lastWarning();
    if (!w) return '';
    if (w.threshold === 600) return this.lang.t('assessments.runner.warn10');
    if (w.threshold === 300) return this.lang.t('assessments.runner.warn5');
    return '';
  });

  protected readonly connectionBanner = computed(() => {
    switch (this.ws.connection()) {
      case 'connecting':
        return this.lang.t('assessments.runner.connecting');
      case 'reconnecting':
        return this.lang.t('assessments.runner.reconnecting');
      default:
        return '';
    }
  });

  protected readonly syncStatusMessage = computed(() => {
    switch (this.store.syncStatus()) {
      case 'syncing':
      case 'queued':
        return this.lang.t('assessments.runner.saving');
      case 'synced':
        return this.lang.t('assessments.runner.saved');
      case 'error':
        return this.lang.t('assessments.runner.saveFailed');
      default:
        return '';
    }
  });

  private navigated = false;

  constructor() {
    const nav = this.router.getCurrentNavigation();
    const state = (nav?.extras?.state ?? {}) as {
      start?: ExamSessionStart;
      ctx?: StartContext;
    };

    if (state.start) {
      const start = state.start;
      // hydrateFromStart sets all in-memory state synchronously before its
      // IndexedDB write, so the WS channel can open immediately — no need to
      // wait for the snapshot-persist to complete.
      void this.store.hydrateFromStart(start, state.ctx ?? {});
      this.ws.connect(start.sessionId);
    } else if (this.sessionId) {
      const sessionId = this.sessionId;
      void this.store.resume(sessionId).then(() => this.ws.connect(sessionId));
    } else {
      // No session id and no start payload — nothing to restore.
      this.store.failRestore();
    }

    // Terminal navigation on submit (the store auto-fires late-submit on expiry).
    effect(() => {
      if (this.store.sessionStatus() === 'submitted' && !this.navigated) {
        this.navigated = true;
        this.ws.disconnect();
        void this.navigateToResult();
      }
    });
  }

  protected onSelectOption(optId: string): void {
    const q = this.currentQuestion();
    if (q) void this.store.setAnswer(q.id, optId);
  }

  protected onNext(): void {
    const next = this.currentIndex() + 1;
    if (next < this.questions().length) this.currentIndex.set(next);
  }

  protected onBack(): void {
    const prev = this.currentIndex() - 1;
    if (prev >= 0) this.currentIndex.set(prev);
  }

  protected onSubmit(): void {
    void this.store.submit(); // the effect navigates to results on 'submitted'
  }

  protected letterFor(index: number): string {
    return String.fromCharCode(65 + index);
  }

  protected optionClass(optId: string): string {
    const base =
      'flex items-center gap-3 w-full rounded-xl px-[13px] py-4 border-2 border-transparent transition-colors text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 cursor-pointer disabled:cursor-default';
    if (this.selectedOptionId() === optId) {
      return `${base} bg-ios-fg-10 text-white font-semibold`;
    }
    return `${base} bg-white text-ios-fg hover:bg-[#f8f8f8]`;
  }

  protected letterBadgeClass(optId: string): string {
    const base =
      'inline-flex items-center justify-center w-6 h-6 rounded-full text-[14px] font-semibold shrink-0';
    if (this.selectedOptionId() === optId) {
      return `${base} bg-ios-surface-mid text-ios-fg`;
    }
    return `${base} bg-ios-fg-mid text-ios-surface-soft`;
  }

  private navigateToResult(): Promise<boolean> {
    const sessionId = this.sessionId ?? this.store.sessionId() ?? '';
    const state: ExamResultNavState = {
      score: this.store.score(),
      examTitle: this.store.examTitle() ?? undefined,
    };
    return this.router.navigate(['/assessments/result', sessionId], { state });
  }
}

export default ExamRunnerPage;
