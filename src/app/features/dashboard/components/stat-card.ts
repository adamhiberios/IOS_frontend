import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { LucideIconName } from '@ui';
import { IosIcon } from '@ui';

/**
 * `ios-dashboard-stat-card` — single KPI tile in the dashboard stats row.
 *
 * Exact Figma spec (node 17675:45401):
 *  · Background : #F6F6F6, border-radius 16px
 *  · Padding    : px-6 py-3  (24px / 12px)
 *  · Icon       : 32 × 32 px
 *  · Value      : Montserrat Bold 18px, #272827
 *  · Label      : Montserrat Medium 16px, #272827
 *  · Gap        : 24px between icon and text block
 */
@Component({
  selector: 'ios-dashboard-stat-card',
  imports: [IosIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex items-center gap-6 bg-ios-surface-muted rounded-2xl px-6 py-3"
      role="region"
      [attr.aria-label]="label()"
    >
      <!-- Icon (32 × 32 px) -->
      <div class="shrink-0 text-ios-fg" aria-hidden="true">
        <ios-icon [name]="icon()" class="w-8 h-8" />
      </div>

      <!-- Value + label -->
      <div class="flex flex-col">
        <span
          class="text-[18px] font-bold leading-[1.2] text-ios-fg tabular-nums whitespace-nowrap"
        >
          {{ value() }}
        </span>
        <span class="text-base font-medium leading-[1.4] text-ios-fg whitespace-nowrap">
          {{ label() }}
        </span>
      </div>
    </div>
  `,
})
export class DashboardStatCard {
  readonly icon = input.required<LucideIconName>();
  /** Formatted value string — e.g. "0", "43%", "12h 43m". */
  readonly value = input.required<string>();
  readonly label = input.required<string>();
}
