import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { LucideDynamicIcon, type LucideIconData } from '@lucide/angular';

import { IOS_ICON_BATCHES } from './icon-registry';
import type { LucideIconName } from './icon-names';

/**
 * `ios-icon` — renders any Lucide icon by name.
 *
 * Internally uses `LucideDynamicIcon` (`svg[lucideIcon]`) — the same SVG
 * renderer Lucide uses for its own dynamic icon component — so every icon
 * gets the standard SVG attributes (viewBox, stroke, fill, etc.) without
 * any extra configuration.
 *
 * ── Usage ─────────────────────────────────────────────────────────────
 *
 * 1. Register icons once (component providers, route providers, or globally):
 *
 *    ```ts
 *    import { provideIcons } from '@ui';
 *    import { LucideAward, LucideArrowRight } from '@lucide/angular';
 *
 *    @Component({
 *      providers: [provideIcons(LucideAward, LucideArrowRight)],
 *    })
 *    ```
 *
 * 2. Import `IosIcon` in the component's `imports` array, then use by name:
 *
 *    ```html
 *    <ios-icon name="award"       class="w-5 h-5 text-ios-brand-primary" />
 *    <ios-icon name="arrow-right" class="w-4 h-4" />
 *    ```
 *
 * ── Sizing & colour ───────────────────────────────────────────────────
 *
 * The host is `display: inline-flex`. Width/height Tailwind classes on
 * `<ios-icon>` size the host box; the inner SVG fills it with `w-full h-full`.
 * `text-*` colour classes cascade through to `stroke: currentColor`:
 *
 *    ```html
 *    <ios-icon name="zap" class="w-6 h-6 text-yellow-500" />
 *    ```
 *
 * ── Accessibility ─────────────────────────────────────────────────────
 *
 * Decorative:  `<ios-icon name="star" aria-hidden="true" />`
 * Meaningful:  `<ios-icon name="settings" aria-label="Open settings" role="img" />`
 *
 * ── Error handling ────────────────────────────────────────────────────
 *
 * An unregistered name renders nothing and logs a dev-mode warning.
 * Production is always silent so a missing icon never breaks a page.
 */
@Component({
  selector: 'ios-icon',
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // inline-flex keeps the icon inline with text; line-height:0 eliminates the
  // extra descender space that browsers add below inline SVG elements.
  host: { style: 'display: inline-flex; line-height: 0;' },
  template: `
    @if (iconData(); as data) {
      <svg [lucideIcon]="data" class="block w-full h-full" />
    }
  `,
})
export class IosIcon {
  /** Kebab-case Lucide icon name, e.g. 'award', 'arrow-right', 'shield-check'. */
  readonly name = input.required<LucideIconName>();

  /**
   * Lookup map built once from all `provideIcons()` calls visible in the
   * injector tree at construction time.
   *
   * Key:   `LucideIconData.name`  — the canonical kebab name ('award', etc.)
   * Value: `LucideIconData`       — the SVG path data fed to LucideDynamicIcon
   */
  private readonly _iconMap: Map<string, LucideIconData>;

  constructor() {
    const batches = inject(IOS_ICON_BATCHES, { optional: true }) ?? [];
    this._iconMap = new Map(
      batches.flat().map((iconClass) => [iconClass.icon.name, iconClass.icon]),
    );
  }

  protected iconData(): LucideIconData | null {
    const data = this._iconMap.get(this.name());
    if (!data && (typeof ngDevMode === 'undefined' || ngDevMode)) {
      console.warn(
        `[ios-icon] Icon "${this.name()}" is not registered. ` +
          `Add it to the nearest provideIcons() call.`,
      );
    }
    return data ?? null;
  }
}
