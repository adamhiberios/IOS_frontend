import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { LanguageService } from '@core/i18n';

/**
 * `ios-profile-password-updated-dialog` — success dialog shown after a
 * successful password change.
 *
 * Figma: node 13477-27384 (password update successfully).
 *
 * ┌── 724 px white card ───────────────────────────────────────────────────┐
 * │              ┌───────────────┐                                          │
 * │              │  padlock icon │  (80 × 80, inside #F1F1F1 circle)       │
 * │              └───────────────┘                                          │
 * │         Password update successfully                                    │
 * │   The password you just changed is your new password.                  │
 * │                    ┌──────┐                                             │
 * │                    │  Ok  │                                             │
 * │                    └──────┘                                             │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
@Component({
  selector: 'ios-profile-password-updated-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwd-updated-title"
    >
      <div
        class="bg-white rounded-2xl w-full max-w-[724px] mx-4 p-8 flex flex-col gap-9 items-center shadow-2xl"
      >
        <!-- Icon -->
        <div class="bg-ios-surface-soft flex items-center p-4 rounded-full shrink-0" aria-hidden="true">
          <!-- Padlock + checkmark illustration from Figma -->
          <div class="size-20 shrink-0 flex items-center justify-center">
            <svg
              viewBox="0 0 80 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              class="size-full"
            >
              <!-- Padlock body -->
              <rect x="12" y="34" width="44" height="32" rx="4" fill="#2178BC" />
              <!-- Padlock shackle -->
              <path
                d="M20 34v-10a14 14 0 0 1 28 0v10"
                stroke="#2178BC"
                stroke-width="5"
                stroke-linecap="round"
                fill="none"
              />
              <!-- Keyhole -->
              <circle cx="34" cy="50" r="5" fill="white" />
              <rect x="31" y="52" width="6" height="8" rx="2" fill="white" />
              <!-- Dots row -->
              <circle cx="10" cy="66" r="3" fill="#2178BC" />
              <circle cx="20" cy="66" r="3" fill="#2178BC" />
              <circle cx="30" cy="66" r="3" fill="#2178BC" />
              <circle cx="40" cy="66" r="3" fill="#2178BC" />
              <circle cx="50" cy="66" r="3" fill="#2178BC" />
              <!-- Red checkmark badge -->
              <circle cx="58" cy="28" r="14" fill="#C0392B" />
              <path
                d="M51 28l5 5 10-10"
                stroke="white"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
              />
            </svg>
          </div>
        </div>

        <!-- Text -->
        <div class="flex flex-col gap-1 items-center text-center w-full">
          <h2
            id="pwd-updated-title"
            class="text-[24px] font-semibold leading-[1.2] text-ios-fg-11 w-full"
          >
            {{ lang.t('profile.passwordUpdatedDialog.title') }}
          </h2>
          <p class="text-[18px] font-medium leading-[1.4] text-ios-fg-10 w-full">
            {{ lang.t('profile.passwordUpdatedDialog.description') }}
          </p>
        </div>

        <!-- OK button -->
        <div class="flex items-center justify-center w-full">
          <button
            type="button"
            class="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-ios-fg-13 text-white text-[16px] font-semibold leading-[1.4] w-[184px] hover:bg-ios-fg transition-colors focus-visible:outline-none"
            (click)="confirmed.emit()"
          >
            {{ lang.t('profile.passwordUpdatedDialog.ok') }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ProfilePasswordUpdatedDialog {
  protected readonly lang = inject(LanguageService);
  /** Emitted when the user clicks "Ok". */
  readonly confirmed = output<void>();
}
