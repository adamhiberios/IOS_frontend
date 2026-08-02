import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { LanguageService } from '@core/i18n';
import { Button } from '@ui';

/**
 * `ios-profile-password-updated-dialog` — success dialog shown after a
 * successful password change on `/dashboard/profile/change-password`.
 *
 * Same green-checkmark success-popup design as
 * `auth/pages/new-password.page.ts`'s post-reset popup, reused here for
 * visual consistency across both password-success moments in the app.
 *
 * ┌── centered white card ───────────────────────────────────────────────┐
 * │              ┌───────────────┐                                        │
 * │              │  check icon   │  (green, inside a green-50 circle)     │
 * │              └───────────────┘                                        │
 * │           Password update successfully                                │
 * │                    ┌──────┐                                           │
 * │                    │  Ok  │                                           │
 * │                    └──────┘                                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
@Component({
  selector: 'ios-profile-password-updated-dialog',
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwd-updated-title"
    >
      <div class="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-xl">
        <div class="flex flex-col items-center gap-6">
          <!-- Success Icon -->
          <div class="w-32 h-32 bg-green-50 rounded-full flex items-center justify-center">
            <svg
              class="w-20 h-20 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <!-- Title -->
          <h2 id="pwd-updated-title" class="text-2xl font-semibold text-center text-gray-800">
            {{ lang.t('profile.passwordUpdatedDialog.title') }}
          </h2>

          <!-- Button -->
          <ios-button variant="primary" [fullWidth]="true" (clicked)="confirmed.emit()">
            {{ lang.t('profile.passwordUpdatedDialog.ok') }}
          </ios-button>
        </div>
      </div>
    </div>
  `,
})
export class ProfilePasswordUpdatedDialog {
  protected readonly lang = inject(LanguageService);
  /** Emitted when the user clicks "Ok" — page owns the post-success navigation. */
  readonly confirmed = output<void>();
}
