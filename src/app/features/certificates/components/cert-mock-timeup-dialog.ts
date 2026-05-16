import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';

import { LanguageService } from '@core/i18n';

/**
 * `ios-cert-mock-timeup-dialog` — Dialog shown when the mock exam timer expires.
 *
 * ┌── Layout (724 × auto, white, rounded-16) ───────────────────────────┐
 * │                                                                      │
 * │              ┌───────────────────────────┐                           │
 * │              │      (Timer icon)          │                           │
 * │              │        148×148            │                           │
 * │              └───────────────────────────┘                           │
 * │                                                                      │
 * │                       Time's up!                                    │
 * │         You can continue adding more time, this is only             │
 * │                    available in the mock exam!                       │
 * │                                                                      │
 * │            ┌──────────┐      ┌──────────────────────┐               │
 * │            │   Exit   │      │ Continue with +3 min │               │
 * │            └──────────┘      └──────────────────────┘               │
 * │                                                                      │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Figma: node 13434-35653 (time's up dialog).
 */
@Component({
  selector: 'ios-cert-mock-timeup-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" aria-hidden="true">
      <div
        class="relative bg-white rounded-2xl w-[724px] p-8 flex flex-col gap-9 items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mock-timeup-title"
      >
        <!-- Icon circle -->
        <div
          class="bg-ios-surface-soft flex items-center p-4 rounded-full shrink-0"
          aria-hidden="true"
        >
          <div class="size-[148px] shrink-0">
            <svg
              viewBox="0 0 114 134"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              class="size-full"
              preserveAspectRatio="xMidYMid meet"
            >
              <path d="M43.7 11.5H57.5V25.3H43.7V11.5z" fill="#515464" />
              <path
                d="M21.551 32.153l-4.554-7.245a9.2 9.2 0 0 1 7.73-13.831 9.2 9.2 0 0 1 7.73 4.128l4.991 7.889-11.897 5.059z"
                fill="#515464"
              />
              <path
                d="M69.506 26.656l4.991-7.889a9.2 9.2 0 0 1 12.811-2.71 9.2 9.2 0 0 1 2.709 12.811l-4.554 7.245-11.957-5.457z"
                fill="#515464"
              />
              <path
                d="M50.6 124.2c27.946 0 50.6-22.654 50.6-50.6S78.546 23 50.6 23 0 45.654 0 73.6s22.654 50.6 50.6 50.6z"
                fill="#26272A"
              />
              <path
                d="M50.6 115c22.865 0 41.4-18.536 41.4-41.4 0-22.865-18.535-41.4-41.4-41.4S9.2 50.735 9.2 73.6 27.735 115 50.6 115z"
                fill="#fff"
              />
              <path
                d="M57.5 0H43.7a4.6 4.6 0 0 0-4.6 4.6V9.2a4.6 4.6 0 0 0 4.6 4.6H57.5a4.6 4.6 0 0 0 4.6-4.6V4.6A4.6 4.6 0 0 0 57.5 0z"
                fill="#5A5E6D"
              />
              <path
                d="M50.6 71.3a2.3 2.3 0 0 1-2.3-2.3V50.6a2.3 2.3 0 0 1 4.6 0V69a2.3 2.3 0 0 1-2.3 2.3z"
                fill="#5A5E6D"
              />
              <path d="M46 75.9H34.5a2.3 2.3 0 0 1 0-4.6H46a2.3 2.3 0 0 1 0 4.6z" fill="#5A5E6D" />
              <path d="M48.3 32.2V39.1a2.3 2.3 0 0 0 4.6 0v-6.9h-4.6z" fill="#5A5E6D" />
              <path
                d="M19.7 45.952l4.88 4.878a2.3 2.3 0 0 0 3.249-3.25l-4.88-4.88-3.249 3.252z"
                fill="#5A5E6D"
              />
              <path
                d="M9.2 75.901H16.1a2.3 2.3 0 0 0 0-4.6H9.2v4.6zM91.9 75.901H85a2.3 2.3 0 0 1 0-4.6h6.9v4.6z"
                fill="#5A5E6D"
              />
              <path
                d="M22.952 104.5l4.878-4.88a2.3 2.3 0 0 0-3.25-3.25l-4.88 4.88 3.252 3.25z"
                fill="#5A5E6D"
              />
              <path d="M52.9 115v-6.9a2.3 2.3 0 0 0-4.6 0V115h4.6z" fill="#5A5E6D" />
              <path
                d="M78.248 42.7l-4.878 4.88a2.3 2.3 0 0 0 3.25 3.25l4.88-4.88-3.252-3.25z"
                fill="#5A5E6D"
              />
              <path d="M48.3 0h4.6v13.8h-4.6V0z" fill="#232323" />
              <path
                d="M50.6 117.298c-8.643 0-17.092-2.562-24.278-7.364-7.187-4.802-12.788-11.627-16.095-19.612-3.308-7.985-4.173-16.772-2.487-25.249s6.848-16.264 12.96-22.375c6.11-6.112 13.897-10.274 22.374-11.96 8.477-1.686 17.264-.82 25.249 2.487 7.985 3.307 14.81 8.908 19.612 19.095 4.802 7.187 7.365 15.636 7.365 24.278-.013 11.586-4.621 22.694-12.814 30.887-8.192 8.192-19.3 12.8-30.886 12.813zm0-82.8c-7.733 0-15.293 2.293-21.723 6.59-6.43 4.296-11.441 10.402-14.4 17.547-2.96 7.145-3.734 15.006-2.225 22.591 1.508 7.585 5.232 14.552 10.7 20.02s12.436 9.192 20.02 10.7c7.585 1.51 15.447.736 22.592-2.224 7.144-2.96 13.25-7.97 17.547-16.4 4.296-6.43 6.59-13.99 6.59-21.723-.012-10.367-4.135-20.305-11.465-27.635-7.33-7.33-17.268-11.454-27.635-11.466z"
                fill="#515464"
              />
              <path d="M50.6 80.5a6.9 6.9 0 1 0 0-13.8 6.9 6.9 0 0 0 0 13.8z" fill="#26272A" />
              <path
                d="M105.223 133.927H54.633a9.2 9.2 0 0 1-7.953-4.568L21.39 90.606a9.2 9.2 0 0 1 12.396-12.396l25.29 41.137a9.2 9.2 0 0 1-8.053 13.58z"
                fill="#F2BB30"
              />
              <path
                d="M83.615 91.467a3.692 3.692 0 0 0-3.692-3.692 3.692 3.692 0 0 0-3.692 3.692v16.614a3.692 3.692 0 0 0 3.692 3.692 3.692 3.692 0 0 0 3.692-3.692V91.467zM79.924 126.542a3.692 3.692 0 1 0 0-7.385 3.692 3.692 0 0 0 0 7.385z"
                fill="#fff"
              />
            </svg>
          </div>
        </div>

        <!-- Text -->
        <div class="flex flex-col gap-[4px] items-center text-center w-full">
          <h2
            id="mock-timeup-title"
            class="text-[24px] font-semibold leading-[1.2] text-ios-fg-11 w-full"
          >
            {{ lang.t('dashboard.examRunner.timeupTitle') }}
          </h2>
          <p class="text-[18px] font-medium leading-[1.4] text-ios-fg-10 w-full">
            {{ lang.t('dashboard.examRunner.timeupBody') }}
          </p>
        </div>

        <!-- Buttons -->
        <div class="flex gap-6 items-center justify-center w-full">
          <button
            type="button"
            class="inline-flex items-center justify-center h-14 px-6 rounded-xl text-[18px] font-semibold leading-[1.4] text-ios-fg bg-ios-surface-soft hover:bg-ios-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 w-[156px] whitespace-nowrap"
            (click)="dismissed.emit()"
          >
            {{ lang.t('dashboard.examRunner.exit') }}
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center h-14 px-6 rounded-xl text-[18px] font-semibold leading-[1.4] text-white bg-ios-fg-13 hover:bg-ios-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 w-[343px] whitespace-nowrap"
            (click)="addTime.emit()"
          >
            {{ lang.t('dashboard.examRunner.continueWithTime') }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class CertMockTimeupDialog {
  protected readonly lang = inject(LanguageService);
  readonly dismissed = output<void>();
  readonly addTime = output<void>();
}
