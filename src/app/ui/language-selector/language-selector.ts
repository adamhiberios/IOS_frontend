import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';

import { DirectionService, type AppLocale } from '@core/i18n';

/**
 * `ios-language-selector` — EN / AR dropdown that drives `DirectionService`.
 *
 * Why a `<select>` instead of a custom popover:
 *  - It's keyboard-native and screen-reader-perfect on every platform.
 *  - It handles RTL automatically.
 *  - It defers visual polish (caret styling, option heights) to system UI,
 *    which is exactly what the design brief asks for: gray, wider options.
 *
 * Visual rules:
 *  - Lucide `Languages` glyph for affordance, no decorative-only PNG.
 *  - Wider option list achieved with `min-w-[112px]` + `pe-7`.
 */
@Component({
  selector: 'ios-language-selector',
  imports: [LucideChevronDown],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="relative inline-flex items-center">
      <svg
        lucideChevronDown
        class="absolute end-4 h-4 w-4 text-ios-brand-dark/70 pointer-events-none"
        aria-hidden="true"
      ></svg>
      <select
        [value]="locale()"
        (change)="onChange($event)"
        class="h-9 ps-4 pe-6 min-w-[112px] appearance-none rounded-lg
               border border-gray-200 bg-gray-50 text-sm font-medium
               text-ios-brand-dark hover:bg-gray-100 focus:outline-none
               focus:ring-2 focus:ring-ios-brand-primary/40 transition-colors"
      >
        <option value="en">English</option>
        <option value="ar">العربية</option>
      </select>
    </label>
  `,
})
export class LanguageSelector {
  private readonly direction = inject(DirectionService);

  /** Emits whenever the user picks a different locale. */
  readonly localeChange = output<AppLocale>();

  protected readonly locale = this.direction.locale;

  protected onChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as AppLocale;
    this.direction.setLocale(value);
    this.localeChange.emit(value);
  }
}
