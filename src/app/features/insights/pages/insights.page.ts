/**
 * `ios-insights-page` — public insights (blog/journal) listing page.
 *
 * Structure:
 *   1. Navbar
 *   2. Hero banner (reusable PageHero)
 *   3. Search bar — centered input with magnifying glass icon
 *   4. Insights grid — cards from store (paginated, 6 per page)
 *   5. Load more button
 *   6. Footer
 *   7. Scroll-to-top floating button (shared ios-scroll-to-top)
 */

import { ChangeDetectionStrategy, Component, type OnInit, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { LucideArrowDown, LucideSearch } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, ScrollToTop, provideIcons } from '@ui';

import { LandingNavbar } from '../../landing/components/landing-navbar';
import { LandingFooter } from '../../landing/components/landing-footer';
import { PageHero } from '../../landing/components/page-hero';
import { InsightsCard } from '../components/insights-card';
import { InsightsStore } from '../data-access/insights.store';

@Component({
  selector: 'ios-insights-page',
  imports: [
    LandingNavbar,
    LandingFooter,
    PageHero,
    InsightsCard,
    IosIcon,
    ReactiveFormsModule,
    ScrollToTop,
  ],
  providers: [provideIcons(LucideArrowDown, LucideSearch)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ios-landing-navbar />

    <!-- Hero banner -->
    <ios-page-hero
      [title]="lang.t('insights.hero.title')"
      [showBreadcrumb]="true"
      [breadcrumbLabel]="lang.t('insights.hero.breadcrumb.home')"
      breadcrumbLink="/"
      [backLink]="'/'"
      [ariaBackLabel]="lang.t('insights.hero.back')"
    />

    <!-- Search bar -->
    <section class="bg-white pb-[72px]">
      <div class="px-6 md:px-16 lg:px-[120px] flex flex-col items-center gap-10">
        <div class="relative w-full max-w-[732px] mt-10">
          <div class="absolute inset-y-0 start-4 flex items-center pointer-events-none">
            <ios-icon name="search" class="w-6 h-6 text-ios-fg-8" />
          </div>
          <input
            [formControl]="searchControl"
            [placeholder]="lang.t('insights.search.placeholder')"
            class="w-full h-[58px] ps-14 pe-16 rounded-lg bg-gray-50 border border-gray-200
                   text-[18px] font-heading font-medium text-ios-fg-10
                   placeholder:text-ios-fg-7
                   focus:outline-none focus:ring-2 focus:ring-ios-brand-primary/40 focus:border-ios-brand-primary
                   transition-colors"
          />
        </div>

        <!-- Cards grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          @for (post of store.visiblePosts(); track post.id) {
            <ios-insights-card [post]="post" />
          }
        </div>

        <!-- Load more -->
        @if (store.hasMore()) {
          <button
            type="button"
            (click)="onLoadMore()"
            class="inline-flex items-center justify-center gap-2 w-full  h-12 rounded-lg
                   bg-white border-[1.5px] border-ios-brand-gold border-solid
                   text-[#736428] font-heading font-semibold text-[15px] transition-colors"
          >
            {{ lang.t('insights.loadMore') }}
            <ios-icon name="arrow-down" class="w-5 h-5" />
          </button>
        }
      </div>
    </section>

    <ios-landing-footer />

    <!-- Scroll-to-top button (shared primitive) -->
    <ios-scroll-to-top />
  `,
})
export class InsightsPage implements OnInit {
  protected readonly store = inject(InsightsStore);
  protected readonly lang = inject(LanguageService);

  protected readonly searchControl = new FormControl('', { nonNullable: true });

  /**
   * Reactive bridge from the FormControl's value stream to the store —
   * replaces a bare `.subscribe()` (banned in components — CLAUDE.md §4)
   * with a signal-driven effect so unsubscription is owned by the framework.
   */
  private readonly searchValue = toSignal(this.searchControl.valueChanges, {
    initialValue: '',
  });

  constructor() {
    effect(() => this.store.setSearchQuery(this.searchValue() ?? ''));
  }

  ngOnInit(): void {
    void this.store.load();
  }

  protected onLoadMore(): void {
    this.store.loadMore();
  }
}
