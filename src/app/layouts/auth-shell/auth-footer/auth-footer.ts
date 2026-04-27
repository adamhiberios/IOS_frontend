import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { MapleLeafIcon } from '@ui';

/**
 * `ios-auth-footer` — dark-surface footer with centered copyright + Canada
 * flag accent.
 *
 * Surface uses `--color-ios-brand-dark` (#272827); copy uses
 * `--color-ios-brand-muted` (#959695) for a softened, low-emphasis read on
 * the dark background. The Canada flag is rendered as two red bars flanking
 * a maple-leaf glyph piped through Lucide's dynamic icon component, so every
 * glyph in the shell still flows through the same lucide rendering pipeline.
 */
@Component({
  selector: 'ios-auth-footer',
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer
      class="w-full py-4 flex items-center justify-center gap-2
             bg-ios-brand-dark text-ios-brand-muted"
    >
      <small class="text-xs"> © 2026 Institute of Scrum. All rights reserved. </small>
      <span class="inline-flex items-center" role="img" aria-label="Made in Canada">
        <span class="block w-1.5 h-3 bg-red-600 rounded-sm"></span>
        <svg [lucideIcon]="mapleLeaf" class="w-4 h-4 text-red-600" aria-hidden="true"></svg>
        <span class="block w-1.5 h-3 bg-red-600 rounded-sm"></span>
      </span>
    </footer>
  `,
})
export class AuthFooter {
  protected readonly mapleLeaf = MapleLeafIcon;
}
