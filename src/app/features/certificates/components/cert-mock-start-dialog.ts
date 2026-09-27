import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  afterNextRender,
  inject,
  output,
  viewChild,
} from '@angular/core';
import { LucideClipboardCheck } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, provideIcons } from '@ui';

/**
 * `ios-cert-mock-start-dialog` — "this is a practice exam" confirmation shown
 * before a mock exam starts (IDD-353), so a candidate never mistakes it for the
 * final certification exam.
 *
 * Same look as the other mock-exam dialogs (`ios-cert-mock-exit-dialog`,
 * `ios-cert-mock-timeup-dialog`): icon in a soft circle, centred title and body,
 * secondary + primary buttons. Unlike them it is exposed to assistive tech (no
 * `aria-hidden` wrapper), fits a phone (fluid width), closes on Escape or a
 * backdrop click, and focuses the primary action when it opens.
 */
@Component({
  selector: 'ios-cert-mock-start-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IosIcon],
  providers: [provideIcons(LucideClipboardCheck)],
  host: { '(document:keydown.escape)': 'dismissed.emit()' },
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <!-- Backdrop: a click outside the card cancels, like the Cancel button. -->
      <button
        type="button"
        class="absolute inset-0 w-full h-full cursor-default"
        tabindex="-1"
        [attr.aria-label]="lang.t('dashboard.certs.mockStartDialog.cancel')"
        (click)="dismissed.emit()"
      ></button>

      <div
        class="relative bg-white rounded-2xl w-full max-w-[724px] p-6 sm:p-8 flex flex-col gap-6 sm:gap-9 items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mock-start-title"
        aria-describedby="mock-start-body"
      >
        <!-- Icon circle -->
        <div
          class="bg-ios-surface-soft flex items-center justify-center rounded-full size-[112px] sm:size-[148px] shrink-0"
          aria-hidden="true"
        >
          <ios-icon name="clipboard-check" class="size-14 sm:size-[72px] text-ios-brand-primary" />
        </div>

        <!-- Text -->
        <div class="flex flex-col gap-2 items-center text-center w-full">
          <h2
            id="mock-start-title"
            class="text-[22px] sm:text-[24px] font-semibold leading-[1.2] text-ios-fg-11 w-full"
          >
            {{ lang.t('dashboard.certs.mockStartDialog.title') }}
          </h2>
          <p
            id="mock-start-body"
            class="text-[16px] sm:text-[18px] font-medium leading-[1.4] text-ios-fg-10 w-full"
          >
            {{ lang.t('dashboard.certs.mockStartDialog.body') }}
          </p>
        </div>

        <!-- Buttons -->
        <div
          class="flex flex-col-reverse sm:flex-row gap-3 sm:gap-6 items-stretch sm:items-start justify-center w-full"
        >
          <button
            type="button"
            class="inline-flex items-center justify-center h-14 px-6 rounded-xl text-[18px] font-semibold leading-[1.4] text-ios-fg bg-ios-surface-soft hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 sm:min-w-[165px] whitespace-nowrap"
            (click)="dismissed.emit()"
          >
            {{ lang.t('dashboard.certs.mockStartDialog.cancel') }}
          </button>
          <button
            #confirmButton
            type="button"
            class="inline-flex items-center justify-center h-14 px-6 rounded-xl text-[18px] font-semibold leading-[1.4] text-white bg-ios-brand-primary hover:bg-ios-brand-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 sm:min-w-[203px] whitespace-nowrap"
            (click)="confirmed.emit()"
          >
            {{ lang.t('dashboard.certs.mockStartDialog.confirm') }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class CertMockStartDialog {
  protected readonly lang = inject(LanguageService);

  /** Cancel, Escape or a backdrop click — the candidate stays on the page. */
  readonly dismissed = output<void>();
  /** "Start Mock Exam" — the host starts the exam. */
  readonly confirmed = output<void>();

  private readonly confirmButton =
    viewChild.required<ElementRef<HTMLButtonElement>>('confirmButton');

  constructor() {
    // Move focus into the dialog so keyboard users land on the action.
    afterNextRender(() => this.confirmButton().nativeElement.focus());
  }
}
