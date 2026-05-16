import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

import { LanguageService } from '@core/i18n';

import type { LearningCardContent } from '../data-access/dashboard.model';

/**
 * `ios-learning-card` — "Complete your learning" right-hand column card.
 *
 * Spans the full height of its grid cell so it aligns with the stacked
 * charts + cert section in the left column.
 *
 * Two Figma variants driven by `card().ctaStyle`:
 *  · 'primary' (red #8b0000)  — "First file is ready to explore!"     (node 13570-24378)
 *  · 'dark'    (#272827)      — "We think you are ready to pass Test!" (node 17453-34583)
 *
 * Exact Figma spec:
 *  · Section title : SemiBold 18px #141514, outside the card
 *  · Card          : bg #f6f6f6, rounded-2xl, px-4 py-6, flex-col, flex-1 (fills column height)
 *  · Illustration  : 148 × 148 px, object-contain
 *  · Heading       : Bold 18px #272827, line-height 1.2
 *  · Body          : Medium 16px #373837, line-height 1.4
 *  · Meta          : Medium 14px #666766 (optional)
 *  · CTA           : h-11 px-4 rounded-2xl SemiBold 16px, right-aligned at card bottom
 */
@Component({
  selector: 'ios-learning-card',
  imports: [NgOptimizedImage, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Outer wrapper fills the grid cell height -->
    <div class="flex flex-col gap-3 h-full">
      <!-- Section title — outside the card -->
      <h2 class="text-[18px] font-semibold leading-[1.4] text-ios-fg-13 shrink-0">
        {{ lang.t('dashboard.learning.title') }}
      </h2>

      <!-- Card — grows to fill remaining column height -->
      <div class="bg-ios-surface-muted rounded-2xl px-4 py-6 flex flex-col gap-6 flex-1">
        <!-- Illustration (148 × 148 px) -->
        @if (card().illustration) {
          <img
            [ngSrc]="card().illustration"
            alt=""
            class="w-[148px] h-[148px] object-contain shrink-0"
            width="148"
            height="148"
            loading="lazy"
            decoding="async"
            aria-hidden="true"
          />
        }

        <!-- Text content — grows to push CTA to the bottom -->
        <div class="flex flex-col gap-3 flex-1">
          <p class="text-[18px] font-bold leading-[1.2] text-ios-fg">
            {{ card().heading }}
          </p>
          <p class="text-base font-medium leading-[1.4] text-ios-fg-10">
            {{ card().body }}
          </p>
          @if (card().meta) {
            <p class="text-sm font-medium leading-[1.4] text-ios-fg-8">
              {{ card().meta }}
            </p>
          }
        </div>

        <!-- CTA button — pinned to bottom, right-aligned -->
        <div class="flex justify-end shrink-0">
          <a
            [routerLink]="card().ctaRoute"
            class="inline-flex items-center justify-center h-11 px-4 rounded-2xl text-base font-semibold leading-[1.4] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50 whitespace-nowrap"
            [class.bg-ios-brand-primary]="card().ctaStyle === 'primary'"
            [class.text-ios-brand-primary-soft]="card().ctaStyle === 'primary'"
            [class.hover:bg-ios-brand-primary-hover]="card().ctaStyle === 'primary'"
            [class.bg-ios-brand-dark]="card().ctaStyle === 'dark'"
            [class.text-white]="card().ctaStyle === 'dark'"
            [class.hover:bg-ios-fg-13]="card().ctaStyle === 'dark'"
          >
            {{ card().ctaLabel }}
          </a>
        </div>
      </div>
    </div>
  `,
})
export class LearningCard {
  protected readonly lang = inject(LanguageService);
  readonly card = input.required<LearningCardContent>();
}
