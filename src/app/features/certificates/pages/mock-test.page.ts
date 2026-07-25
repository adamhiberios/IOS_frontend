import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideCheck,
  LucideClock,
  LucideLightbulb,
  LucideX,
} from '@lucide/angular';

import { LanguageService } from '@core/i18n';

import { CanadaFlag, IosIcon, provideIcons } from '@ui';
import { DashboardNavbar } from '@layouts';

import { MockStore } from '../data-access/mock.store';
import { MockSessionWs } from '../data-access/mock-session.ws';
import { type MockQuestion } from '../data-access/mock.model';
import { CertMockExitDialog } from '../components/cert-mock-exit-dialog';
import { CertMockTimeupDialog } from '../components/cert-mock-timeup-dialog';

/**
 * `ios-mock-test-page` — the student practice-exam runner, wired to the live
 * backend via `MockStore` (`/mock/*`).
 *
 * Entry (query params): `?certId=<uuid>` starts a fresh attempt (the URL is then
 * rewritten to `?attemptId=` for reload-resume); `?attemptId=<uuid>` resumes one.
 *
 * Mock vs. the graded final exam (`features/assessments`): the timer is SOFT and
 * non-terminal — at zero it prompts to extend (`POST …/extend`, capped) rather
 * than auto-submitting — and the correct answer can be revealed on demand
 * (`POST …/reveal`). Nothing is graded on the client.
 */
@Component({
  selector: 'ios-mock-test-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DashboardNavbar,
    IosIcon,
    RouterLink,
    CanadaFlag,
    CertMockExitDialog,
    CertMockTimeupDialog,
  ],
  providers: [
    provideIcons(
      LucideArrowLeft,
      LucideArrowRight,
      LucideLightbulb,
      LucideClock,
      LucideCheck,
      LucideX,
    ),
  ],
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-dashboard-navbar />

      <main class="flex-1 bg-white" id="main-content">
        <div class="max-w-[1400px] mx-auto px-8 py-6 flex flex-col gap-6">
          <!-- ── Breadcrumb row ─────────────────────────────────────── -->
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="flex items-center justify-center w-11 h-11 rounded-xl bg-ios-surface-soft text-ios-fg hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
              [attr.aria-label]="lang.t('dashboard.certs.backToCertDetail')"
              (click)="onBackRequested()"
            >
              <ios-icon name="arrow-left" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
            </button>
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
                    lang.t('dashboard.certs.mockTestNav')
                  }}</span>
                </li>
              </ol>
            </nav>
          </div>

          @if (showExitDialog()) {
            <ios-cert-mock-exit-dialog
              (dismissed)="showExitDialog.set(false)"
              (confirmed)="onExitConfirmed()"
            />
          }
          @if (showTimeupDialog()) {
            <ios-cert-mock-timeup-dialog (dismissed)="onTimeupExit()" (addTime)="onAddTime()" />
          }

          @switch (store.runnerStatus()) {
            @case ('starting') {
              <p class="text-ios-fg-8 py-16 text-center" aria-live="polite">
                {{ lang.t('courses.common.loading') }}
              </p>
            }
            @case ('error') {
              <div class="py-16 text-center flex flex-col items-center gap-4" role="alert">
                <p class="text-ios-fg-10">{{ store.runnerError() ?? lang.t('mock.startError') }}</p>
                <a
                  routerLink="/courses"
                  class="inline-flex h-11 items-center rounded-xl bg-ios-fg-13 px-6 font-semibold text-white"
                  >{{ lang.t('mock.goToCourses') }}</a
                >
              </div>
            }
            @case ('idle') {
              <div class="py-16 text-center flex flex-col items-center gap-4" role="status">
                <p class="text-ios-fg-10">{{ lang.t('mock.noAttempt') }}</p>
                <a
                  routerLink="/courses"
                  class="inline-flex h-11 items-center rounded-xl bg-ios-fg-13 px-6 font-semibold text-white"
                  >{{ lang.t('mock.goToCourses') }}</a
                >
              </div>
            }
            @default {
              <div class="flex gap-6 items-start">
                <!-- ── Left: Question panel ─────────────────────────────── -->
                <div class="flex flex-col flex-1 min-w-0">
                  <p class="text-[14px] font-semibold leading-[1.4] text-ios-fg-8 mb-1">
                    {{ lang.t('dashboard.examRunner.question', { number: currentIndex() + 1 }) }}
                  </p>
                  <h1 class="text-[20px] font-bold leading-[1.3] text-ios-fg-13 mb-6" dir="auto">
                    {{ currentQuestion()?.text }}
                  </h1>

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
                        [class]="optionClass(opt.id)"
                        (click)="onSelectOption(opt.id)"
                      >
                        <span [class]="letterBadgeClass(opt.id)" aria-hidden="true">{{
                          letterFor(i)
                        }}</span>
                        <span
                          class="text-[16px] font-medium leading-[1.5] text-start flex-1"
                          dir="auto"
                          >{{ opt.text }}</span
                        >
                        @if (revealed(); as rev) {
                          @if (opt.id === rev.correctOptionId) {
                            <ios-icon
                              name="check"
                              class="w-5 h-5 text-ios-success-strong shrink-0"
                              aria-hidden="true"
                            />
                          } @else if (opt.id === selectedOptionId()) {
                            <ios-icon
                              name="x"
                              class="w-5 h-5 text-ios-danger-mid shrink-0"
                              aria-hidden="true"
                            />
                          }
                        }
                      </button>
                    }
                  </div>

                  <div class="mt-6 flex items-center justify-between gap-4">
                    <!-- Reveal correct answer (mock-only) -->
                    <button
                      type="button"
                      [disabled]="selectedOptionId() === null || revealed() !== null"
                      class="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-[15px] font-semibold text-ios-fg-mid bg-ios-surface-soft hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cer-blue-text/50 disabled:opacity-40 disabled:pointer-events-none"
                      (click)="onReveal()"
                    >
                      <ios-icon name="lightbulb" class="w-5 h-5" aria-hidden="true" />
                      {{ lang.t('mock.reveal') }}
                    </button>

                    <div class="flex items-center gap-3">
                      <button
                        type="button"
                        [disabled]="currentIndex() === 0"
                        class="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-2xl text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 disabled:opacity-40 disabled:pointer-events-none text-ios-fg bg-ios-surface-soft hover:bg-ios-surface-hover"
                        (click)="onBack()"
                      >
                        <ios-icon
                          name="arrow-left"
                          class="w-5 h-5 rtl:rotate-180"
                          aria-hidden="true"
                        />
                        {{ lang.t('dashboard.examRunner.back') }}
                      </button>

                      @if (isLastQuestion()) {
                        <button
                          type="button"
                          [disabled]="store.runnerStatus() === 'submitting'"
                          class="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-2xl text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 disabled:opacity-40 disabled:pointer-events-none text-ios-brand-primary-soft bg-ios-brand-primary hover:bg-ios-brand-primary-deep"
                          (click)="onFinish()"
                        >
                          {{
                            store.runnerStatus() === 'submitting'
                              ? lang.t('mock.submitting')
                              : lang.t('dashboard.examRunner.finish')
                          }}
                          <ios-icon name="check" class="w-5 h-5" aria-hidden="true" />
                        </button>
                      } @else {
                        <button
                          type="button"
                          class="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-2xl text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 text-ios-brand-primary-soft bg-ios-fg-13 hover:bg-ios-fg"
                          (click)="onNext()"
                        >
                          {{ lang.t('dashboard.examRunner.next') }}
                          <ios-icon
                            name="arrow-right"
                            class="w-5 h-5 rtl:rotate-180"
                            aria-hidden="true"
                          />
                        </button>
                      }
                    </div>
                  </div>
                </div>

                <!-- ── Right: dark progress sidebar ─────────────────────── -->
                <aside
                  class="w-[354px] shrink-0 bg-ios-brand-dark rounded-2xl p-8 flex flex-col gap-5"
                  [attr.aria-label]="lang.t('assessments.runner.examProgressAriaLabel')"
                >
                  <div class="flex items-center justify-between gap-3">
                    <p class="text-[16px] font-semibold leading-[1.4] text-white">
                      {{ lang.t('dashboard.examRunner.question', { number: currentIndex() + 1 }) }}
                      {{ lang.t('dashboard.examRunner.of') }} {{ questions().length }}
                    </p>
                    <div
                      class="inline-flex items-center gap-1.5 bg-ios-fg-10 rounded-xl px-3 py-1.5"
                      [attr.aria-label]="lang.t('assessments.runner.timeRemainingAriaLabel')"
                    >
                      <ios-icon
                        name="clock"
                        class="w-4 h-4 text-ios-brand-yellow-bright shrink-0"
                        aria-hidden="true"
                      />
                      <span
                        class="text-[14px] font-bold leading-[1.2] text-ios-brand-yellow-bright tabular-nums"
                        >{{ formattedTime() }}</span
                      >
                    </div>
                  </div>

                  <div class="h-1 rounded-full bg-[#917f33]" aria-hidden="true"></div>

                  <div class="flex flex-col gap-2">
                    <div class="flex items-center justify-between">
                      <span class="text-[14px] font-medium leading-[1.4] text-ios-border-light">{{
                        lang.t('dashboard.examRunner.progress')
                      }}</span>
                      <span
                        class="text-[14px] font-semibold leading-[1.4] text-ios-border-light tabular-nums"
                        >{{ store.answeredCount() }} / {{ questions().length }}</span
                      >
                    </div>
                    <div
                      class="h-2 rounded-full bg-ios-fg-10 overflow-hidden"
                      role="progressbar"
                      [attr.aria-valuenow]="store.answeredCount()"
                      [attr.aria-valuemax]="questions().length"
                      [attr.aria-valuemin]="0"
                    >
                      <div
                        class="h-full rounded-full bg-ios-brand-yellow-bright transition-all duration-300"
                        [style.width.%]="progressPercent()"
                      ></div>
                    </div>
                  </div>

                  @if (store.extensionsRemaining() > 0) {
                    <p class="text-[13px] font-medium text-ios-border-light">
                      {{ lang.t('mock.extensionsLeft', { count: store.extensionsRemaining() }) }}
                    </p>
                  }
                </aside>
              </div>
            }
          }
        </div>
      </main>

      <footer class="bg-ios-brand-dark w-full py-4">
        <div
          class="max-w-[1400px] mx-auto px-8 flex items-center justify-center gap-2 text-ios-brand-muted text-xs"
        >
          <ios-canada-flag aria-hidden="true" />
          <span>{{ lang.t('common.copyright', { year: yearStr }) }}</span>
        </div>
      </footer>
    </div>
  `,
})
export class MockTestPage {
  protected readonly lang = inject(LanguageService);
  protected readonly store = inject(MockStore);
  protected readonly ws = inject(MockSessionWs);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly yearStr = String(new Date().getFullYear());

  protected readonly currentIndex = signal(0);
  protected readonly questions = this.store.questions;

  protected readonly currentQuestion = computed<MockQuestion | null>(
    () => this.questions()[this.currentIndex()] ?? null,
  );
  protected readonly isLastQuestion = computed(
    () => this.questions().length > 0 && this.currentIndex() === this.questions().length - 1,
  );
  protected readonly selectedOptionId = computed<string | null>(() => {
    const q = this.currentQuestion();
    return q ? (this.store.answers()[q.id] ?? null) : null;
  });
  /** The reveal result for the current question, or null if not revealed. */
  protected readonly revealed = computed(() => {
    const q = this.currentQuestion();
    return q ? (this.store.reveals()[q.id] ?? null) : null;
  });
  protected readonly progressPercent = computed(() => {
    const total = this.questions().length;
    return total === 0 ? 0 : (this.store.answeredCount() / total) * 100;
  });

  protected readonly showExitDialog = signal(false);
  protected readonly showTimeupDialog = signal(false);

  // ── Soft local countdown, anchored to the server's remainingSeconds ────────
  private readonly uiTick = toSignal(interval(1000), { initialValue: 0 });
  private seededRemaining = 0;
  private seededAtTick = 0;
  protected readonly displayedRemaining = computed(() => {
    const elapsed = this.uiTick() - this.seededAtTick;
    return Math.max(0, this.seededRemaining - elapsed);
  });
  protected readonly formattedTime = computed(() => {
    const secs = this.displayedRemaining();
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (n: number): string => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  });

  private timeUpShown = false;

  constructor() {
    const attemptId = this.route.snapshot.queryParamMap.get('attemptId');
    const certId = this.route.snapshot.queryParamMap.get('certId');
    if (attemptId) {
      void this.store.resume(attemptId).then(() => this.ws.connect(attemptId));
    } else if (certId) {
      void this.store.start(certId).then((id) => {
        if (!id) return;
        this.ws.connect(id);
        // Rewrite the URL so a reload resumes the same attempt.
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { attemptId: id, certId: null },
          replaceUrl: true,
        });
      });
    } else {
      this.store.clear();
    }
    this.destroyRef.onDestroy(() => this.ws.disconnect());

    // Re-anchor the interpolated countdown whenever the AUTHORITATIVE remaining
    // time changes — start/resume/extend and every server `timer_tick` (the WS
    // feeds `MockStore.applyRemaining`). Interpolate down locally between ticks.
    effect(() => {
      this.seededRemaining = this.store.remainingSeconds();
      this.seededAtTick = untracked(() => this.uiTick());
      this.timeUpShown = false;
    });

    // Soft timer reached zero → prompt to extend (never auto-submits).
    effect(() => {
      if (
        this.displayedRemaining() === 0 &&
        !this.timeUpShown &&
        this.store.runnerStatus() === 'active'
      ) {
        this.timeUpShown = true;
        this.showTimeupDialog.set(true);
      }
    });
  }

  protected letterFor(index: number): string {
    return String.fromCharCode(65 + index);
  }

  protected onSelectOption(optionId: string): void {
    const q = this.currentQuestion();
    if (q) this.store.setAnswer(q.id, optionId);
  }

  protected onReveal(): void {
    const q = this.currentQuestion();
    if (q) void this.store.reveal(q.id);
  }

  protected onNext(): void {
    const next = this.currentIndex() + 1;
    if (next < this.questions().length) this.currentIndex.set(next);
  }

  protected onBack(): void {
    const prev = this.currentIndex() - 1;
    if (prev >= 0) this.currentIndex.set(prev);
  }

  protected onFinish(): void {
    void this.submitAndGo();
  }

  private async submitAndGo(): Promise<void> {
    const result = await this.store.submit();
    if (result) {
      void this.router.navigate(['/dashboard/certificates/mock-test/result'], {
        queryParams: { attemptId: result.attemptId },
      });
    }
  }

  protected onBackRequested(): void {
    this.showExitDialog.set(true);
  }

  protected onExitConfirmed(): void {
    this.showExitDialog.set(false);
    void this.submitAndGo(); // "Exit" grades whatever was answered so far.
  }

  protected onTimeupExit(): void {
    this.showTimeupDialog.set(false);
    void this.submitAndGo();
  }

  /** Extend the soft timer via the backend (capped). `extend` updates the store's
   *  remaining time, which the anchor effect picks up to re-seed the countdown. */
  protected onAddTime(): void {
    this.showTimeupDialog.set(false);
    void this.store.extend();
  }

  protected optionClass(optionId: string): string {
    const base =
      'flex items-center gap-4 w-full rounded-2xl px-4 py-3 border-2 transition-colors text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50';
    const rev = this.revealed();
    const selected = this.selectedOptionId();
    if (rev) {
      if (optionId === rev.correctOptionId)
        return `${base} bg-ios-success-soft border-ios-success-mid text-ios-success-strong`;
      if (optionId === selected)
        return `${base} bg-ios-danger-soft border-ios-danger-mid text-ios-danger-mid`;
      return `${base} bg-white border-transparent text-ios-fg opacity-60`;
    }
    if (selected === optionId)
      return `${base} bg-ios-fg-10 border-transparent text-white font-semibold`;
    return `${base} bg-white border-transparent text-ios-fg hover:bg-ios-surface-muted cursor-pointer`;
  }

  protected letterBadgeClass(optionId: string): string {
    const base =
      'inline-flex items-center justify-center w-8 h-8 rounded-full text-[14px] font-bold shrink-0';
    const rev = this.revealed();
    const selected = this.selectedOptionId();
    if (rev) {
      if (optionId === rev.correctOptionId)
        return `${base} bg-ios-surface-muted text-ios-success-strong`;
      if (optionId === selected) return `${base} bg-ios-surface-muted text-ios-danger-mid`;
      return `${base} bg-ios-fg-mid text-ios-surface-soft`;
    }
    if (selected === optionId) return `${base} bg-ios-surface-muted text-ios-fg`;
    return `${base} bg-ios-fg-mid text-ios-surface-soft`;
  }
}

export default MockTestPage;
