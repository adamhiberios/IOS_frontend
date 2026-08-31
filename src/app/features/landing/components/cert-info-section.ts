/**
 * `ios-cert-info-section` — image + info-card row used in certification pages.
 *
 * Three sections per page reuse this exact pattern:
 *   - Why It Matters   (image first in LTR)
 *   - Who Should Learn (card first in LTR)
 *   - Career Opps      (image first in LTR)
 *
 * Setting `imageFirst="true"` places the image column before the card column
 * in DOM order. Because `flex-row` follows the inline writing direction, the
 * layout mirrors automatically in RTL — no extra `rtl:` variant needed.
 *
 * Usage:
 * ```html
 * <ios-cert-info-section
 *   bg="warm"
 *   headingId="sm-why-heading"
 *   [heading]="lang.t('scrumMaster.whyMatters.title')"
 *   [items]="whyItems()"
 *   imageSrc="/assets/images/certification_1.svg"
 *   [imageAlt]="lang.t('scrumMaster.imageAlt.certificate')"
 *   [imageFirst]="true"
 * />
 * ```
 */

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

import { BulletStepList } from '@ui';

@Component({
  selector: 'ios-cert-info-section',
  imports: [NgOptimizedImage, BulletStepList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16 xl:px-[246px] py-[72px]"
      [class.bg-ios-surface-warm]="bg() === 'warm'"
      [class.bg-white]="bg() === 'white'"
      [attr.aria-labelledby]="headingId()"
    >
      <div class="flex flex-col lg:flex-row gap-6 items-stretch">
        <!-- Image column — rendered first when imageFirst() is true -->
        @if (imageFirst()) {
          <div
            class="relative flex-1 min-w-0 rounded-lg overflow-hidden"
            style="min-height: 300px;"
          >
            <img
              [ngSrc]="imageSrc()"
              [attr.alt]="imageAlt()"
              class="object-cover"
              fill
              loading="lazy"
            />
          </div>
        }

        <!-- Info card -->
        <div
          class="bg-white border border-ios-border-light rounded-2xl p-[21px]
                 flex-1 min-w-0 flex flex-col gap-3"
        >
          <h2
            [id]="headingId()"
            class="font-heading font-bold text-[24px] leading-[1.2] text-ios-brand-dark"
          >
            {{ heading() }}
          </h2>
          <ios-bullet-step-list [items]="items()" />
        </div>

        <!-- Image column — rendered after the card when imageFirst() is false -->
        @if (!imageFirst()) {
          <div
            class="relative flex-1 min-w-0 rounded-lg overflow-hidden"
            style="min-height: 300px;"
          >
            <img
              [ngSrc]="imageSrc()"
              [attr.alt]="imageAlt()"
              class="object-cover"
              fill
              loading="lazy"
            />
          </div>
        }
      </div>
    </section>
  `,
})
export class CertInfoSection {
  /** Background style: `'warm'` (`ios-surface-warm`) or `'white'`. */
  readonly bg = input<'warm' | 'white'>('warm');

  /**
   * `id` applied to the `<h2>` — must be unique within the page.
   * Also referenced by `aria-labelledby` on the `<section>`.
   */
  readonly headingId = input.required<string>();

  /** Already-translated section heading. */
  readonly heading = input.required<string>();

  /** Already-translated bullet strings passed to `ios-bullet-step-list`. */
  readonly items = input<readonly string[]>([]);

  /** Absolute path to the certificate image, e.g. `/assets/images/certification_1.svg`. */
  readonly imageSrc = input<string>('/assets/images/certification_1.svg');

  /** Alt text for the image (pass an already-translated string). */
  readonly imageAlt = input<string>('');

  /**
   * Controls column order.
   * `true`  → image appears before the card (LTR: image-start, card-end).
   * `false` → card appears before the image (LTR: card-start, image-end).
   * Both layouts mirror automatically in RTL.
   */
  readonly imageFirst = input<boolean>(true);
}
