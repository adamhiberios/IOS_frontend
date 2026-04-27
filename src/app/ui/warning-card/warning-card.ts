import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideTriangleAlert } from '@lucide/angular';

/**
 * `ios-warning-card` — soft yellow surface for hints / warnings.
 *
 * Renders the Lucide `TriangleAlert` glyph (the only icon allowed for
 * error / warning states per the design brief) plus a slot for arbitrary
 * content via `<ng-content>`. Pure presentation — no semantic role logic
 * beyond `role="status"` so screen readers announce the message politely.
 */
@Component({
  selector: 'ios-warning-card',
  imports: [LucideTriangleAlert],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside
      role="status"
      class="flex items-start gap-3 p-3 rounded-lg
             bg-ios-brand-yellow-soft border border-ios-brand-yellow"
    >
      <svg
        lucideTriangleAlert
        class="w-5 h-5 shrink-0 mt-0.5 text-ios-brand-dark"
        aria-hidden="true"
      ></svg>
      <p class="text-sm text-ios-brand-dark">
        @if (text()) {
          {{ text() }}
        } @else {
          <ng-content></ng-content>
        }
      </p>
    </aside>
  `,
})
export class WarningCard {
  /** Optional plain-text shortcut; otherwise project HTML via `<ng-content>`. */
  readonly text = input<string>('');
}
