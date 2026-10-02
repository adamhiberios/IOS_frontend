import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { LucideMail, LucideMailCheck } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { DialogEscape, IosIcon, provideIcons } from '@ui';

/**
 *   confirm     — "we'll email you the link" + Confirm / Cancel
 *   sending     — Confirm pressed, request in flight
 *   sent        — link emailed now
 *   alreadySent — a link was emailed earlier and is still valid; nothing new sent
 */
export type FinalExamLinkDialogMode = 'confirm' | 'sending' | 'sent' | 'alreadySent';

/**
 * `ios-final-exam-link-dialog` — the two steps of "Start Final Exam" (IDD-343):
 * confirm that the exam link should be emailed, then tell the student it was
 * sent and to start the exam from their inbox.
 *
 * Opened by {@link FinalExamCta}; purely presentational. Same shape as the mock
 * exam's start dialog (icon circle, centred title and body, two actions).
 */
@Component({
  selector: 'ios-final-exam-link-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogEscape, IosIcon],
  providers: [provideIcons(LucideMail, LucideMailCheck)],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <!-- Backdrop: a click outside the card closes, like Cancel / OK. -->
      <button
        type="button"
        class="absolute inset-0 w-full h-full cursor-default"
        tabindex="-1"
        [attr.aria-label]="lang.t('dashboard.certs.finalExamDialog.close')"
        [disabled]="sending()"
        (click)="closed.emit()"
      ></button>

      <div
        class="relative bg-white rounded-2xl w-full max-w-[724px] p-6 sm:p-8 flex flex-col gap-6 sm:gap-9 items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="final-exam-link-title"
        aria-describedby="final-exam-link-body"
        (iosDialogEscape)="!sending() && closed.emit()"
      >
        <div
          class="bg-ios-surface-soft flex items-center justify-center rounded-full size-[112px] sm:size-[148px] shrink-0"
          aria-hidden="true"
        >
          <ios-icon
            [name]="step() === 'confirm' ? 'mail' : 'mail-check'"
            class="size-14 sm:size-[72px] text-ios-brand-primary"
          />
        </div>

        <div class="flex flex-col gap-2 items-center text-center w-full" aria-live="polite">
          <h2
            id="final-exam-link-title"
            class="text-[22px] sm:text-[24px] font-semibold leading-[1.2] text-ios-fg-11 w-full"
            dir="auto"
          >
            {{ lang.t('dashboard.certs.finalExamDialog.' + step() + 'Title') }}
          </h2>
          <p
            id="final-exam-link-body"
            class="text-[16px] sm:text-[18px] font-medium leading-[1.4] text-ios-fg-10 w-full"
            dir="auto"
          >
            {{ lang.t('dashboard.certs.finalExamDialog.' + bodyKey()) }}
          </p>
        </div>

        <div
          class="flex flex-col-reverse sm:flex-row gap-3 sm:gap-6 items-stretch sm:items-start justify-center w-full"
        >
          @if (step() === 'confirm') {
            <button
              type="button"
              class="inline-flex items-center justify-center h-14 px-6 rounded-xl text-[18px] font-semibold leading-[1.4] text-ios-fg bg-ios-surface-soft hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 disabled:opacity-50 sm:min-w-[165px] whitespace-nowrap"
              [disabled]="sending()"
              (click)="closed.emit()"
            >
              {{ lang.t('dashboard.certs.finalExamDialog.cancel') }}
            </button>
            <button
              #primaryButton
              type="button"
              class="inline-flex items-center justify-center h-14 px-6 rounded-xl text-[18px] font-semibold leading-[1.4] text-white bg-ios-brand-primary hover:bg-ios-brand-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 disabled:opacity-60 sm:min-w-[203px] whitespace-nowrap"
              [disabled]="sending()"
              [attr.aria-busy]="sending()"
              (click)="confirmed.emit()"
            >
              {{
                sending()
                  ? lang.t('dashboard.certs.finalExamDialog.sending')
                  : lang.t('dashboard.certs.finalExamDialog.confirm')
              }}
            </button>
          } @else {
            <button
              #primaryButton
              type="button"
              class="inline-flex items-center justify-center h-14 px-6 rounded-xl text-[18px] font-semibold leading-[1.4] text-white bg-ios-brand-primary hover:bg-ios-brand-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 sm:min-w-[203px] whitespace-nowrap"
              (click)="closed.emit()"
            >
              {{ lang.t('dashboard.certs.finalExamDialog.ok') }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
})
export class FinalExamLinkDialog {
  protected readonly lang = inject(LanguageService);

  readonly mode = input.required<FinalExamLinkDialogMode>();

  /** Confirm pressed — the host sends the link. */
  readonly confirmed = output<void>();
  /** Cancel, OK, Escape or a backdrop click. */
  readonly closed = output<void>();

  protected readonly sending = computed(() => this.mode() === 'sending');
  /** "sending" still shows the confirm step, with its button busy. */
  protected readonly step = computed(() => (this.mode() === 'sending' ? 'confirm' : this.mode()));
  protected readonly bodyKey = computed(() => `${this.step()}Body`);

  private readonly primaryButton = viewChild<ElementRef<HTMLButtonElement>>('primaryButton');

  constructor() {
    // Focus the action on open and again when the step changes (confirm → sent
    // swaps the button), so keyboard focus never falls back to the page.
    const injector = inject(Injector);
    effect(() => {
      this.step();
      afterNextRender(() => this.primaryButton()?.nativeElement.focus(), { injector });
    });
  }
}
