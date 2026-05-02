import { ChangeDetectionStrategy, Component } from '@angular/core';

import { CanadaFlag } from '@ui';

/**
 * `ios-auth-footer` — dark-surface footer with centered copyright + Canada
 * flag accent.
 *
 * Surface uses `--color-ios-brand-dark` (#272827); copy uses
 * `--color-ios-brand-muted` (#959695) for a softened, low-emphasis read on
 * the dark background.
 */
@Component({
  selector: 'ios-auth-footer',
  imports: [CanadaFlag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer
      class="w-full py-4 flex items-center justify-center gap-2
             bg-ios-brand-dark text-ios-brand-muted"
    >
      <small class="text-xs"> © 2026 Institute of Scrum. All rights reserved. </small>
      <ios-canada-flag />
    </footer>
  `,
})
export class AuthFooter {}
