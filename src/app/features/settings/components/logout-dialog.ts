import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { LanguageService } from '@core/i18n';

/**
 * `ios-logout-dialog` — Confirmation modal for logging out.
 *
 * Figma: node 13484-28451 (logout dialog).
 *
 * Layout (centered overlay, white 724px card):
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │              [🚪 door icon — soft red circle]                │
 *  │                                                              │
 *  │                  Are you sure to logout?                    │
 *  │   You will be logged out of this browser, and you can log   │
 *  │   back in later to get your information.                    │
 *  │                                                              │
 *  │                     [Go back]  [Logout]                     │
 *  └──────────────────────────────────────────────────────────────┘
 */
@Component({
  selector: 'ios-logout-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ── Full-screen wrapper ─────────────────────────────────────────── -->
    <div class="fixed inset-0 z-50">
      <!-- Backdrop button — keyboard-accessible close -->
      <button
        type="button"
        class="absolute inset-0 bg-black/60 cursor-default w-full h-full"
        [attr.aria-label]="lang.t('settings.logoutDialog.closeAriaLabel')"
        tabindex="-1"
        (click)="cancelled.emit()"
      ></button>

      <!-- ── Centered dialog panel ────────────────────────────────────── -->
      <div class="relative flex items-center justify-center min-h-full px-4">
        <div
          class="relative bg-white rounded-2xl w-full max-w-[724px] p-8 flex flex-col gap-9 items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-dialog-title"
          tabindex="-1"
          (keydown.escape)="cancelled.emit()"
        >
          <!-- Icon — door in soft danger background circle -->
          <div
            class="flex items-center justify-center p-4 rounded-[56px] bg-[#fbece7]"
            aria-hidden="true"
          >
            <!-- Door icon — external Figma asset -->
            <img
              src="https://www.figma.com/api/mcp/asset/3c28513b-802d-4320-925b-3eef0758c943"
              alt=""
              class="w-20 h-20 object-contain"
              loading="lazy"
              decoding="async"
              width="80"
              height="80"
            />
          </div>

          <!-- Body -->
          <div class="flex flex-col gap-[42px] items-center w-full">
            <!-- Heading + subtitle -->
            <div class="flex flex-col gap-1 items-center w-full text-center">
              <h2
                id="logout-dialog-title"
                class="font-semibold leading-[1.2] text-[#303130] text-[24px] w-full"
              >
                {{ lang.t('settings.logoutDialog.heading') }}
              </h2>
              <p class="font-medium leading-[1.4] text-[#373837] text-[18px] w-full">
                {{ lang.t('settings.logoutDialog.description') }}
              </p>
            </div>

            <!-- Buttons -->
            <div class="flex gap-6 items-center justify-center w-full">
              <button
                type="button"
                class="flex items-center justify-center h-14 px-6 rounded-xl bg-[#f1f1f1] text-[#272827] text-[18px] font-semibold leading-[1.4] hover:bg-[#e5e5e5] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#272827]/30 w-[139px]"
                (click)="cancelled.emit()"
              >
                {{ lang.t('settings.logoutDialog.goBack') }}
              </button>
              <button
                type="button"
                class="flex items-center justify-center h-14 px-6 rounded-xl bg-[#8b0000] text-white text-[18px] font-semibold leading-[1.4] hover:bg-[#6f0000] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b0000]/50 w-[230px]"
                (click)="confirmed.emit()"
              >
                {{ lang.t('settings.logoutDialog.confirm') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LogoutDialog {
  protected readonly lang = inject(LanguageService);
  readonly cancelled = output<void>();
  readonly confirmed = output<void>();
}
