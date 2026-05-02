import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { LucideGlobe } from '@lucide/angular';

import { LanguageService, type AppLocale } from '@core/i18n';

/**
 * `ios-language-selector` — icon-only button with a popover for EN / AR / FR.
 *
 * Shows only a globe icon; clicking opens a small dropdown with locale options.
 */
@Component({
  selector: 'ios-language-selector',
  imports: [LucideGlobe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <button
        type="button"
        (click)="toggle()"
        [attr.aria-label]="lang.t('common.selectLanguage')"
        [attr.aria-expanded]="isOpen()"
        class="w-10 h-10 rounded-lg flex items-center justify-center
               border border-gray-200 bg-gray-50 text-ios-brand-dark/70
               hover:bg-gray-100 hover:text-ios-brand-dark
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50
               transition-colors"
      >
        <svg lucideGlobe class="w-[18px] h-[18px]" aria-hidden="true"></svg>
      </button>

      @if (isOpen()) {
        <div
          class="absolute end-0 mt-2 w-44 rounded-xl bg-white border border-gray-200 shadow-lg py-1 z-50"
          role="listbox"
        >
          @for (option of lang.supportedLocales; track option.code) {
            <button
              type="button"
              role="option"
              [attr.aria-selected]="option.code === locale()"
              (click)="select(option.code)"
              class="w-full px-4 py-2 text-start text-sm font-medium
                     hover:bg-gray-50 transition-colors
                     flex items-center justify-between gap-2"
              [class.text-ios-brand-primary]="option.code === locale()"
              [class.bg-gray-50]="option.code === locale()"
            >
              <span>{{ option.label }}</span>
              @if (option.code === locale()) {
                <svg
                  class="w-4 h-4 flex-shrink-0"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 8.5l3.5 3.5 6-7"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
  host: {
    '(document:click)': 'onOutsideClick($event)',
  },
})
export class LanguageSelector {
  protected readonly lang = inject(LanguageService);

  readonly localeChange = output<AppLocale>();

  protected readonly locale = this.lang.locale;
  protected readonly isOpen = signal(false);

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  select(code: AppLocale): void {
    void this.lang.setLocale(code);
    this.isOpen.set(false);
    this.localeChange.emit(code);
  }

  onOutsideClick(event: Event): void {
    if (!this.isOpen()) return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest('ios-language-selector')) {
      this.isOpen.set(false);
    }
  }
}
