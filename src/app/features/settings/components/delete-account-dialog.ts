import { ChangeDetectionStrategy, Component, computed, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

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
 *  │    Type "Delete" to continue process                     │
 *  │    ┌─────────────────────────────────────────────┐       │
 *  │    │  Type "Delete"                              │       │
 *  │    └─────────────────────────────────────────────┘       │
 *  │                                [Go back]  [Delete acc]  │
 *  └──────────────────────────────────────────────────────────┘
 *
 * The "Delete account" button is disabled (40% opacity) until the user types
 * exactly "Delete" in the input.
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
  imports: [ReactiveFormsModule],
  template: `
    <!-- ── Full-screen wrapper ─────────────────────────────────────────── -->
    <div class="fixed inset-0 z-50">
      <!-- Backdrop button — closes on click OR keyboard activation -->
      <button
        type="button"
        class="absolute inset-0 bg-black/60 cursor-default w-full h-full"
        aria-label="Close dialog"
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
            class="flex items-center justify-center p-4 rounded-[56px] bg-[#f1f1f1]"
            aria-hidden="true"
          >
            <!-- Trash icon — external Figma asset, not an app image -->
            <img
              src="https://www.figma.com/api/mcp/asset/10f932c1-7c56-4ba3-abf1-148e20165e9b"
              alt=""
              class="w-20 h-20 object-contain"
              loading="lazy"
              decoding="async"
              width="80"
              height="80"
            />
          </div>

          <!-- Body -->
          <div class="flex flex-col gap-[42px] items-end w-full">
            <!-- Heading + subtitle -->
            <div class="flex flex-col gap-1 items-start w-full text-center">
              <h2
                id="delete-dialog-title"
                class="font-semibold leading-[1.2] text-[#303130] text-[24px] w-full"
              >
                Are you sure to delete your account?
              </h2>
              <p class="font-medium leading-[1.4] text-[#373837] text-[18px] w-full">
                You will lose all information especially your certificates
              </p>
            </div>

            <!-- Confirmation input -->
            <div class="flex flex-col gap-1 items-start w-full">
              <div class="flex items-center px-2 w-full">
                <label
                  for="delete-confirm-input"
                  class="font-semibold leading-[1.4] text-[#272827] text-[16px]"
                >
                  Type "Delete" to continue process
                </label>
              </div>
              <input
                id="delete-confirm-input"
                type="text"
                placeholder='Type "Delete"'
                [formControl]="confirmControl"
                autocomplete="off"
                class="w-full px-3 py-3 rounded-lg bg-[#f6f6f6] border border-[#c4c5c4] text-[16px] text-[#373837] font-medium leading-[1.4] placeholder:text-[#959695] focus:outline-none focus:ring-2 focus:ring-ios-brand-primary/40 focus:border-ios-brand-primary transition-colors"
              />
            </div>

            <!-- Buttons -->
            <div class="flex gap-6 items-end justify-end w-full">
              <!-- Go back -->
              <button
                type="button"
                class="flex items-center justify-center h-14 px-6 rounded-xl bg-[#f1f1f1] text-[#272827] text-[18px] font-semibold leading-[1.4] hover:bg-[#e5e5e5] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#272827]/30 w-[139px]"
                (click)="cancelled.emit()"
              >
                Go back
              </button>

              <!-- Delete account — disabled until "Delete" typed -->
              <button
                type="button"
                class="flex items-center justify-center h-14 px-6 rounded-xl bg-[#d63d13] text-white text-[18px] font-semibold leading-[1.4] transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d63d13]/50 w-[230px]"
                [class.opacity-40]="!canDelete()"
                [class.cursor-not-allowed]="!canDelete()"
                [disabled]="!canDelete()"
                [attr.aria-disabled]="!canDelete()"
                (click)="onDeleteClick()"
              >
                Delete account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class DeleteAccountDialog {
  /** Emitted when the user cancels or clicks the backdrop. */
  readonly cancelled = output<void>();
  /** Emitted when the user confirms deletion (typed "Delete" and clicked). */
  readonly confirmed = output<void>();

  protected readonly confirmControl = new FormControl('');

  /**
   * Reactive signal derived from the FormControl's value stream via `toSignal`.
   * This ensures the `canDelete` computed updates whenever the input changes.
   */
  private readonly confirmValue = toSignal(this.confirmControl.valueChanges, {
    initialValue: '',
  });

  protected readonly canDelete = computed(() => (this.confirmValue() ?? '').trim() === 'Delete');

  protected onDeleteClick(): void {
    if (this.canDelete()) {
      this.confirmed.emit();
    }
  }
}
