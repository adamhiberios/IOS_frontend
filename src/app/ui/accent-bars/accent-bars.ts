import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * `ios-accent-bars` — two decorative yellow bars flanking the page from the
 * logical `start` and `end` edges. Used on auth pages to frame the centered
 * card without competing with content.
 *
 * Logical CSS properties (`start-0` / `end-0`) are used per CLAUDE.md §3 so
 * the bars mirror correctly in Arabic (RTL).
 *
 * Positioning contract:
 *   The bars are `position: absolute`, so they escape normal flow and are
 *   anchored to the nearest positioned ancestor. The host element itself is
 *   `display: contents` so it doesn't add a box to the layout — drop it
 *   anywhere inside a `relative` container (e.g. the page root).
 *
 * Why CSS length strings (not Tailwind fractions) for `start` / `end`:
 *   Tailwind's purger only keeps classes it can find as literal strings in
 *   templates. Building class names dynamically (e.g. `w-{{ start() }}`)
 *   would silently drop the styles in production. Inline `[style.width]`
 *   accepts any CSS length — `"28%"`, `"2/7"` won't, but `"28.5714%"`,
 *   `"10rem"`, or `"calc(100% / 7 * 2)"` all work.
 */
@Component({
  selector: 'ios-accent-bars',
  host: {
    'aria-hidden': 'true',
    class: 'contents',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="absolute start-0 bg-ios-brand-yellow"
      [style.top]="top()"
      [style.width]="start()"
      [style.height]="height()"
    ></span>
    <span
      class="absolute end-0 bg-ios-brand-yellow"
      [style.top]="top()"
      [style.width]="end()"
      [style.height]="height()"
    ></span>
  `,
})
export class AccentBars {
  /** Width of the start-side bar (left in LTR, right in RTL). Any CSS length.
   * Default ≈ 2/7 of the parent (the original register-page proportion). */
  readonly start = input<string>('28.5714%');

  /** Width of the end-side bar (right in LTR, left in RTL). Any CSS length. */
  readonly end = input<string>('28.5714%');

  /** Vertical offset from the top of the nearest positioned ancestor.
   * Default `9rem` matches Tailwind's `top-36`. */
  readonly top = input<string>('9rem');

  /** Bar thickness. Default `0.5rem` matches Tailwind's `h-2`. */
  readonly height = input<string>('0.5rem');
}
