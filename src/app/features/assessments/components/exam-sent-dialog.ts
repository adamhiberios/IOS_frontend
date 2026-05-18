import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';

/**
 * `ios-exam-sent-dialog` — success modal shown after the exam link has been
 * sent to the learner's email.
 *
 * Accessibility:
 *   - `role="dialog"` + `aria-modal="true"` per APG dialog pattern.
 *   - `aria-labelledby` points to the visible heading.
 *
 * Outputs:
 *   - `dismissed` — user clicked "Go back"
 */

import { LanguageService } from '@core/i18n';

@Component({
  selector: 'ios-exam-sent-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Fixed backdrop -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exam-sent-dialog-title"
      (keydown.escape)="dismissed.emit()"
    >
      <div class="w-full max-w-[724px] rounded-2xl bg-white p-8 flex flex-col items-center gap-9">
        <!-- Success icon badge -->
        <div
          class="rounded-[56px] bg-[#f4fae7] p-4 flex items-center justify-center"
          aria-hidden="true"
        >
          <div
            class="flex h-20 w-20 items-center justify-center rounded-full"
            style="background-color: #4ade80;"
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        <!-- Text content -->
        <div class="w-full flex flex-col items-center justify-center gap-1 text-center">
          <h2
            id="exam-sent-dialog-title"
            class="text-2xl font-semibold text-ios-fg-11 leading-snug"
          >
            {{ lang.t('assessments.sentDialog.title') }}
          </h2>
          <p class="text-lg font-medium text-ios-fg-10 leading-relaxed">
            {{ lang.t('assessments.sentDialog.body', { email: 'ad*********am&#64;gmail.com' }) }}
          </p>
        </div>

        <!-- Action buttons -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 w-full">
          <button
            type="button"
            (click)="dismissed.emit()"
            class="h-14 w-full sm:w-[176px] rounded-xl bg-ios-surface-soft text-ios-fg font-semibold text-lg
                   transition-colors hover:bg-ios-surface-hover
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                   focus-visible:ring-[#d0d0d0]"
          >
            {{ lang.t('assessments.sentDialog.goBack') }}
          </button>
          <a
            href="mailto:"
            class="flex h-14 w-full sm:w-[261px] items-center justify-center rounded-xl
                   bg-ios-fg-13 text-white font-semibold text-lg
                   transition-colors hover:bg-[#2a2b2a]
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                   focus-visible:ring-ios-fg-13/50"
          >
            {{ lang.t('assessments.sentDialog.openEmail') }}
          </a>
        </div>
      </div>
    </div>
  `,
})
export class ExamSentDialog {
  protected readonly lang = inject(LanguageService);

  /** Emitted when the user dismisses the dialog by clicking "Go back". */
  readonly dismissed = output<void>();
}
