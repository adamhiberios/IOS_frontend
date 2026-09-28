import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { LanguageService } from '@core/i18n';

import { CanadaFlag } from '../canada-flag/canada-flag';

export type PageFooterVariant = 'brand' | 'neutral';

/**
 * `ios-page-footer` — the one-line copyright strip at the bottom of the
 * dashboard / checkout / exam pages (flag + "© {year} …").
 *
 * Every page used to carry its own copy of this markup, so a spacing change
 * (e.g. the `px-4 md:px-8` mobile gutter) meant editing a dozen files.
 *
 * Variants:
 *   brand   → `bg-ios-brand-dark` / `text-ios-brand-muted` (dashboard, settings, payments)
 *   neutral → `bg-ios-fg` / `text-ios-fg-7` (assessments, profile, notifications)
 *
 * Extra spacing (`mt-4`, `shrink-0`) goes on the host:
 * ```html
 * <ios-page-footer variant="neutral" class="mt-4" />
 * ```
 */
@Component({
  selector: 'ios-page-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CanadaFlag],
  host: { class: 'block w-full' },
  template: `
    <footer class="w-full py-4" [class]="bgClass()">
      <div
        class="max-w-[1400px] mx-auto px-4 md:px-8 flex items-center justify-center gap-2 text-xs"
      >
        <ios-canada-flag aria-hidden="true" />
        <span>{{ lang.t('common.copyright', { year: year }) }}</span>
      </div>
    </footer>
  `,
})
export class PageFooter {
  protected readonly lang = inject(LanguageService);
  protected readonly year = String(new Date().getFullYear());

  readonly variant = input<PageFooterVariant>('brand');

  protected readonly bgClass = computed(() =>
    this.variant() === 'brand'
      ? 'bg-ios-brand-dark text-ios-brand-muted'
      : 'bg-ios-fg text-ios-fg-7',
  );
}
