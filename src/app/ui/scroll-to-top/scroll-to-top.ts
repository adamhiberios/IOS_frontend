/**
 * `ios-scroll-to-top` — fixed scroll-to-top button.
 *
 * Drop this anywhere inside a page template (typically just before the closing
 * tag of the root element). The button is `position: fixed`, so its DOM location
 * does not affect layout.
 *
 * Hidden until the page has been scrolled past {@link SHOW_AFTER_PX}; at (or
 * near) the top there is nothing to scroll back to. While hidden it is also
 * removed from the tab order and the accessibility tree, so keyboard and
 * screen-reader users never land on an invisible control.
 *
 * The aria-label is resolved from the shared key `common.scrollToTop`.
 */

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { LucideArrowUp } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, provideIcons } from '@ui';

/** Scroll distance (px) after which the button appears. */
const SHOW_AFTER_PX = 350;

@Component({
  selector: 'ios-scroll-to-top',
  imports: [IosIcon],
  providers: [provideIcons(LucideArrowUp)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:scroll)': 'onScroll()' },
  template: `
    <button
      type="button"
      (click)="scrollToTop()"
      class="fixed bottom-8 end-8 z-50
             flex items-center justify-center w-12 h-12 rounded-full
             bg-ios-brand-primary-soft border-2 border-[#cd9191]
             shadow-lg hover:bg-ios-brand-primary hover:border-ios-brand-primary
             hover:text-white transition-[opacity,translate,background-color,border-color,color] duration-200
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
      [class.opacity-0]="!visible()"
      [class.translate-y-2]="!visible()"
      [class.pointer-events-none]="!visible()"
      [attr.aria-hidden]="visible() ? null : 'true'"
      [attr.tabindex]="visible() ? null : -1"
      [attr.aria-label]="lang.t('common.scrollToTop')"
    >
      <ios-icon name="arrow-up" class="w-5 h-5" />
    </button>
  `,
})
export class ScrollToTop {
  protected readonly lang = inject(LanguageService);

  protected readonly visible = signal(window.scrollY > SHOW_AFTER_PX);

  protected onScroll(): void {
    // `set` is a no-op for an unchanged value, so scrolling within one state
    // schedules no change detection.
    this.visible.set(window.scrollY > SHOW_AFTER_PX);
  }

  protected scrollToTop(this: void): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
