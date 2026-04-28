import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';

import { LanguageService, type AppLocale } from '@core/i18n';

/**
 * `ios-language-selector` — EN / AR / FR dropdown that drives `LanguageService`.
 *
 * Why a `<select>` instead of a custom popover:
 *  - It's keyboard-native and screen-reader-perfect on every platform.
 *  - It handles RTL automatically.
 *  - It defers visual polish (caret styling, option heights) to system UI.
 *
 * Options are derived from `LanguageService.supportedLocales` so adding a new
 * locale only requires updating that constant — no template changes needed here.
 */
@Component({
  selector: 'ios-language-selector',
  imports: [LucideChevronDown],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="relative inline-flex items-center">
      <span class="sr-only">Select language</span>
      <svg
        lucideChevronDown
        class="absolute end-4 h-4 w-4 text-ios-brand-dark/70 pointer-events-none"
        aria-hidden="true"
      ></svg>
      <select
        [value]="locale()"
        (change)="onChange($event)"
        [attr.aria-label]="lang.t('common.selectLanguage')"
        class="h-9 ps-4 pe-8 min-w-[112px] appearance-none rounded-lg
               border border-gray-200 bg-gray-50 text-sm font-medium
               text-ios-brand-dark hover:bg-gray-100 focus:outline-none
               focus:ring-2 focus:ring-ios-brand-primary/40 transition-colors"
      >
        @for (option of lang.supportedLocales; track option.code) {
          <option [value]="option.code">{{ option.label }}</option>
        }
      </select>
    </label>
  `,
})
export class LanguageSelector {
  protected readonly lang = inject(LanguageService);

  /** Emits whenever the user picks a different locale. */
  readonly localeChange = output<AppLocale>();

  protected readonly locale = this.lang.locale;

  protected onChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as AppLocale;
    void this.lang.setLocale(value);
    this.localeChange.emit(value);
  }
}
