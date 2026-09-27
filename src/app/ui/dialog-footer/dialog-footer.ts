/**
 * `ios-dialog-footer` — the action bar at the bottom of a modal dialog, kept
 * in view while the dialog body scrolls (IDD-392).
 *
 * Long admin forms (lesson bodies, question sets) put Save / Cancel below the
 * fold, so every cancel meant scrolling to the end. This bar sticks to the
 * bottom of the dialog's scroll area instead, and gives every dialog the same
 * footer spacing, divider and button alignment.
 *
 * Contract with the host dialog panel:
 *   - the panel is the scroll container (`max-h-[90vh] overflow-y-auto`), and
 *   - it has `p-6` padding — the bar's negative margins and `-bottom-6` offset
 *     cancel that padding so it sits flush against the panel's edges.
 *
 * Buttons are projected, so a `type="submit"` button still submits the
 * surrounding `<form>`:
 * ```html
 * <ios-dialog-footer>
 *   <button type="button" (click)="close()">Cancel</button>
 *   <ios-button type="submit">Save</ios-button>
 * </ios-dialog-footer>
 * ```
 */

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ios-dialog-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'sticky -bottom-6 z-10 -mx-6 -mb-6 mt-6 flex flex-wrap items-center justify-end gap-3 ' +
      'border-t border-gray-100 bg-white px-6 py-4',
  },
  template: `<ng-content />`,
})
export class DialogFooter {}
