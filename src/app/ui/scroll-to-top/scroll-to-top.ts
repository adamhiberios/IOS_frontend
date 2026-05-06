/**
 * `ios-scroll-to-top` — fixed scroll-to-top button.
 *
 * Drop this anywhere inside a page template (typically just before the closing
 * tag of the root element). The button is `position: fixed`, so its DOM location
 * does not affect layout.
 *
 * The aria-label is resolved from the shared key `common.scrollToTop`.
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideArrowUp } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, provideIcons } from '@ui';

@Component({
  selector: 'ios-scroll-to-top',
  imports: [IosIcon],
  providers: [provideIcons(LucideArrowUp)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      (click)="scrollToTop()"
      class="fixed bottom-8 end-8 z-50
             flex items-center justify-center w-12 h-12 rounded-full
             bg-ios-brand-primary-soft border-2 border-[#cd9191]
             shadow-lg hover:bg-ios-brand-primary hover:border-ios-brand-primary
             hover:text-white transition-colors
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
      [attr.aria-label]="lang.t('common.scrollToTop')"
    >
      <ios-icon name="arrow-up" class="w-5 h-5" />
    </button>
  `,
})
export class ScrollToTop {
  protected readonly lang = inject(LanguageService);

  protected scrollToTop(this: void): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
