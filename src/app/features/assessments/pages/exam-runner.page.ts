import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { LucideArrowLeft, LucideArrowRight, LucideClock } from '@lucide/angular';

import { AuthHeader } from '@layouts/auth-shell';
import { CanadaFlag, CertificatesBadge, IosIcon, provideIcons } from '@ui';

import { DEMO_EXAM_QUESTIONS, type ExamQuestion, type OptionId } from '../data-access/exam.model';

/**
 * `ios-exam-runner-page` — Final exam question runner.
 *
 * ┌── Layout ──────────────────────────────────────────────────────────────────┐
 * │  ios-auth-header (absolute, white/blur)                                    │
 * │  [Final test]  breadcrumb                                                  │
 * │                                                                            │
 * │  ┌─ Question panel (flex-1, bg-gray) ──┐  ┌─ Sidebar (354px, epo-green) ─┐ │
 * │  │  Question                           │  │  [Badge]  EPO-P / Full name  │ │
 * │  │  <question text>                    │  │  Q 1 of N          [⏱ MM:SS] │ │
 * │  │  ─── gold line ───                  │  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━  │ │
 * │  │  [A] option                         │  │  Progress        1 / N        │ │
 * │  │  [B] option                         │  │  ▓▓░░░░░░░░ (yellow bar)     │ │
 * │  │  [C] option                         │  └──────────────────────────────┘ │
 * │  │  [D] option                         │                                    │
 * │  └─────────────────────────────────────┘                                   │
 * │                           [Back]  [Next / Submit]                          │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * Key difference from mock-test:
 *   · Correct answers are NOT revealed when the learner selects an option.
 *   · There is no hint button.
 *   · Options show only two states: default (white) and selected (dark gray).
 *   · Answers are revealed on the result page after submission.
 *
 * Design reference: Figma node 13271-13907.
 *
 * CLAUDE.md §10 — exam engine discipline:
 *   · Timer reads from a local signal for UI only (server tick in epic-9).
 *   · Submit is blocked while any question is unanswered.
 *   · State flows to result page via router navigation state (not localStorage).
 */
@Component({
  selector: 'ios-exam-runner-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuthHeader, CanadaFlag, CertificatesBadge, IosIcon],
  providers: [provideIcons(LucideArrowLeft, LucideArrowRight, LucideClock)],
  template: `
    <div class="min-h-screen flex flex-col bg-white">
      <ios-auth-header />

      <!-- Page body — clears the absolute header -->
      <div class="flex flex-col flex-1 pt-16">
        <!-- ── Breadcrumb ─────────────────────────────────────────────── -->
        <div
          class="w-full border-b border-[#f1f1f1] bg-white flex items-center
                 px-4 md:px-20 h-[70px]"
          aria-label="Current page"
        >
          <span class="font-semibold text-[#141514] text-base leading-tight">Final test</span>
        </div>

        <!-- ── Main content ────────────────────────────────────────────── -->
        <main
          class="flex-1 px-4 md:px-20 py-8 flex flex-col gap-6"
          id="main-content"
          aria-label="Exam questions"
        >
          <!-- ── Two-column layout ──────────────────────────────────── -->
          <div class="flex gap-6 items-start">
            <!-- ── Left: Question panel ──────────────────────────────── -->
            <div
              class="flex-1 min-w-0 flex flex-col gap-6 rounded-xl bg-[#f1f1f1] p-6"
              aria-live="polite"
              aria-atomic="true"
            >
              <!-- Question label + text -->
              <div class="flex flex-col gap-1.5">
                <p class="text-[14px] font-medium leading-[1.4] text-[#666766]">Question</p>
                <h1 class="text-[16px] font-medium leading-[1.4] text-[#303130]">
                  {{ currentQuestion()?.text }}
                </h1>
              </div>

              <!-- Gold accent line -->
              <div class="h-1 w-[57px] rounded-full bg-[#d9bd4c]" aria-hidden="true"></div>

              <!-- ── Answer options ──────────────────────────────────── -->
              <div class="flex flex-col gap-3" role="radiogroup" aria-label="Answer options">
                @for (opt of currentQuestion()?.options ?? []; track opt.id) {
                  <button
                    type="button"
                    role="radio"
                    [attr.aria-checked]="selectedOptionId() === opt.id"
                    [class]="optionClass(opt.id)"
                    (click)="onSelectOption(opt.id)"
                  >
                    <!-- Letter badge -->
                    <span [class]="letterBadgeClass(opt.id)" aria-hidden="true">{{ opt.id }}</span>

                    <!-- Option text -->
                    <span class="flex-1 min-w-px text-[16px] font-medium leading-[1.5] text-start">
                      {{ opt.text }}
                    </span>
                  </button>
                }
              </div>
            </div>
            <!-- end left panel -->

            <!-- ── Right: EPO-green sidebar ──────────────────────────── -->
            <aside
              class="w-[354px] shrink-0 rounded-2xl bg-[#515e4d] p-8 flex flex-col gap-6"
              aria-label="Exam progress"
            >
              <!-- Badge + cert info -->
              <div class="flex items-center gap-4">
                <div class="w-[80px] shrink-0">
                  <ios-certificates-badge
                    svgPath="/assets/badge/endorsed_product_owner_practitioner.svg"
                    code="EPO-P"
                    fullName="Endorsed Product Owner Practitioner"
                  />
                </div>
                <div class="flex flex-col min-w-0">
                  <p class="font-bold text-white text-lg leading-tight whitespace-nowrap">EPO-P</p>
                  <p class="font-medium text-[#dcdcdc] text-sm leading-relaxed">
                    Endorsed Product Owner Practitioner
                  </p>
                </div>
              </div>

              <!-- Question counter + timer -->
              <div class="flex items-center justify-between gap-3">
                <p class="text-[16px] font-semibold text-white leading-[1.4]">
                  Question {{ currentIndex() + 1 }} of {{ questions().length }}
                </p>
                <div
                  class="inline-flex items-center gap-2 rounded-[10px] bg-[#2e362c]
                         px-3 py-1.5 h-8 shrink-0"
                  aria-label="Time remaining"
                >
                  <ios-icon
                    name="clock"
                    class="w-5 h-5 text-[#eeefed] shrink-0"
                    aria-hidden="true"
                  />
                  <span
                    class="text-[14px] font-semibold text-[#eeefed] tabular-nums leading-[1.4]"
                    >{{ formattedTime() }}</span
                  >
                </div>
              </div>

              <!-- Divider -->
              <div class="h-px w-full bg-[#3a4337]" aria-hidden="true"></div>

              <!-- Progress -->
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <span class="text-[14px] font-medium text-[#dcdcdc] leading-[1.4]">
                    Progress
                  </span>
                  <span class="text-[14px] font-medium text-[#dcdcdc] leading-[1.4] tabular-nums">
                    {{ answeredCount() }} / {{ questions().length }}
                  </span>
                </div>

                <!-- Progress bar -->
                <div
                  class="h-2 rounded-full bg-[#3a4337] overflow-hidden"
                  role="progressbar"
                  [attr.aria-valuenow]="answeredCount()"
                  [attr.aria-valuemax]="questions().length"
                  aria-valuemin="0"
                  [attr.aria-label]="'Progress: ' + answeredCount() + ' of ' + questions().length"
                >
                  <div
                    class="h-full rounded-full bg-[#ffde59] transition-all duration-300"
                    [style.width.%]="progressPercent()"
                  ></div>
                </div>
              </div>
            </aside>
            <!-- end sidebar -->
          </div>
          <!-- end 2-col layout -->

          <!-- ── Back / Next action row ─────────────────────────────── -->
          <div class="flex items-center justify-end gap-6">
            <button
              type="button"
              [disabled]="currentIndex() === 0"
              class="flex h-14 w-[190px] items-center justify-center rounded-xl
                     bg-[#f1f1f1] text-[#373837] font-semibold text-lg
                     transition-colors hover:bg-[#e5e5e5]
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                     focus-visible:ring-[#d0d0d0]
                     disabled:opacity-40 disabled:pointer-events-none"
              (click)="onBack()"
            >
              <ios-icon name="arrow-left" class="w-5 h-5 me-2 rtl:rotate-180" aria-hidden="true" />
              Back
            </button>

            @if (isLastQuestion()) {
              <button
                type="button"
                [disabled]="selectedOptionId() === null"
                class="flex h-14 w-[238px] items-center justify-center rounded-xl
                       bg-[#141514] text-white font-semibold text-lg
                       transition-colors hover:bg-[#2a2b2a]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                       focus-visible:ring-[#141514]/50
                       disabled:opacity-40 disabled:pointer-events-none"
                (click)="onSubmit()"
              >
                Submit exam
                <ios-icon
                  name="arrow-right"
                  class="w-5 h-5 ms-2 rtl:rotate-180"
                  aria-hidden="true"
                />
              </button>
            } @else {
              <button
                type="button"
                [disabled]="selectedOptionId() === null"
                class="flex h-14 w-[238px] items-center justify-center rounded-xl
                       bg-[#141514] text-white font-semibold text-lg
                       transition-colors hover:bg-[#2a2b2a]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                       focus-visible:ring-[#141514]/50
                       disabled:opacity-40 disabled:pointer-events-none"
                (click)="onNext()"
              >
                Next
                <ios-icon
                  name="arrow-right"
                  class="w-5 h-5 ms-2 rtl:rotate-180"
                  aria-hidden="true"
                />
              </button>
            }
          </div>
        </main>

        <!-- ── Footer ─────────────────────────────────────────────────── -->
        <footer class="bg-[#272827] w-full py-4">
          <div
            class="max-w-[1400px] mx-auto px-8 flex items-center justify-center gap-2
                   text-[#959695] text-xs"
          >
            <ios-canada-flag aria-hidden="true" />
            <span>© 2026 Institute of Scrum. All rights reserved.</span>
          </div>
        </footer>
      </div>
    </div>
  `,
})
export class ExamRunnerPage {
  private readonly router = inject(Router);

  // ── Question bank ──────────────────────────────────────────────────────
  // Epic-9: replace with a resolved signal from the backend API.
  protected readonly questions = signal<readonly ExamQuestion[]>(DEMO_EXAM_QUESTIONS);

  // ── Navigation state ───────────────────────────────────────────────────
  /** 0-based index of the currently displayed question. */
  protected readonly currentIndex = signal<number>(0);

  protected readonly currentQuestion = computed<ExamQuestion | null>(
    () => this.questions()[this.currentIndex()] ?? null,
  );

  protected readonly isLastQuestion = computed(
    () => this.currentIndex() === this.questions().length - 1,
  );

  // ── Answer state ───────────────────────────────────────────────────────
  /**
   * Map from question index → selected option id.
   * No reveal happens here — answers are shown on the result page only.
   */
  private readonly _answers = signal<Record<number, OptionId | null>>({});

  protected readonly selectedOptionId = computed<OptionId | null>(
    () => this._answers()[this.currentIndex()] ?? null,
  );

  protected readonly answeredCount = computed(
    () => Object.values(this._answers()).filter((v) => v !== null).length,
  );

  protected readonly progressPercent = computed<number>(() => {
    const total = this.questions().length;
    return total === 0 ? 0 : (this.answeredCount() / total) * 100;
  });

  // ── Timer (display-only countdown) ────────────────────────────────────
  // Epic-9: replace with serverTick() from the exam WebSocket (CLAUDE.md §10).
  private readonly EXAM_MINUTES = 90;
  private readonly _tick = toSignal(interval(1000), { initialValue: 0 });

  private readonly _timeRemaining = computed<number>(() => {
    const totalSeconds = this.EXAM_MINUTES * 60;
    return Math.max(0, totalSeconds - this._tick());
  });

  /** Triggers navigation to results when the timer hits zero. */
  private readonly _timerEffect = effect(() => {
    if (this._timeRemaining() === 0) {
      void this.router.navigate(['/assessments/result'], {
        state: {
          questions: this.questions(),
          answers: this._answers(),
          timedOut: true,
        },
      });
    }
  });

  protected readonly formattedTime = computed<string>(() => {
    const secs = this._timeRemaining();
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  });

  // ── Option styling ─────────────────────────────────────────────────────

  /** Full class string for an answer option row button. */
  protected optionClass(optId: OptionId): string {
    const base =
      'flex items-center gap-3 w-full rounded-xl px-[13px] py-4 border-2 border-transparent transition-colors text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 cursor-pointer';

    // Selected state — dark gray, NO correct/wrong colours shown during exam
    if (this.selectedOptionId() === optId) {
      return `${base} bg-[#373837] text-white font-semibold`;
    }
    return `${base} bg-white text-[#272827] hover:bg-[#f8f8f8]`;
  }

  /** Letter badge class inside an option button. */
  protected letterBadgeClass(optId: OptionId): string {
    const base =
      'inline-flex items-center justify-center w-6 h-6 rounded-full text-[14px] font-semibold shrink-0';

    if (this.selectedOptionId() === optId) {
      return `${base} bg-[#f6f6f6] text-[#272827]`;
    }
    return `${base} bg-[#535453] text-[#f1f1f1]`;
  }

  // ── Actions ────────────────────────────────────────────────────────────

  protected onSelectOption(optId: OptionId): void {
    // Allow changing selection before moving to next question
    this._answers.update((prev) => ({ ...prev, [this.currentIndex()]: optId }));
  }

  protected onNext(): void {
    const next = this.currentIndex() + 1;
    if (next < this.questions().length) {
      this.currentIndex.set(next);
    }
  }

  protected onBack(): void {
    const prev = this.currentIndex() - 1;
    if (prev >= 0) {
      this.currentIndex.set(prev);
    }
  }

  protected onSubmit(): void {
    void this.router.navigate(['/assessments/result'], {
      state: {
        questions: this.questions(),
        answers: this._answers(),
        timedOut: false,
      },
    });
  }
}

export default ExamRunnerPage;
