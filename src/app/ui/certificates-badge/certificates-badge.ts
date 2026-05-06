/**
 * `ios-certificates-badge` — renders a certification badge SVG image.
 *
 * Accepts the path to the SVG asset, a short code (e.g. "ESM"), and the
 * full certification name. The full name is used as the `alt` text so screen
 * readers can announce the badge correctly.
 *
 * `NgOptimizedImage` is used via `ngSrc` (skips srcset for SVGs in Angular 21+).
 * Explicit `width`/`height` are required by the directive.
 *
 * Usage:
 *   <ios-certificates-badge
 *     svgPath="/assets/badge/endorsed_scrum_master.svg"
 *     code="ESM"
 *     fullName="Endorsed Scrum Master"
 *   />
 */

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'ios-certificates-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
  template: `
    <img
      [ngSrc]="svgPath()"
      [attr.alt]="altText()"
      width="100"
      height="100"
      class="w-full h-auto block"
      loading="lazy"
      decoding="async"
    />
  `,
})
export class CertificatesBadge {
  /** Path to the SVG badge asset under `assets/badge/`. */
  readonly svgPath = input<string>('');

  /** Short certification code, e.g. "ESM". Used as fallback alt text. */
  readonly code = input<string>('');

  /** Full certification name, e.g. "Endorsed Scrum Master". Preferred alt text. */
  readonly fullName = input<string>('');

  /** Resolved alt text: fullName → code → generic fallback. */
  protected readonly altText = computed(
    () => this.fullName() || this.code() || 'Certificate badge',
  );
}
