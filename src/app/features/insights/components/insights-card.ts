/**
 * `ios-insights-card` — single insight/journal post card used on both the
 * insights listing page and the landing-page insights section.
 *
 * Accepts any post object with the common insight fields (id, date, title,
 * excerpt, readTime, imageUrl, link) so it works with both `InsightPost`
 * (landing) and `InsightPost` (insights feature).
 */

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideClock, LucideUser } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, provideIcons } from '@ui';

/**
 * Common shape shared by the landing `InsightPost` and the blog `InsightPost`.
 * The card footer shows a read-time (landing static content) when present, else
 * an author byline (public blog list rows carry an author but no read-time).
 */
export interface InsightCardPost {
  id: string;
  date: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  link: string;
  readTime?: string;
  authorName?: string;
}

@Component({
  selector: 'ios-insights-card',
  imports: [NgOptimizedImage, RouterLink, IosIcon],
  providers: [provideIcons(LucideArrowRight, LucideClock, LucideUser)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      [routerLink]="post().link"
      class="bg-white rounded-lg overflow-hidden border-2 border-ios-border-light
             hover:shadow-md transition-shadow group cursor-pointer block h-full flex flex-col"
    >
      <!-- Image -->
      <div class="w-full aspect-[16/9] overflow-hidden">
        <img
          [ngSrc]="post().imageUrl"
          [alt]="post().title"
          width="394"
          height="206"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          decoding="async"
        />
      </div>

      <!-- Content -->
      <div class="p-6 flex flex-col gap-4 flex-1">
        <!-- Date -->
        <span class="font-body font-medium text-[12px] text-ios-fg-7 uppercase tracking-wide">
          {{ post().date }}
        </span>

        <h3
          class="font-heading font-extrabold text-[18px] leading-tight line-clamp-3 text-ios-fg-10"
        >
          {{ post().title }}
        </h3>
        <p
          class="font-body font-medium text-[14px] leading-relaxed line-clamp-4 flex-1 text-ios-fg-7"
        >
          {{ post().excerpt }}
        </p>

        <div class="border-t border-ios-border-light"></div>

        <!-- Read time (static content) or author byline (blog list rows) -->
        <div class="flex items-center justify-end gap-3">
          @if (post().readTime) {
            <div class="flex items-center gap-2">
              <div
                class="w-5 h-5 rounded-full bg-ios-brand-gold-soft flex items-center justify-center"
              >
                <ios-icon name="clock" class="w-3.5 h-3.5 text-ios-brand-gold" aria-hidden="true" />
              </div>
              <span class="font-body font-medium text-[14px] text-ios-fg-10">
                {{ post().readTime }}
              </span>
            </div>
          } @else if (post().authorName) {
            <div class="flex items-center gap-2">
              <div
                class="w-5 h-5 rounded-full bg-ios-brand-gold-soft flex items-center justify-center"
              >
                <ios-icon name="user" class="w-3.5 h-3.5 text-ios-brand-gold" aria-hidden="true" />
              </div>
              <span class="font-body font-medium text-[14px] text-ios-fg-10 truncate max-w-[160px]">
                {{ post().authorName }}
              </span>
            </div>
          }
        </div>
      </div>
    </article>
  `,
})
export class InsightsCard {
  readonly post = input.required<InsightCardPost>();
  protected readonly lang = inject(LanguageService);
}
