import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { LanguageService } from '@core/i18n';

/**
 * `ios-profile-info-updated-dialog` — success dialog shown after profile
 * information is saved successfully.
 *
 * Figma: node 13477-27496 (information update successfully).
 *
 * ┌── 724 px white card ───────────────────────────────────────────────────┐
 * │              ┌───────────────┐                                          │
 * │              │  info icon    │  (80 × 80, inside #F1F1F1 circle)       │
 * │              └───────────────┘                                          │
 * │         Information update successfully                                 │
 * │         Your Information is set successfully.                           │
 * │                    ┌──────┐                                             │
 * │                    │  Ok  │                                             │
 * │                    └──────┘                                             │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
@Component({
  selector: 'ios-profile-info-updated-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-updated-title"
    >
      <div
        class="bg-white rounded-2xl w-full max-w-[724px] mx-4 p-8 flex flex-col gap-9 items-center shadow-2xl"
      >
        <!-- Icon -->
        <div class="bg-ios-surface-soft flex items-center p-4 rounded-full shrink-0" aria-hidden="true">
          <!-- Info bubble + green checkmark illustration from Figma -->
          <div class="size-20 shrink-0 flex items-center justify-center">
            <svg
              viewBox="0 0 80 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              class="size-full"
            >
              <!-- Info speech bubble -->
              <path
                d="M14 12h52a6 6 0 0 1 6 6v30a6 6 0 0 1-6 6H42l-10 10v-10H14a6 6 0 0 1-6-6V18a6 6 0 0 1 6-6z"
                fill="#2178BC"
              />
              <!-- "i" letter -->
              <text
                x="34"
                y="43"
                font-family="Arial"
                font-size="22"
                font-weight="bold"
                fill="white"
              >
                i
              </text>
              <!-- Green checkmark badge -->
              <circle cx="60" cy="56" r="14" fill="#27AE60" />
              <path
                d="M53 56l5 5 10-10"
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
        <div class="flex flex-col gap-1 items-start text-center w-full">
          <h2
            id="info-updated-title"
            class="text-[24px] font-semibold leading-[1.2] text-ios-fg-11 w-full"
          >
            {{ lang.t('profile.infoUpdatedDialog.title') }}
          </h2>
          <p class="text-[18px] font-medium leading-[1.4] text-ios-fg-10 w-full">
            {{ lang.t('profile.infoUpdatedDialog.description') }}
          </p>
        </div>

        <!-- OK button -->
        <div class="flex items-center justify-center w-full">
          <button
            type="button"
            class="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-ios-fg-13 text-white text-[16px] font-semibold leading-[1.4] w-[206px] hover:bg-ios-fg transition-colors focus-visible:outline-none"
            (click)="confirmed.emit()"
          >
            {{ lang.t('profile.infoUpdatedDialog.ok') }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ProfileInfoUpdatedDialog {
  protected readonly lang = inject(LanguageService);
  /** Emitted when the user clicks "Ok". */
  readonly confirmed = output<void>();
}
