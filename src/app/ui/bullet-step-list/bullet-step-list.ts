/**
 * `ios-bullet-step-list` — vertical step list where each item has a
 * filled circle that connects to the next via a thin vertical line,
 * giving a "steps / timeline" appearance.
 *
 * Pass pre-translated strings via the `items` input. The component is
 * purely presentational — it never calls `LanguageService` itself.
 *
 * Usage:
 *   <ios-bullet-step-list [items]="translatedPoints()" />
 *
 *   <!-- With custom colours -->
 *   <ios-bullet-step-list
 *     [items]="translatedPoints()"
 *     circleColor="#184865"
 *     lineColor="#c8d3da"
 *   />
 */

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ios-bullet-step-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="flex flex-col" role="list">
      @for (item of items(); track item; let last = $last) {
        <li class="flex gap-3">
          <!-- ── Left rail: circle + connector line ── -->
          <div class="flex flex-col items-center shrink-0" style="width: 14px;">
            <!-- Step circle -->
            <div
              class="w-[14px] h-[14px] rounded-full border-2 shrink-0 mt-[3px]"
              [style.border-color]="circleColor()"
              aria-hidden="true"
            ></div>

            <!-- Connector line — hidden for the last item -->
            @if (!last) {
              <div
                class="flex-1 rounded-full mt-1"
                style="width: 2px;"
                [style.background-color]="lineColor()"
                aria-hidden="true"
              ></div>
            }
          </div>

          <!-- ── Right column: item text ── -->
          <p
            class="font-body font-medium text-[16px] leading-[1.4] text-ios-fg-muted"
            [class.pb-4]="!last"
          >
            {{ item }}
          </p>
        </li>
      }
    </ul>
  `,
})
export class BulletStepList {
  /** Pre-translated text strings for each step. */
  readonly items = input<readonly string[]>([]);

  /** Border colour of each circle. Defaults to a dark grey. */
  readonly circleColor = input<string>('#535453');

  /** Colour of the vertical connector line between circles. */
  readonly lineColor = input<string>('#d0d0d0');
}
