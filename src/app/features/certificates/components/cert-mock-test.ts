import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';

import { LanguageService } from '@core/i18n';
import {
  LucideCheck,
  LucideClock,
  LucideMedal,
  LucideNewspaper,
  LucideStar,
  LucideX,
  LucideArrowRight,
} from '@lucide/angular';

import { CertificatesBadge, IosIcon, provideIcons } from '@ui';

import type {
  CertificationCard,
  MockTestAttempt,
  MockTestSettings,
  MockTestStats,
} from '../data-access/certificates.model';
import { CertMockSettingsDialog } from './cert-mock-settings-dialog';

/**
 * `ios-cert-mock-test` — Mock test section content for the certificate detail page.
 *
 * ┌── Layout ──────────────────────────────────────────────────────────┐
 * │  ┌─ Cert card ──────────────────────────────────────────────────┐  │
 * │  │  [badge] 53% Completed  ESM-P  Full name    [Show details→]  │  │
 * │  └──────────────────────────────────────────────────────────────┘  │
 * │  ┌─ 4 KPI cards ──────────────────────────────────────────────┐    │
 * │  │  [exam icon] 5          [star] 95%    [medal] 46%  [clock]  │    │
 * │  │  Exam attempts          Best Score    Avg Score   10h 40m   │    │
 * │  └────────────────────────────────────────────────────────────┘    │
 * │  ┌─ History ────────────────────────────────────────────────────┐  │
 * │  │  "History of mock test  (7 tests)"                           │  │
 * │  │  ┌─ row ──────────────────────────────────────────────────┐  │  │
 * │  │  │  [icon] mock test 1  70 Questions  date • ✓31 • ✗43    │  │  │
 * │  │  │  • Passed: 64%                      [Show details →]   │  │  │
 * │  │  └────────────────────────────────────────────────────────┘  │  │
 * │  └──────────────────────────────────────────────────────────────┘  │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * Figma: node 13567-16238 (Mock test section).
 */
@Component({
  selector: 'ios-cert-mock-test',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CertificatesBadge, IosIcon, CertMockSettingsDialog],
  providers: [
    provideIcons(
      LucideNewspaper,
      LucideStar,
      LucideMedal,
      LucideClock,
      LucideCheck,
      LucideX,
      LucideArrowRight,
    ),
  ],
  template: `
    <!-- ── Settings dialog (shown when dialogOpen()) ────────────────── -->
    @if (dialogOpen()) {
      <ios-cert-mock-settings-dialog
        (dismissed)="dialogOpen.set(false)"
        (startExam)="onDialogStart($event)"
      />
    }

    <!-- ── Cert card (ESM/esm-1 bg) ─────────────────────────────────── -->
    <div class="flex items-center gap-3 bg-cer-blue-soft rounded-2xl px-6 py-4">
      <!-- Badge + active dot -->
      <div class="relative shrink-0">
        <ios-certificates-badge
          [svgPath]="cert().imageAsset"
          [code]="cert().code"
          [fullName]="cert().title"
          class="block w-[98px]"
        />
        <span
          class="absolute top-2 -end-1.5 w-3 h-3 rounded-full bg-ios-success-mid border-2 border-white"
          [attr.aria-label]="lang.t('dashboard.certs.active')"
        ></span>
      </div>

      <!-- Info -->
      <div class="flex flex-col gap-1 flex-1 min-w-0">
        <p class="text-[14px] font-semibold leading-[1.4] text-ios-fg-10">
          {{ cert().progressPercent }}{{ lang.t('dashboard.certs.percentCompleted') }}
        </p>
        <p class="text-[18px] font-bold leading-[1.2] text-ios-fg">
          {{ cert().code }}
        </p>
        <p class="text-[16px] font-medium leading-[1.4] text-ios-fg-10">
          {{ cert().title }}
        </p>
      </div>

      <!-- Start Mock Test CTA (opens settings dialog) -->
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1 h-9 px-6 rounded-xl text-[14px] font-semibold leading-[1.4] text-ios-fg-8 hover:bg-black/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cer-blue-text/50 whitespace-nowrap shrink-0"
        (click)="dialogOpen.set(true)"
      >
        {{ lang.t('dashboard.certs.startMockTest') }}
        <ios-icon
          name="arrow-right"
          class="w-[18px] h-[18px] shrink-0 rtl:rotate-180"
          aria-hidden="true"
        />
      </button>
    </div>

    <!-- ── 4 KPI stat cards ───────────────────────────────────────────── -->
    <section
      [attr.aria-label]="lang.t('dashboard.examRunner.examAttempts')"
      class="grid grid-cols-4 gap-4"
    >
      <!-- Exam attempts -->
      <div class="flex flex-col gap-3 bg-ios-surface-muted rounded-2xl px-6 py-3">
        <ios-icon name="newspaper" class="w-8 h-8 text-ios-fg shrink-0" aria-hidden="true" />
        <div class="flex flex-col">
          <span class="text-[18px] font-bold leading-[1.2] text-ios-fg tabular-nums">
            {{ stats().totalAttempts }}
          </span>
          <span class="text-[16px] font-medium leading-[1.4] text-ios-fg">
            {{ lang.t('dashboard.examRunner.examAttempts') }}
          </span>
        </div>
      </div>

      <!-- Best Score -->
      <div class="flex flex-col gap-3 bg-ios-surface-muted rounded-2xl px-6 py-3">
        <ios-icon name="star" class="w-8 h-8 text-ios-fg shrink-0" aria-hidden="true" />
        <div class="flex flex-col">
          <span class="text-[18px] font-bold leading-[1.2] text-ios-fg tabular-nums">
            {{ stats().bestScorePercent }}%
          </span>
          <span class="text-[16px] font-medium leading-[1.4] text-ios-fg">
            {{ lang.t('dashboard.examRunner.bestScore') }}
          </span>
        </div>
      </div>

      <!-- Avg Score -->
      <div class="flex flex-col gap-3 bg-ios-surface-muted rounded-2xl px-6 py-3">
        <ios-icon name="medal" class="w-8 h-8 text-ios-fg shrink-0" aria-hidden="true" />
        <div class="flex flex-col">
          <span class="text-[18px] font-bold leading-[1.2] text-ios-fg tabular-nums">
            {{ stats().avgScorePercent }}%
          </span>
          <span class="text-[16px] font-medium leading-[1.4] text-ios-fg">
            {{ lang.t('dashboard.examRunner.avgScore') }}
          </span>
        </div>
      </div>

      <!-- Time Spent -->
      <div class="flex flex-col gap-3 bg-ios-surface-muted rounded-2xl px-6 py-3">
        <ios-icon name="clock" class="w-8 h-8 text-ios-fg shrink-0" aria-hidden="true" />
        <div class="flex flex-col">
          <span class="text-[18px] font-bold leading-[1.2] text-ios-fg tabular-nums">
            {{ totalTimeFormatted }}
          </span>
          <span class="text-[16px] font-medium leading-[1.4] text-ios-fg">
            {{ lang.t('dashboard.examRunner.timeSpent') }}
          </span>
        </div>
      </div>
    </section>

    <!-- ── History of mock test ───────────────────────────────────────── -->
    <section [attr.aria-label]="lang.t('dashboard.examRunner.historyOfMockTest')">
      <!-- Section heading -->
      <div class="flex items-center gap-3 mb-3">
        <h2 class="text-[18px] font-semibold leading-[1.4] text-ios-fg-13">
          {{ lang.t('dashboard.examRunner.historyOfMockTest') }}
        </h2>
        <span class="text-[16px] font-medium leading-[1.4] text-ios-fg-8">
          {{ lang.t('dashboard.certs.tests', { count: history().length.toString() }) }}
        </span>
      </div>

      <!-- List container -->
      <div class="bg-ios-surface-muted rounded-2xl px-6 py-4 flex flex-col">
        @for (attempt of history(); track attempt.title; let last = $last) {
          <!-- Row -->
          <div class="flex items-center gap-9 py-4">
            <!-- Left: icon + name + questions -->
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <ios-icon
                name="newspaper"
                class="w-8 h-8 shrink-0 text-ios-fg-10"
                aria-hidden="true"
              />
              <div class="flex items-center gap-4">
                <span
                  class="text-[18px] font-semibold leading-[1.4] text-ios-fg-10 whitespace-nowrap"
                >
                  {{ attempt.title }}
                </span>
                <span class="text-[14px] font-medium leading-[1.4] text-ios-fg-7 whitespace-nowrap">
                  {{ attempt.totalQuestions }} {{ lang.t('dashboard.certs.questions') }}
                </span>
              </div>
            </div>

            <!-- Right: date • correct • incorrect • result -->
            <div class="flex items-center gap-3 shrink-0">
              <!-- Date -->
              <span class="text-[16px] font-medium leading-[1.4] text-ios-fg-8 whitespace-nowrap">
                {{ attempt.date }}
              </span>

              <!-- Bullet -->
              <span
                class="w-[7px] h-[7px] rounded-full bg-ios-fg-7 shrink-0"
                aria-hidden="true"
              ></span>

              <!-- Correct -->
              <div class="flex items-center gap-2">
                <ios-icon
                  name="check"
                  class="w-5 h-5 text-[#84b70d]"
                  [attr.aria-label]="lang.t('dashboard.examRunner.correct')"
                />
                <span class="text-[16px] font-medium leading-[1.4] text-ios-fg-8">{{
                  attempt.correct
                }}</span>
              </div>

              <!-- Bullet -->
              <span
                class="w-[7px] h-[7px] rounded-full bg-ios-fg-7 shrink-0"
                aria-hidden="true"
              ></span>

              <!-- Incorrect -->
              <div class="flex items-center gap-2">
                <ios-icon
                  name="x"
                  class="w-5 h-5 text-ios-danger-strong"
                  [attr.aria-label]="lang.t('dashboard.examRunner.incorrect')"
                />
                <span class="text-[16px] font-medium leading-[1.4] text-ios-fg-8">{{
                  attempt.incorrect
                }}</span>
              </div>

              <!-- Bullet -->
              <span
                class="w-[7px] h-[7px] rounded-full bg-ios-fg-7 shrink-0"
                aria-hidden="true"
              ></span>

              <!-- Pass/Fail status -->
              @if (attempt.status === 'passed') {
                <div class="flex items-center gap-1 min-w-[89px]">
                  <span class="text-[14px] font-semibold leading-[1.4] text-[#84b70d]"
                    >{{ lang.t('dashboard.certs.passed') }}:</span
                  >
                  <span class="text-[14px] font-bold leading-[1.3] text-[#84b70d]"
                    >{{ attempt.scorePercent }}%</span
                  >
                </div>
              } @else {
                <div class="flex items-center gap-1 min-w-[89px]">
                  <span class="text-[14px] font-semibold leading-[1.4] text-ios-danger-strong">{{
                    lang.t('dashboard.examRunner.failed')
                  }}</span>
                  <span class="text-[14px] font-bold leading-[1.3] text-ios-danger-strong"
                    >{{ attempt.scorePercent }}%</span
                  >
                </div>
              }
            </div>

            <!-- Show details CTA — opens settings dialog -->
            <button
              type="button"
              class="inline-flex items-center justify-center gap-1 h-9 px-6 rounded-xl text-[14px] font-semibold leading-[1.4] text-ios-fg-8 hover:bg-black/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cer-blue-text/50 whitespace-nowrap shrink-0"
              [attr.aria-label]="lang.t('dashboard.certs.showDetails')"
              (click)="dialogOpen.set(true)"
            >
              {{ lang.t('dashboard.certs.showDetails') }}
              <ios-icon
                name="arrow-right"
                class="w-[18px] h-[18px] shrink-0 rtl:rotate-180"
                aria-hidden="true"
              />
            </button>
          </div>

          <!-- Divider (omit after last row) -->
          @if (!last) {
            <hr class="border-t border-ios-border-light mx-0" />
          }
        }
      </div>
    </section>
  `,
})
export class CertMockTest {
  protected readonly lang = inject(LanguageService);
  /** The certification card data used to render the top cert banner. */
  readonly cert = input.required<CertificationCard>();

  /** Aggregate KPI stats. */
  readonly stats = input.required<MockTestStats>();

  /** Ordered list of mock test attempts. */
  readonly history = input.required<readonly MockTestAttempt[]>();

  /**
   * Emitted when the user chooses settings and clicks "Start" in the dialog.
   * The parent page navigates to the exam runner.
   */
  readonly startTest = output<MockTestSettings>();

  /** Controls dialog visibility. */
  protected readonly dialogOpen = signal<boolean>(false);

  /** Formatted time string derived from `stats().totalTimeMinutes`. */
  get totalTimeFormatted(): string {
    const mins = this.stats().totalTimeMinutes;
    if (mins === 0) return this.lang.t('dashboard.certs.hoursAbbr', { count: '00' });
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const hStr = h.toString();
    if (m > 0) {
      return `${this.lang.t('dashboard.certs.hoursAbbr', { count: hStr })} ${this.lang.t('dashboard.certs.minutesAbbr', { count: m.toString() })}`;
    }
    return this.lang.t('dashboard.certs.hoursAbbr', { count: hStr });
  }

  protected onDialogStart(settings: MockTestSettings): void {
    this.dialogOpen.set(false);
    this.startTest.emit(settings);
  }
}
