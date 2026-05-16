import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { LucideX } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, provideIcons } from '@ui';

import type { MockTestSettings } from '../data-access/certificates.model';

/**
 * `ios-cert-mock-settings-dialog` — Pre-exam settings modal.
 *
 * ┌── Layout (572 × auto, white, rounded-2xl) ─────────────────────────────┐
 * │  [X close]                                                              │
 * │  "Choose mock exam settings to start"                                   │
 * │                                                                         │
 * │  Time limit                                                             │
 * │  [No time limit] [15 min] [20 min] [25 min] [30 min]                   │
 * │                                                                         │
 * │  Number of questions                                                    │
 * │  [20] [30] [40] [50] [60] [70] [80] [90] [100]                        │
 * │                                                                         │
 * │                              [    Start    ]                            │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Figma: node 13116-52954 (settings dialog).
 */
@Component({
  selector: 'ios-cert-mock-settings-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IosIcon],
  providers: [provideIcons(LucideX)],
  template: `
    <!-- ── Fixed overlay backdrop ──────────────────────────────────────── -->
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" aria-hidden="true">
      <!-- ── Dialog panel ──────────────────────────────────────────────── -->
      <div
        class="relative bg-white rounded-2xl w-[572px] p-8 flex flex-col gap-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mock-settings-title"
      >
        <!-- Close button -->
        <button
          type="button"
          class="absolute top-4 end-4 inline-flex items-center justify-center w-11 h-11 rounded-xl bg-ios-surface-soft text-ios-fg hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cer-blue-text/50"
          [attr.aria-label]="lang.t('dashboard.certs.closeSettings')"
          (click)="dismissed.emit()"
        >
          <ios-icon name="x" class="w-5 h-5" aria-hidden="true" />
        </button>

        <!-- Title -->
        <h2
          id="mock-settings-title"
          class="text-[20px] font-bold leading-[1.2] text-ios-fg-13 pe-12"
        >
          {{ lang.t('dashboard.certs.mockExamSettingsTitle') }}
        </h2>

        <!-- ── Time limit section ──────────────────────────────────────── -->
        <div class="flex flex-col gap-3">
          <p class="text-[16px] font-semibold leading-[1.4] text-ios-fg">
            {{ lang.t('dashboard.certs.timeLimit') }}
          </p>

          <!-- Pill group container -->
          <div
            class="inline-flex items-center gap-1 bg-ios-surface-soft rounded-[56px] p-1 flex-wrap"
            role="radiogroup"
            [attr.aria-label]="lang.t('dashboard.certs.timeLimit')"
          >
            @for (opt of timeOptions; track opt.value) {
              <button
                type="button"
                role="radio"
                [attr.aria-checked]="selectedTime() === opt.value"
                [class]="pillClass(selectedTime() === opt.value)"
                (click)="selectedTime.set(opt.value)"
              >
                {{ opt.label }}
              </button>
            }
          </div>
        </div>

        <!-- ── Number of questions section ──────────────────────────────── -->
        <div class="flex flex-col gap-3">
          <p class="text-[16px] font-semibold leading-[1.4] text-ios-fg">
            {{ lang.t('dashboard.certs.numberOfQuestions') }}
          </p>

          <!-- Pill group container -->
          <div
            class="inline-flex items-center gap-1 bg-ios-surface-soft rounded-[56px] p-1 flex-wrap"
            role="radiogroup"
            [attr.aria-label]="lang.t('dashboard.certs.numberOfQuestions')"
          >
            @for (count of questionCounts; track count) {
              <button
                type="button"
                role="radio"
                [attr.aria-checked]="selectedCount() === count"
                [class]="pillClass(selectedCount() === count)"
                (click)="selectedCount.set(count)"
              >
                {{ count }}
              </button>
            }
          </div>
        </div>

        <!-- ── Start button ────────────────────────────────────────────── -->
        <div class="flex justify-center pt-2">
          <button
            type="button"
            class="inline-flex items-center justify-center w-[190px] h-14 rounded-xl text-[18px] font-semibold text-white bg-ios-fg-13 hover:bg-ios-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cer-blue-text/50"
            (click)="onStart()"
          >
            {{ lang.t('dashboard.examRunner.startExam') }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class CertMockSettingsDialog {
  protected readonly lang = inject(LanguageService);
  /** Emitted when the user closes the dialog without starting. */
  readonly dismissed = output<void>();

  /** Emitted with chosen settings when the user clicks "Start". */
  readonly startExam = output<MockTestSettings>();

  // ── Time limit options ──────────────────────────────────────────────────
  protected readonly timeOptions: readonly { value: number | null; label: string }[];

  // ── Question count options ───────────────────────────────────────────────
  protected readonly questionCounts: readonly number[] = [20, 30, 40, 50, 60, 70, 80, 90, 100];

  constructor() {
    this.timeOptions = [
      { value: null, label: this.lang.t('dashboard.certs.noTimeLimit') },
      { value: 15, label: this.lang.t('dashboard.certs.minutesShort', { count: '15' }) },
      { value: 20, label: this.lang.t('dashboard.certs.minutesShort', { count: '20' }) },
      { value: 25, label: this.lang.t('dashboard.certs.minutesShort', { count: '25' }) },
      { value: 30, label: this.lang.t('dashboard.certs.minutesShort', { count: '30' }) },
    ];
  }

  // ── Selected state (default: 20 min, 90 questions) ──────────────────────
  protected readonly selectedTime = signal<number | null>(20);
  protected readonly selectedCount = signal<number>(90);

  /** Returns Tailwind classes for a pill button based on its selected state. */
  protected pillClass(selected: boolean): string {
    const base =
      'px-4 py-2 rounded-[56px] text-[14px] font-semibold leading-[1.4] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cer-blue-text/50 whitespace-nowrap';
    return selected
      ? `${base} bg-ios-fg-mid text-white`
      : `${base} bg-transparent text-ios-fg hover:bg-black/5`;
  }

  protected onStart(): void {
    this.startExam.emit({
      timeMinutes: this.selectedTime(),
      questionCount: this.selectedCount(),
    });
  }
}
