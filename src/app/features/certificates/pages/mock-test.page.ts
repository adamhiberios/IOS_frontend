import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideCheck,
  LucideClock,
  LucideLightbulb,
  LucideX,
} from '@lucide/angular';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

import { LanguageService } from '@core/i18n';

import { CanadaFlag, IosIcon, provideIcons } from '@ui';
import { DashboardNavbar } from '@layouts';
import type { MockTestQuestion } from '../data-access/certificates.model';
import { CertificatesStore } from '../data-access/certificates.store';
import { CertMockExitDialog } from '../components/cert-mock-exit-dialog';
import { CertMockTimeupDialog } from '../components/cert-mock-timeup-dialog';

/**
 * `ios-mock-test-page` — Full-screen mock exam runner.
 *
 * ┌── Layout ──────────────────────────────────────────────────────────────────┐
 * │  DashboardNavbar                                                           │
 * │  [← Back] breadcrumb                                                      │
 * │                                                                            │
 * │  ┌─ Question panel (flex-1) ─────────┐  ┌─ Sidebar (354px) ────────────┐  │
 * │  │  Question 1                       │  │  Question 1 of N  [🕐 12:00] │  │
 * │  │  <question text>                  │  │  ══ yellow divider ══         │  │
 * │  │                                   │  │  Progress     1 / N           │  │
 * │  │  [A] option text                  │  │  ▓▓▓░░░░░░  (bar)            │  │
 * │  │  [B] option text                  │  └──────────────────────────────┘  │
 * │  │  [C] option text                  │                                     │
 * │  │  [D] option text                  │                                     │
 * │  │                                   │                                     │
 * │  │  [hint text card — if visible]    │                                     │
 * │  │                                   │                                     │
 * │  │  [Hint] ────────── [Back] [Next]  │                                     │
 * │  └───────────────────────────────────┘                                     │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * Answer states (Figma nodes 17737-49884, 13144-55249, 13434-35306):
 *   · default   — white bg, letter circle #535453 / text #f1f1f1
 *   · selected  — bg #373837, letter circle #f6f6f6 / text #272827, row text white
 *   · correct   — bg #ddeeb4, border #91c90e, letter #3d5406, row text #3d5406
 *   · wrong     — bg #FDE8E1, border #D63D13, letter #D63D13, row text #D63D13
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
              (click)="onBackToCertificates()"
            >
              <ios-icon name="arrow-left" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
            </button>
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
                    [routerLink]="['/dashboard/certificates', certCode()]"
                    class="hover:text-ios-fg-10 transition-colors"
                  >
                    {{ certCode() }}
                  </a>
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

          <!-- ── Exit confirmation dialog ─────────────────────────── -->
          @if (showExitDialog()) {
            <ios-cert-mock-exit-dialog
              (dismissed)="showExitDialog.set(false)"
              (confirmed)="onExitConfirmed()"
            />
          }

          <!-- ── Time's up dialog ───────────────────────────────── -->
          @if (showTimeupDialog()) {
            <ios-cert-mock-timeup-dialog (dismissed)="onTimeupExit()" (addTime)="onAddTime()" />
          }

          <!-- ── Main 2-column layout ──────────────────────────────── -->
          <div class="flex gap-6 items-start">
            <!-- ── Left: Question panel ─────────────────────────────── -->
            <div class="flex flex-col flex-1 min-w-0">
              <!-- Question heading -->
              <p class="text-[14px] font-semibold leading-[1.4] text-ios-fg-8 mb-1">
                {{
                  lang.t('dashboard.examRunner.question', {
                    number: (currentIndex() + 1).toString(),
                  })
                }}
              </p>
              <h1 class="text-[20px] font-bold leading-[1.3] text-ios-fg-13 mb-6">
                {{ currentQuestion()?.text }}
              </h1>

              <!-- ── Answer options ───────────────────────────────── -->
              <div class="flex flex-col gap-3" role="radiogroup" aria-label="Answer options">
                @for (opt of currentQuestion()?.options ?? []; track opt.id) {
                  <button
                    type="button"
                    role="radio"
                    [attr.aria-checked]="selectedOptionId() === opt.id"
                    [attr.aria-disabled]="answerPhase() === 'revealed'"
                    [class]="optionClass(opt.id)"
                    (click)="onSelectOption(opt.id)"
                  >
                    <!-- Letter badge -->
                    <span [class]="letterBadgeClass(opt.id)" aria-hidden="true">
                      {{ opt.id }}
                    </span>
                    <!-- Option text -->
                    <span class="text-[16px] font-medium leading-[1.5] text-start flex-1">
                      {{ opt.text }}
                    </span>
                    <!-- State icon (revealed only) -->
                    @if (answerPhase() === 'revealed') {
                      @if (opt.id === currentQuestion()!.correctOptionId) {
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

              <!-- ── Hint card ────────────────────────────────────── -->
              @if (hintVisible()) {
                <div
                  class="mt-4 rounded-2xl bg-[#fffbe6] border border-[#f0d060] px-5 py-4 text-[15px] font-medium leading-[1.5] text-[#5a4a00]"
                  role="note"
                  [attr.aria-label]="lang.t('dashboard.examRunner.hint')"
                >
                  <span class="font-semibold">{{ lang.t('dashboard.examRunner.hint') }}: </span
                  >{{ currentQuestion()?.hint }}
                </div>
              }

              <!-- ── Bottom action bar ──────────────────────────── -->
              <div class="mt-6 flex items-center justify-between gap-4">
                <!-- Hint / Hide toggle -->
                <button
                  type="button"
                  class="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-[15px] font-semibold text-ios-fg-mid bg-ios-surface-soft hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cer-blue-text/50"
                  (click)="hintVisible.set(!hintVisible())"
                >
                  <ios-icon name="lightbulb" class="w-5 h-5" aria-hidden="true" />
                  {{
                    hintVisible()
                      ? lang.t('dashboard.examRunner.hideHint')
                      : lang.t('dashboard.examRunner.hint')
                  }}
                </button>

                <!-- Back + Next -->
                <div class="flex items-center gap-3">
                  <button
                    type="button"
                    [disabled]="currentIndex() === 0"
                    class="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-2xl text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 disabled:opacity-40 disabled:pointer-events-none text-ios-fg bg-ios-surface-soft hover:bg-ios-surface-hover"
                    (click)="onBack()"
                  >
                    <ios-icon name="arrow-left" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
                    {{ lang.t('dashboard.examRunner.back') }}
                  </button>

                  @if (isLastQuestion()) {
                    <button
                      type="button"
                      [disabled]="selectedOptionId() === null"
                      class="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-2xl text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 disabled:opacity-40 disabled:pointer-events-none text-ios-brand-primary-soft bg-ios-brand-primary hover:bg-ios-brand-primary-deep"
                      (click)="onFinish()"
                    >
                      {{ lang.t('dashboard.examRunner.finish') }}
                      <ios-icon name="check" class="w-5 h-5" aria-hidden="true" />
                    </button>
                  } @else {
                    <button
                      type="button"
                      [disabled]="selectedOptionId() === null && answerPhase() === 'answering'"
                      class="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-2xl text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 disabled:opacity-40 disabled:pointer-events-none text-ios-brand-primary-soft bg-ios-fg-13 hover:bg-ios-fg"
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
            <!-- end left panel -->

            <!-- ── Right: Dark progress sidebar ─────────────────────── -->
            <aside
              class="w-[354px] shrink-0 bg-ios-brand-dark rounded-2xl p-8 flex flex-col gap-5"
              aria-label="Exam progress"
            >
              <!-- Question counter + timer -->
              <div class="flex items-center justify-between gap-3">
                <p class="text-[16px] font-semibold leading-[1.4] text-white">
                  {{
                    lang.t('dashboard.examRunner.question', {
                      number: (currentIndex() + 1).toString(),
                    })
                  }}
                  {{ lang.t('dashboard.examRunner.of') }} {{ questions().length }}
                </p>

                @if (timeLimitSeconds() !== null) {
                  <div
                    class="inline-flex items-center gap-1.5 bg-ios-fg-10 rounded-xl px-3 py-1.5"
                    aria-label="Time remaining"
                  >
                    <ios-icon
                      name="clock"
                      class="w-4 h-4 text-ios-brand-yellow-bright shrink-0"
                      aria-hidden="true"
                    />
                    <span
                      class="text-[14px] font-bold leading-[1.2] text-ios-brand-yellow-bright tabular-nums"
                    >
                      {{ formattedTime() }}
                    </span>
                  </div>
                }
              </div>

              <!-- Yellow divider -->
              <div class="h-1 rounded-full bg-[#917f33]" aria-hidden="true"></div>

              <!-- Progress -->
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <span class="text-[14px] font-medium leading-[1.4] text-ios-border-light">{{
                    lang.t('dashboard.examRunner.progress')
                  }}</span>
                  <span
                    class="text-[14px] font-semibold leading-[1.4] text-ios-border-light tabular-nums"
                  >
                    {{ answeredCount() }} / {{ questions().length }}
                  </span>
                </div>

                <!-- Progress bar -->
                <div
                  class="h-2 rounded-full bg-ios-fg-10 overflow-hidden"
                  role="progressbar"
                  [attr.aria-valuenow]="answeredCount()"
                  [attr.aria-valuemax]="questions().length"
                  [attr.aria-valuemin]="0"
                >
                  <div
                    class="h-full rounded-full bg-ios-brand-yellow-bright transition-all duration-300"
                    [style.width.%]="progressPercent()"
                  ></div>
                </div>
              </div>

              <!-- Question dot grid -->
              <!-- <div class="flex flex-wrap gap-2 mt-1" aria-label="Question status grid">
                @for (q of questions(); track q.id; let i = $index) {
                  <button
                    type="button"
                    [class]="dotClass(i)"
                    [attr.aria-label]="'Go to question ' + (i + 1)"
                    (click)="goToQuestion(i)"
                  >
                    {{ i + 1 }}
                  </button>
                }
              </div> -->
            </aside>
            <!-- end sidebar -->
          </div>
          <!-- end 2-col layout -->
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
  private readonly store = inject(CertificatesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly currentYear = new Date().getFullYear();
  protected readonly yearStr = String(this.currentYear);

  protected readonly certCode = computed(() => {
    return (this.route.snapshot.params['code'] as string) ?? '';
  });

  private readonly _timeMinutesParam = computed(() => {
    const raw = this.route.snapshot.queryParams['time'] as string | undefined;
    const parsed = raw ? parseInt(raw, 10) : NaN;
    return isNaN(parsed) ? null : parsed;
  });

  private readonly _questionCountParam = computed(() => {
    const raw = this.route.snapshot.queryParams['count'] as string | undefined;
    const parsed = raw ? parseInt(raw, 10) : NaN;
    return isNaN(parsed) ? 10 : Math.max(1, parsed);
  });

  protected readonly questions = computed<readonly MockTestQuestion[]>(() => {
    const bank = this.store.selectedDetail()?.mockTestQuestions ?? [];
    const count = this._questionCountParam();
    if (bank.length === 0) return [];
    // Demo-data fallback: when the bank is shorter than `count`, repeat it so the user always
    // gets the requested number of questions. Backend-resolved data will be exact in production.
    const result: MockTestQuestion[] = [];
    while (result.length < count) {
      result.push(...bank);
    }
    return result.slice(0, count);
  });

  /** 0-based index of the currently displayed question. */
  protected readonly currentIndex = signal<number>(0);
  private readonly _answers = signal<Record<number, 'A' | 'B' | 'C' | 'D' | null>>({});

  protected readonly selectedOptionId = computed<'A' | 'B' | 'C' | 'D' | null>(
    () => this._answers()[this.currentIndex()] ?? null,
  );

  /**
   * 'answering' → no reveal yet for this question.
   * 'revealed'  → correct/wrong highlights are shown after the user picks an option.
   */
  protected readonly answerPhase = signal<'answering' | 'revealed'>('answering');
  protected readonly hintVisible = signal<boolean>(false);

  protected readonly currentQuestion = computed<MockTestQuestion | null>(
    () => this.questions()[this.currentIndex()] ?? null,
  );

  protected readonly isLastQuestion = computed(
    () => this.currentIndex() === this.questions().length - 1,
  );

  protected readonly answeredCount = computed(
    () => Object.values(this._answers()).filter((v) => v !== null).length,
  );

  protected readonly progressPercent = computed<number>(() => {
    const total = this.questions().length;
    return total === 0 ? 0 : (this.answeredCount() / total) * 100;
  });

  protected readonly showExitDialog = signal<boolean>(false);
  protected readonly showTimeupDialog = signal<boolean>(false);

  /** Total seconds for the exam, or null if no time limit was requested. */
  protected readonly timeLimitSeconds = computed<number | null>(() => {
    const mins = this._timeMinutesParam();
    return mins === null ? null : mins * 60;
  });

  private readonly _timeUp = signal<boolean>(false);

  /** Extra seconds added via the "Continue with +3 minutes" affordance on the time-up dialog. */
  private readonly _extraTimeSeconds = signal<number>(0);

  private readonly _tick = toSignal(interval(1000), { initialValue: 0 });

  /** Seconds remaining (counts down). Null if no time limit. */
  private readonly _timeRemaining = computed<number | null>(() => {
    const limit = this.timeLimitSeconds();
    if (limit === null) return null;
    if (this._timeUp()) return 0;
    const totalLimit = limit + this._extraTimeSeconds();
    const elapsed = this._tick();
    return Math.max(0, totalLimit - elapsed);
  });

  /** Fires once when the timer hits zero so the time-up dialog opens exactly once. */
  private readonly _timerEffect = effect(() => {
    const remaining = this._timeRemaining();
    if (remaining === 0 && !this._timeUp() && this.timeLimitSeconds() !== null) {
      this._timeUp.set(true);
      this.showTimeupDialog.set(true);
    }
  });

  protected readonly formattedTime = computed<string>(() => {
    const secs = this._timeRemaining();
    if (secs === null) return '';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  });

  /** Full Tailwind class string for an answer option button. */
  protected optionClass(optId: 'A' | 'B' | 'C' | 'D'): string {
    const base =
      'flex items-center gap-4 w-full rounded-2xl px-4 py-3 border-2 transition-colors text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50';

    const phase = this.answerPhase();
    const selected = this.selectedOptionId();
    const correct = this.currentQuestion()?.correctOptionId;

    if (phase === 'revealed') {
      if (optId === correct) {
        return `${base} bg-ios-success-soft border-ios-success-mid text-ios-success-strong`;
      }
      if (optId === selected) {
        return `${base} bg-ios-danger-soft border-ios-danger-mid text-ios-danger-mid`;
      }
      return `${base} bg-white border-transparent text-ios-fg opacity-60`;
    }

    if (selected === optId) {
      return `${base} bg-ios-fg-10 border-transparent text-white font-semibold`;
    }
    return `${base} bg-white border-transparent text-ios-fg hover:bg-ios-surface-muted cursor-pointer`;
  }

  /** Letter badge inside an option button. */
  protected letterBadgeClass(optId: 'A' | 'B' | 'C' | 'D'): string {
    const base =
      'inline-flex items-center justify-center w-8 h-8 rounded-full text-[14px] font-bold shrink-0';

    const phase = this.answerPhase();
    const selected = this.selectedOptionId();
    const correct = this.currentQuestion()?.correctOptionId;

    if (phase === 'revealed') {
      if (optId === correct) {
        return `${base} bg-ios-surface-muted text-ios-success-strong`;
      }
      if (optId === selected) {
        return `${base} bg-ios-surface-muted text-ios-danger-mid`;
      }
      return `${base} bg-ios-fg-mid text-ios-surface-soft`;
    }

    if (selected === optId) {
      return `${base} bg-ios-surface-muted text-ios-fg`;
    }
    return `${base} bg-ios-fg-mid text-ios-surface-soft`;
  }

  /** Dot button class in the sidebar question grid. */
  protected dotClass(index: number): string {
    const base =
      'inline-flex items-center justify-center w-8 h-8 rounded-lg text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50';

    if (index === this.currentIndex()) {
      return `${base} bg-ios-brand-yellow-bright text-ios-fg-13`;
    }
    const answered = this._answers()[index] !== undefined && this._answers()[index] !== null;
    if (answered) {
      return `${base} bg-ios-fg-mid text-white`;
    }
    return `${base} bg-ios-fg-10 text-ios-fg-7 hover:bg-ios-fg-8`;
  }

  protected onSelectOption(optId: 'A' | 'B' | 'C' | 'D'): void {
    if (this.answerPhase() === 'revealed') return;
    this._answers.update((prev) => ({ ...prev, [this.currentIndex()]: optId }));
    // Practice-mode UX: auto-reveal the correct answer immediately on selection.
    // (The graded final-exam runner in `features/assessments/` deliberately does NOT do this.)
    this.answerPhase.set('revealed');
    this.hintVisible.set(false);
  }

  protected onNext(): void {
    const next = this.currentIndex() + 1;
    if (next < this.questions().length) {
      this.currentIndex.set(next);
      this.answerPhase.set(
        this._answers()[next] !== undefined && this._answers()[next] !== null
          ? 'revealed'
          : 'answering',
      );
      this.hintVisible.set(false);
    }
  }

  protected onBack(): void {
    const prev = this.currentIndex() - 1;
    if (prev >= 0) {
      this.currentIndex.set(prev);
      this.answerPhase.set(
        this._answers()[prev] !== undefined && this._answers()[prev] !== null
          ? 'revealed'
          : 'answering',
      );
      this.hintVisible.set(false);
    }
  }

  protected goToQuestion(index: number): void {
    this.currentIndex.set(index);
    this.answerPhase.set(
      this._answers()[index] !== undefined && this._answers()[index] !== null
        ? 'revealed'
        : 'answering',
    );
    this.hintVisible.set(false);
  }

  protected onFinish(): void {
    this.navigateToResults();
  }

  // ── Dialog actions ────────────────────────────────────────────────────

  /** Navigate to the results page with exam data. */
  private navigateToResults(): void {
    const code = this.certCode();
    void this.router.navigate(['/dashboard/certificates', code, 'mock-test', 'result'], {
      state: {
        certCode: code,
        questions: this.questions(),
        answers: this._answers(),
      },
    });
  }

  protected onBackToCertificates(): void {
    this.showExitDialog.set(true);
  }

  protected onExitConfirmed(): void {
    this.showExitDialog.set(false);
    this.navigateToResults();
  }

  protected onTimeupExit(): void {
    this.showTimeupDialog.set(false);
    this.navigateToResults();
  }

  /** Time-up dialog action: add 3 extra minutes and let the learner keep going. */
  protected onAddTime(): void {
    this._extraTimeSeconds.update((v) => v + 180);
    this._timeUp.set(false);
    this.showTimeupDialog.set(false);
  }
}

export default MockTestPage;
