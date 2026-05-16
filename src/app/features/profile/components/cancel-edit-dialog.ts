import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { LanguageService } from '@core/i18n';

/**
 * `ios-profile-cancel-edit-dialog` — confirmation dialog when the user
 * attempts to leave the edit form without saving.
 *
 * Figma: node 13477-27641 (cancel edit).
 *
 * ┌── 724 px white card ───────────────────────────────────────────────────┐
 * │              ┌───────────────┐                                          │
 * │              │  alarm icon   │  (80 × 80, inside #FBECE7 circle)       │
 * │              └───────────────┘                                          │
 * │        Are you sure to cancel edit and exit?                            │
 * │   You will lose the information you entered on the screen.             │
 * │         ┌────────┐        ┌───────────────────┐                        │
 * │         │  Back  │        │  Cancel and exit   │                       │
 * │         └────────┘        └───────────────────┘                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
@Component({
  selector: 'ios-profile-cancel-edit-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="cancel-edit-title"
      aria-describedby="cancel-edit-desc"
    >
      <div
        class="bg-white rounded-2xl w-full max-w-[724px] mx-4 p-8 flex flex-col gap-9 items-center shadow-2xl"
      >
        <!-- Icon (danger/warning palette from Figma: #FBECE7) -->
        <div class="bg-[#fbece7] flex items-center p-4 rounded-full shrink-0" aria-hidden="true">
          <!-- Emergency / alarm siren illustration -->
          <div class="size-20 shrink-0 flex items-center justify-center">
            <svg
              viewBox="0 0 80 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              class="size-full"
            >
              <!-- Siren base -->
              <rect x="22" y="48" width="36" height="14" rx="3" fill="#C0392B" />
              <!-- Siren dome -->
              <path d="M28 48 C28 30 52 30 52 48Z" fill="#C0392B" />
              <!-- Light flashes -->
              <line
                x1="40"
                y1="18"
                x2="40"
                y2="10"
                stroke="#E74C3C"
                stroke-width="3"
                stroke-linecap="round"
              />
              <line
                x1="56"
                y1="24"
                x2="62"
                y2="18"
                stroke="#E74C3C"
                stroke-width="3"
                stroke-linecap="round"
              />
              <line
                x1="24"
                y1="24"
                x2="18"
                y2="18"
                stroke="#E74C3C"
                stroke-width="3"
                stroke-linecap="round"
              />
              <!-- Light window on dome -->
              <rect x="33" y="36" width="14" height="10" rx="2" fill="#E8CBCB" />
              <!-- Base stripe -->
              <rect x="22" y="56" width="36" height="3" rx="1" fill="#A93226" />
            </svg>
          </div>
        </div>

        <!-- Text -->
        <div class="flex flex-col gap-1 items-start text-center w-full">
          <h2
            id="cancel-edit-title"
            class="text-[24px] font-semibold leading-[1.2] text-[#303130] w-full"
          >
            {{ lang.t('profile.cancelDialog.title') }}
          </h2>
          <p
            id="cancel-edit-desc"
            class="text-[18px] font-medium leading-[1.4] text-[#373837] w-full"
          >
            {{ lang.t('profile.cancelDialog.description') }}
          </p>
        </div>

        <!-- Buttons -->
        <div class="flex gap-6 items-center justify-center w-full">
          <!-- Back -->
          <button
            type="button"
            class="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-[#f1f1f1] text-[#272827] text-[16px] font-semibold leading-[1.4] w-[126px] hover:bg-[#e5e5e5] transition-colors focus-visible:outline-none"
            (click)="dismissed.emit()"
          >
            {{ lang.t('profile.cancelDialog.back') }}
          </button>
          <!-- Cancel and exit (danger) -->
          <button
            type="button"
            class="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-[#d63d13] text-white text-[16px] font-semibold leading-[1.4] w-[230px] hover:bg-[#b8340f] transition-colors focus-visible:outline-none whitespace-nowrap"
            (click)="confirmed.emit()"
          >
            {{ lang.t('profile.cancelDialog.confirm') }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ProfileCancelEditDialog {
  protected readonly lang = inject(LanguageService);
  /** Emitted when the user clicks "Back" — close the dialog and stay on the form. */
  readonly dismissed = output<void>();
  /** Emitted when the user clicks "Cancel and exit" — discard changes and navigate. */
  readonly confirmed = output<void>();
}
