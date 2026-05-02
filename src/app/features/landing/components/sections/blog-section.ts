/**
 * `ios-blog-section` — "Latest from the Scrum Journal" (section 10).
 *
 * Renders up to three blog post cards using the shared `InsightsCard` component.
 * Post data comes from the `posts` input.
 */

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, SectionBadge, provideIcons } from '@ui';

import { InsightsCard } from '../../../insights/components/insights-card';
import type { BlogPost } from '../../data-access/landing.model';

@Component({
  selector: 'ios-blog-section',
  imports: [InsightsCard, SectionBadge, RouterLink, IosIcon],
  providers: [provideIcons(LucideArrowRight)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-label="Latest from the Scrum Journal" class="bg-white py-[72px]">
      <div class="px-6 md:px-16 lg:px-[120px] flex flex-col items-center gap-8">
        <!-- Header row -->
        <div
          class="flex flex-col lg:flex-row items-start lg:items-center justify-between w-full gap-6"
        >
          <!-- Left: badge + heading + gold line -->
          <div class="flex flex-col items-start gap-3">
            <ios-section-badge
              [text]="lang.t('landing.sections.insightsResources')"
              variant="warm-red"
            />
            <h2 class="font-heading font-extrabold text-[36px] leading-tight">
              <span class="text-ios-fg-10">{{ lang.t('landing.sections.scrumJournalPart1') }}</span>
              <span class="ms-2 text-ios-brand-primary">{{
                lang.t('landing.sections.scrumJournalPart2')
              }}</span>
            </h2>
            <div class="w-[106px] h-1 bg-ios-brand-gold rounded-full" aria-hidden="true"></div>
          </div>

          <!-- Right: view all -->
          <a
            routerLink="/insights"
            class="inline-flex items-center gap-2 font-heading font-semibold text-[16px]
                   rounded-full px-3 py-3 text-ios-brand-primary-deep
                   hover:opacity-90 transition-opacity
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50
                   flex-shrink-0"
          >
            {{ lang.t('landing.blog.viewAll') }}
            <ios-icon name="arrow-right" class="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
          </a>
        </div>

        <!-- Blog post cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          @for (post of posts(); track post.id) {
            <ios-insights-card [post]="post" />
          }
        </div>
      </div>
    </section>
  `,
})
export class BlogSection {
  readonly posts = input.required<BlogPost[]>();
  protected readonly lang = inject(LanguageService);
}
