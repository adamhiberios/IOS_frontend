import { ChangeDetectionStrategy, Component, output } from '@angular/core';

/**
 * `ios-confirm-exam-dialog` — modal shown when the learner clicks "Continue"
 * on the exam-verify page. Asks for confirmation before sending the exam link.
 *
 * Accessibility:
 *   - `role="dialog"` + `aria-modal="true"` per APG dialog pattern.
 *   - `aria-labelledby` points to the visible heading.
 *   - Focus management (trap + restore) should be wired by the host page
 *     when this is added to a CDK portal in a future iteration.
 *
 * Outputs:
 *   - `confirmed` — user chose "Send link"
 *   - `cancelled`  — user chose "Go back"
 */
@Component({
  selector: 'ios-confirm-exam-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Fixed backdrop -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-exam-dialog-title"
      (keydown.escape)="cancelled.emit()"
    >
      <div class="w-full max-w-[724px] rounded-2xl bg-white p-8 flex flex-col items-center gap-9">
        <!-- Emergency icon -->
        <div
          class="flex h-28 w-28 items-center justify-center rounded-full bg-ios-surface-soft"
          aria-hidden="true"
        >
          <svg
            width="60"
            height="60"
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <!-- Base stand -->
            <rect x="14" y="53" width="52" height="16" rx="4" fill="#B0BEC5" />
            <!-- Siren dome -->
            <path d="M40 14C27.9 14 18 23.9 18 36v17h44V36C62 23.9 52.1 14 40 14z" fill="#C62828" />
            <!-- Inner glow -->
            <ellipse cx="40" cy="34" rx="11" ry="11" fill="#E53935" opacity="0.8" />
            <ellipse cx="40" cy="34" rx="5" ry="5" fill="#FFCDD2" opacity="0.75" />
            <!-- Light rays -->
            <line
              x1="40"
              y1="4"
              x2="40"
              y2="12"
              stroke="#EF5350"
              stroke-width="3"
              stroke-linecap="round"
            />
            <line
              x1="21"
              y1="10"
              x2="25"
              y2="17"
              stroke="#EF5350"
              stroke-width="3"
              stroke-linecap="round"
            />
            <line
              x1="59"
              y1="10"
              x2="55"
              y2="17"
              stroke="#EF5350"
              stroke-width="3"
              stroke-linecap="round"
            />
            <line
              x1="10"
              y1="30"
              x2="17"
              y2="32"
              stroke="#EF5350"
              stroke-width="3"
              stroke-linecap="round"
            />
            <line
              x1="70"
              y1="30"
              x2="63"
              y2="32"
              stroke="#EF5350"
              stroke-width="3"
              stroke-linecap="round"
            />
          </svg>
        </div>

        <!-- Text content -->
        <div class="w-full flex flex-col items-center gap-1 text-center">
          <h2
            id="confirm-exam-dialog-title"
            class="text-2xl font-semibold text-ios-fg-11 leading-snug"
          >
            Are you sure you will proceed with the exam?
          </h2>
          <p class="text-lg font-medium text-ios-fg-10 leading-relaxed">
            We will send you a link to direct you to your exam, please check your Email:
            <strong class="font-semibold">ad*********am&#64;gmail.com</strong>
          </p>
        </div>

        <!-- Action buttons -->
        <div class="flex flex-col sm:flex-row items-end justify-end gap-3 sm:gap-6 w-full">
          <button
            type="button"
            (click)="cancelled.emit()"
            class="h-14 w-full sm:w-[189px] rounded-xl bg-ios-surface-soft text-ios-fg font-semibold text-lg
                   transition-colors hover:bg-ios-surface-hover
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                   focus-visible:ring-[#d0d0d0]"
          >
            Go back
          </button>
          <button
            type="button"
            (click)="confirmed.emit()"
            class="h-14 w-full sm:w-[254px] rounded-xl bg-ios-fg-13 text-white font-semibold text-lg
                   transition-colors hover:bg-[#2a2b2a]
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                   focus-visible:ring-ios-fg-13/50"
          >
            Send link
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmExamDialog {
  /** Emitted when the user confirms by clicking "Send link". */
  readonly confirmed = output<void>();
  /** Emitted when the user cancels by clicking "Go back" or pressing Escape. */
  readonly cancelled = output<void>();
}
