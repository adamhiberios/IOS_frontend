import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { LanguageService } from '@core/i18n';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';

/**
 * `ios-delete-account-dialog` — Confirmation modal for deleting an account.
 *
 * Figma: node 13479-27740 (delete account dialog).
 *
 * Layout (centered overlay, white 624px card):
 *  ┌──────────────────────────────────────────────────────────┐
 *  │              [🗑️ trash icon — gray circle]               │
 *  │                                                          │
 *  │          Are you sure to delete your account?           │
 *  │    You will lose all information especially your         │
 *  │    certificates                                          │
 *  │                                                          │
 *  │    Enter your password to confirm                        │
 *  │    ┌─────────────────────────────────────────────┐       │
 *  │    │  ••••••••••                                 │       │
 *  │    └─────────────────────────────────────────────┘       │
 *  │                                [Go back]  [Delete acc]  │
 *  └──────────────────────────────────────────────────────────┘
 *
 * Account deletion requires step-up re-auth (`POST /me/delete { password }`), so
 * the confirm field is the caller's password. The "Delete account" button is
 * disabled (40% opacity) until a password is entered, and shows a spinner while
 * the delete request is in flight (`pending`). A wrong password (401) surfaces
 * as `errorMessage` under the field.
 *
 * Accessibility:
 *  · The backdrop is a transparent `<button>` so it is keyboard-reachable and
 *    screen-reader-announced as "Close" — satisfies click-events-have-key-events
 *    and interactive-supports-focus rules.
 *  · The dialog panel is `role="dialog" aria-modal="true"` with a labelled heading.
 *  · Escape on any focusable element inside the panel emits `cancelled`.
 */
@Component({
  selector: 'ios-delete-account-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgOptimizedImage],
  template: `
    <!-- ── Full-screen wrapper ─────────────────────────────────────────── -->
    <div class="fixed inset-0 z-50">
      <!-- Backdrop button — closes on click OR keyboard activation -->
      <button
        type="button"
        class="absolute inset-0 bg-black/60 cursor-default w-full h-full"
        [attr.aria-label]="lang.t('settings.deleteDialog.closeAriaLabel')"
        tabindex="-1"
        (click)="cancelled.emit()"
      ></button>

      <!-- ── Centered dialog panel ────────────────────────────────────── -->
      <div class="relative flex items-center justify-center min-h-full px-4">
        <div
          class="relative bg-white rounded-2xl w-full max-w-[624px] p-8 flex flex-col gap-9 items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          tabindex="-1"
          (keydown.escape)="cancelled.emit()"
        >
          <!-- Icon -->
          <div
            class="flex items-center justify-center p-4 rounded-[56px] bg-ios-surface-soft"
            aria-hidden="true"
          >
            <!--
              Shipped as a local asset rather than the Figma CDN URL this used to
              point at: that host is outside the CSP allow-list (CLAUDE.md §8) and
              the URL was a short-lived export link. Marked priority because the
              dialog is only ever constructed at the moment it opens, so a lazy
              icon would flash an empty circle at exactly the wrong time.
            -->
            <img
              ngSrc="/assets/icons/delete-account.svg"
              alt=""
              class="w-20 h-20 object-contain"
              width="80"
              height="80"
              priority
            />
          </div>

          <!-- Body -->
          <div class="flex flex-col gap-[42px] items-end w-full">
            <!-- Heading + subtitle -->
            <div class="flex flex-col gap-1 items-start w-full text-center">
              <h2
                id="delete-dialog-title"
                class="font-semibold leading-[1.2] text-ios-fg-11 text-[24px] w-full"
              >
                {{ lang.t('settings.deleteDialog.heading') }}
              </h2>
              <p class="font-medium leading-[1.4] text-ios-fg-10 text-[18px] w-full">
                {{ lang.t('settings.deleteDialog.description') }}
              </p>
            </div>

            <!-- Password re-auth input (step-up) -->
            <div class="flex flex-col gap-1 items-start w-full">
              <div class="flex items-center px-2 w-full">
                <label
                  for="delete-password-input"
                  class="font-semibold leading-[1.4] text-ios-fg text-[16px]"
                >
                  {{ lang.t('settings.deleteDialog.passwordLabel') }}
                </label>
              </div>
              <input
                id="delete-password-input"
                type="password"
                [attr.placeholder]="lang.t('settings.deleteDialog.passwordPlaceholder')"
                [formControl]="passwordControl"
                autocomplete="current-password"
                [attr.aria-invalid]="errorMessage() !== null"
                [attr.aria-describedby]="errorMessage() ? 'delete-password-error' : null"
                (keydown.enter)="onDeleteClick()"
                class="w-full px-3 py-3 rounded-lg bg-ios-surface-mid border border-ios-line text-[16px] text-ios-fg-10 font-medium leading-[1.4] placeholder:text-ios-fg-7 focus:outline-none focus:ring-2 focus:ring-ios-brand-primary/40 focus:border-ios-brand-primary transition-colors"
              />
              @if (errorMessage(); as err) {
                <p
                  id="delete-password-error"
                  class="px-2 pt-1 text-sm font-medium text-ios-danger-strong"
                  role="alert"
                  aria-live="polite"
                >
                  {{ err }}
                </p>
              }
            </div>

            <!-- Buttons -->
            <div class="flex flex-col sm:flex-row gap-3 sm:gap-6 items-end justify-end w-full">
              <!-- Go back -->
              <button
                type="button"
                class="flex items-center justify-center h-14 w-full sm:w-[139px] rounded-xl bg-ios-surface-soft text-ios-fg text-[18px] font-semibold leading-[1.4] hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-fg/30"
                (click)="cancelled.emit()"
              >
                {{ lang.t('settings.deleteDialog.goBack') }}
              </button>

              <!-- Delete account — disabled until a password is entered -->
              <button
                type="button"
                class="flex items-center justify-center gap-2 h-14 w-full sm:w-[230px] rounded-xl bg-ios-danger-mid text-white text-[18px] font-semibold leading-[1.4] transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-danger-mid/50"
                [class.opacity-40]="!canDelete()"
                [class.cursor-not-allowed]="!canDelete()"
                [disabled]="!canDelete()"
                [attr.aria-disabled]="!canDelete()"
                (click)="onDeleteClick()"
              >
                @if (pending()) {
                  <span
                    class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/60 border-t-transparent"
                    aria-hidden="true"
                  ></span>
                  <span>{{ lang.t('settings.deleteDialog.deleting') }}</span>
                } @else {
                  {{ lang.t('settings.deleteDialog.confirm') }}
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DeleteAccountDialog {
  protected readonly lang = inject(LanguageService);

  /** `true` while the parent's `POST /me/delete` call is in flight. */
  readonly pending = input(false);
  /** Server/validation error to surface under the field (e.g. wrong password). */
  readonly errorMessage = input<string | null>(null);

  /** Emitted when the user cancels or clicks the backdrop. */
  readonly cancelled = output<void>();
  /** Emitted with the entered password when the user confirms deletion. */
  readonly confirmed = output<string>();

  protected readonly passwordControl = new FormControl('', { nonNullable: true });

  /**
   * Reactive signal derived from the FormControl's value stream via `toSignal`,
   * so `canDelete` recomputes as the user types.
   */
  private readonly passwordValue = toSignal(this.passwordControl.valueChanges, {
    initialValue: '',
  });

  /** Enabled once a non-empty password is entered and no delete is in flight. */
  protected readonly canDelete = computed(
    () => this.passwordValue().trim().length > 0 && !this.pending(),
  );

  protected onDeleteClick(): void {
    if (this.canDelete()) {
      this.confirmed.emit(this.passwordControl.value.trim());
    }
  }
}
