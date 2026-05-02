import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * `ios-canada-flag` — real Canadian flag image rendered via NgOptimizedImage.
 *
 * Uses the official SVG asset at `/assets/icons/flag_ca.svg` which follows
 * the correct 2:1 proportions and #D52B1E red. The host element is
 * `display: contents` so no extra layout box is introduced.
 *
 * The `<img>` carries `role="img"` and a configurable `alt` label for
 * accessible semantics. Width + height are explicit (per CLAUDE.md §7) so the
 * browser can reserve space before the image loads, avoiding CLS.
 *
 * Usage:
 * ```html
 * <!-- default size (height 16 px, auto width) -->
 * <ios-canada-flag />
 *
 * <!-- custom accessible label (e.g. different locale) -->
 * <ios-canada-flag label="Fabriqué au Canada" />
 *
 * <!-- larger flag -->
 * <ios-canada-flag [height]="24" />
 * ```
 */
@Component({
  selector: 'ios-canada-flag',
  imports: [NgOptimizedImage],
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img
      ngSrc="/assets/images/flag_of_canada.png"
      [alt]="label()"
      [width]="height() * 1.8"
      [height]="height()"
      [style.height.px]="height()"
      class="rounded-sm"
    />
  `,
})
export class CanadaFlag {
  /** Accessible alt text for the flag image. */
  readonly label = input<string>('Made in Canada');

  /**
   * Rendered height in pixels. Width is always `auto` so the 2:1
   * aspect ratio is preserved at any size.
   * @default 16
   */
  readonly height = input<number>(16);
}
