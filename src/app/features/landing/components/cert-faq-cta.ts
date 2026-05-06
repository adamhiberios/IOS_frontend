/**
 * `ios-cert-faq-cta` — split-background FAQ / CTA section used in certification pages.
 *
 * Visual structure:
 *   ┌────────────────────────────────────────────────────────┐
 *   │  ████ Coloured background (bgColor) ███████████████ │
 *   │  ████    badge pill                ███████████████ │
 *   │  ████    heading (white + yellow)  ███████████████ │
 *   │  ████    description               ███████████████ │
 *   │  ████    underline bar             ███████████████ │
 *   │  ████──────────────────────────────────────────────│
 *   │        ┌───── wide certificate image ────────┐     │
 *   │░░░░░░░░│  (straddles the color boundary)     │░░░░░│
 *   └────────└─────────────────────────────────────┘─────┘
 *
 * The coloured background stops at `calc(100% - 207px)` from the top
 * (207 px = half of the 415 px image height), leaving the lower half of
 * the image to sit over the transparent area so the section below shows
 * through. `inset-x-0` is used (not `left-0 right-0`) so the decorative
 * div spans full width in both LTR and RTL.
 *
 * Usage:
 * ```html
 * <ios-cert-faq-cta
 *   bgColor="#184865"
 *   headingId="sm-faq-heading"
 *   [badge]="lang.t('scrumMaster.faq.badge')"
 *   [heading1]="lang.t('scrumMaster.faq.headingPart1')"
 *   [heading2]="lang.t('scrumMaster.faq.headingPart2')"
 *   [description]="lang.t('scrumMaster.faq.description')"
 *   imageSrc="/assets/images/certification_1.png"
 *   [imageAlt]="lang.t('scrumMaster.imageAlt.certificate')"
 * />
 * ```
 */

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'ios-cert-faq-cta',
  imports: [NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="relative bg-ios-surface-warm" [attr.aria-labelledby]="headingId()">
      <!--
        Coloured background — stops at the image mid-point so the lower half
        of the image appears over the transparent cream area below.
        inset-x-0 (= left: 0; right: 0) spans full width in both LTR and RTL.
      -->
      <div
        class="absolute inset-x-0 top-0 pointer-events-none"
        [style.background-color]="bgColor()"
        style="height: calc(100% - 207px);"
        aria-hidden="true"
      ></div>

      <!-- Foreground content — sits above the decorative bg div -->
      <div
        class="relative px-6 md:px-10 lg:px-16 xl:px-[246px] pt-[72px]
               flex flex-col gap-[42px] items-center"
      >
        <!-- Header block -->
        <div class="flex flex-col gap-4 items-center text-center w-full max-w-[940px]">
          <!-- Badge pill -->
          <span
            class="inline-flex items-center justify-center px-6 py-2 rounded-full border
                   font-heading font-semibold text-[14px] text-ios-brand-primary whitespace-nowrap"
            style="background-color: #faf0c8; border-color: #d9bd4c;"
          >
            {{ badge() }}
          </span>

          <!-- Heading + description + underline -->
          <div class="flex flex-col gap-4 items-center w-full">
            <div class="flex flex-col gap-2 items-center">
              <h2
                [id]="headingId()"
                class="font-heading font-extrabold text-[32px] md:text-[36px] leading-[1.2]"
              >
                <span class="text-white">{{ heading1() }}</span>
                <span style="color: #ffe477;">{{ heading2() }}</span>
              </h2>
              <p
                class="font-body font-medium text-[16px] leading-[1.4] w-full max-w-[940px]"
                style="color: #f6f6f6;"
              >
                {{ description() }}
              </p>
            </div>
            <div class="w-[274px] h-1 rounded-full bg-ios-brand-gold" aria-hidden="true"></div>
          </div>
        </div>

        <!-- Wide certificate image — bottom of section = bottom of image -->
        <div
          class="relative rounded-lg overflow-hidden w-full max-w-[1032px]"
          style="height: 415px;"
        >
          <img
            [ngSrc]="imageSrc()"
            [attr.alt]="imageAlt()"
            class="object-cover object-center"
            fill
            loading="lazy"
          />
        </div>
      </div>
    </section>
  `,
})
export class CertFaqCta {
  /** CSS colour for the top background portion, e.g. `#184865`. */
  readonly bgColor = input.required<string>();

  /**
   * `id` applied to the `<h2>` and referenced by `aria-labelledby` on
   * the `<section>`. Must be unique within the page.
   */
  readonly headingId = input.required<string>();

  /** Already-translated badge pill text. */
  readonly badge = input<string>('');

  /** Already-translated first heading span (rendered in white). */
  readonly heading1 = input<string>('');

  /** Already-translated second heading span (rendered in `#ffe477` yellow). */
  readonly heading2 = input<string>('');

  /** Already-translated description paragraph. */
  readonly description = input<string>('');

  /** Path to the wide certificate image. */
  readonly imageSrc = input<string>('/assets/images/certification_1.png');

  /** Alt text for the wide image (pass an already-translated string). */
  readonly imageAlt = input<string>('');
}
