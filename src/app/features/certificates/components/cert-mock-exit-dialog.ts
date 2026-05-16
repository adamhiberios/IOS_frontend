import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';

import { LanguageService } from '@core/i18n';

/**
 * `ios-cert-mock-exit-dialog` — Confirmation dialog when exiting a mock exam.
 *
 * ┌── Layout (724 × auto, white, rounded-16) ───────────────────────────┐
 * │                                                                      │
 * │              ┌───────────────────────────┐                           │
 * │              │       (Door icon)         │                           │
 * │              │        148×148            │                           │
 * │              └───────────────────────────┘                           │
 * │                                                                      │
 * │                        Exit?                                        │
 * │         Are you sure you want to cancel the exam and leave?         │
 * │      This exam will be graded based on the marks you have received  │
 * │                               so far.                               │
 * │                                                                      │
 * │            ┌──────────┐               ┌──────────────┐              │
 * │            │ Go back  │               │    Exit      │              │
 * │            └──────────┘               └──────────────┘              │
 * │                                                                      │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Figma: node 13484-28346 (exit mock exam dialog).
 */
@Component({
  selector: 'ios-cert-mock-exit-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" aria-hidden="true">
      <div
        class="relative bg-white rounded-2xl w-[724px] p-8 flex flex-col gap-9 items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mock-exit-title"
      >
        <!-- Icon circle -->
        <div
          class="bg-ios-surface-soft flex items-center p-4 rounded-full shrink-0"
          aria-hidden="true"
        >
          <div class="size-[148px] shrink-0">
            <svg
              viewBox="0 0 84 128"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              class="size-full"
              preserveAspectRatio="xMidYMid meet"
            >
              <path
                d="M4.4 0H79.2c1.167 0 2.286.464 3.111 1.289C83.136 2.114 83.6 3.233 83.6 4.4V125.4c0 .583-.232 1.143-.644 1.556-.413.412-.973.644-1.556.644H2.2a2.2 2.2 0 0 1-1.556-.644A2.2 2.2 0 0 1 0 125.4V4.4C0 3.233.464 2.114 1.289 1.289A4.4 4.4 0 0 1 4.4 0z"
                fill="#CD885D"
              />
              <path
                d="M8.8 127.601V11.001c0-.584.232-1.143.644-1.556.413-.412.973-.644 1.556-.644h61.6c.584 0 1.143.232 1.556.644.412.413.644.972.644 1.556v116.6H8.8z"
                fill="#E5AD74"
              />
              <path d="M22 68.2a4.4 4.4 0 1 0 0-8.8 4.4 4.4 0 0 0 0 8.8z" fill="#E1EEFF" />
              <path
                d="M35.2 17.6H19.8a2.2 2.2 0 0 0-2.2 2.2v30.8a2.2 2.2 0 0 0 2.2 2.2h15.4a2.2 2.2 0 0 0 2.2-2.2V19.8a2.2 2.2 0 0 0-2.2-2.2zM63.8 17.6H48.4a2.2 2.2 0 0 0-2.2 2.2v30.8a2.2 2.2 0 0 0 2.2 2.2h15.4a2.2 2.2 0 0 0 2.2-2.2V19.8a2.2 2.2 0 0 0-2.2-2.2zM35.2 77H19.8a2.2 2.2 0 0 0-2.2 2.2v37.4a2.2 2.2 0 0 0 2.2 2.2h15.4a2.2 2.2 0 0 0 2.2-2.2V79.2a2.2 2.2 0 0 0-2.2-2.2zM63.8 77H48.4a2.2 2.2 0 0 0-2.2 2.2v37.4a2.2 2.2 0 0 0 2.2 2.2h15.4a2.2 2.2 0 0 0 2.2-2.2V79.2a2.2 2.2 0 0 0-2.2-2.2z"
                fill="#CD885D"
              />
              <path d="M30.8 66H24.2a2.2 2.2 0 0 1 0-4.4h6.6a2.2 2.2 0 0 1 0 4.4z" fill="#C0DAF0" />
            </svg>
          </div>
        </div>

        <!-- Text -->
        <div class="flex flex-col gap-[4px] items-center text-center w-full">
          <h2
            id="mock-exit-title"
            class="text-[24px] font-semibold leading-[1.2] text-ios-fg-11 w-full"
          >
            {{ lang.t('dashboard.examRunner.exitDialogTitle') }}
          </h2>
          <p class="text-[18px] font-medium leading-[1.4] text-ios-fg-10 w-full">
            {{ lang.t('dashboard.examRunner.exitDialogBody') }}
          </p>
        </div>

        <!-- Buttons -->
        <div class="flex gap-6 items-start justify-center w-full">
          <button
            type="button"
            class="inline-flex items-center justify-center h-14 px-6 rounded-xl text-[18px] font-semibold leading-[1.4] text-ios-fg bg-ios-surface-soft hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 w-[165px] whitespace-nowrap"
            (click)="dismissed.emit()"
          >
            {{ lang.t('dashboard.examRunner.goBack') }}
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center h-14 px-6 rounded-xl text-[18px] font-semibold leading-[1.4] text-white bg-ios-brand-primary hover:bg-ios-brand-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 w-[203px] whitespace-nowrap"
            (click)="confirmed.emit()"
          >
            {{ lang.t('dashboard.examRunner.exit') }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class CertMockExitDialog {
  protected readonly lang = inject(LanguageService);
  readonly dismissed = output<void>();
  readonly confirmed = output<void>();
}
