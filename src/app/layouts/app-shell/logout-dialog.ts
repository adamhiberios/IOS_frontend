import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

/**
 * `ios-logout-dialog` — Confirmation modal for logging out.
 *
 * Figma: node 13484-28451 (logout dialog).
 *
 * Layout (centered overlay, white 724px card):
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │              [🚪 door icon — soft red circle]                │
 *  │                                                              │
 *  │             Are you sure you want to log out?               │
 *  │      You can sign back in anytime to access your account.   │
 *  │                                                              │
 *  │                     [Cancel]  [Log Out]                     │
 *  └──────────────────────────────────────────────────────────────┘
 *
 * Accessibility:
 *  · The backdrop is a transparent `<button>` (keyboard-reachable, focusable).
 *  · The panel is role="dialog" aria-modal="true" with a labelled heading.
 *  · Escape anywhere in the wrapper emits `cancelled`.
 */

import { LanguageService } from '@core/i18n';

@Component({
  selector: 'ios-logout-dialog',
  imports: [NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ── Full-screen wrapper ─────────────────────────────────────────── -->
    <div class="fixed inset-0 z-50">
      <!-- Backdrop button — closes on click OR keyboard activation -->
      <button
        type="button"
        class="absolute inset-0 bg-black/60 cursor-default w-full h-full"
        [attr.aria-label]="lang.t('logout.closeAriaLabel')"
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
            class="flex items-center justify-center p-4 rounded-[56px] bg-ios-danger-soft"
            aria-hidden="true"
          >
            <!--
              Shipped as a local asset rather than the Figma CDN URL this used to
              point at: that host is outside the CSP allow-list (CLAUDE.md §8) and
              the URL was a short-lived export link. Marked priority because the dialog
              is only ever constructed at the moment it opens, so a lazy icon
              would flash an empty circle at exactly the wrong time.
            -->
            <img
              ngSrc="/assets/icons/logout.svg"
              alt=""
              class="w-20 h-20 object-contain"
              width="80"
              height="80"
              priority
            />
          </div>

          <!-- Body -->
          <div class="flex flex-col gap-[42px] items-center w-full">
            <!-- Heading + subtitle -->
            <div class="flex flex-col gap-1 items-center w-full text-center">
              <h2
                id="logout-dialog-title"
                class="font-semibold leading-[1.2] text-ios-fg-11 text-[24px] w-full"
              >
                {{ lang.t('logout.dialogTitle') }}
              </h2>
              <p class="font-medium leading-[1.4] text-ios-fg-10 text-[18px] w-full">
                {{ lang.t('logout.dialogDescription') }}
              </p>
            </div>

            <!-- Buttons -->
            <div class="flex gap-6 items-center justify-center w-full">
              <!-- Go back -->
              <button
                type="button"
                class="flex items-center justify-center h-14 px-6 rounded-xl bg-ios-surface-soft text-ios-fg text-[18px] font-semibold leading-[1.4] hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-fg/30 w-[139px]"
                (click)="cancelled.emit()"
              >
                {{ lang.t('logout.goBack') }}
              </button>

              <!-- Logout — dark red -->
              <button
                type="button"
                class="flex items-center justify-center h-14 px-6 rounded-xl bg-ios-brand-primary text-white text-[18px] font-semibold leading-[1.4] hover:bg-ios-brand-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 w-[230px]"
                (click)="confirmed.emit()"
              >
                {{ lang.t('logout.confirm') }}
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

  /** Emitted when the user cancels or clicks the backdrop. */
  readonly cancelled = output<void>();
  /** Emitted when the user confirms logout. */
  readonly confirmed = output<void>();
}
