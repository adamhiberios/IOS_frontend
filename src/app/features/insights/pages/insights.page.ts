/**
 * `ios-insights-page` — public insights (blog) listing page.
 *
 * Structure:
 *   1. Navbar
 *   2. Hero banner (reusable PageHero)
 *   3. Search bar — centered input; drives server-side `?search=` (debounced)
 *   4. Insights grid — cards from the store (cursor-paginated infinite feed)
 *   5. Load more button (fetches the next cursor page)
 *   6. Footer
 *   7. Scroll-to-top floating button (shared ios-scroll-to-top)
 */

import { ChangeDetectionStrategy, Component, type OnInit, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { LucideArrowDown, LucideLoaderCircle, LucideSearch } from '@lucide/angular';

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
  providers: [provideIcons(LucideArrowDown, LucideLoaderCircle, LucideSearch)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col">
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
      <section class="flex-1 bg-white pb-[72px]">
        <div
          class="px-6 md:px-16 lg:px-[120px] flex flex-col items-center gap-10 max-w-[1440px] mx-auto"
        >
          <div class="relative w-full max-w-[732px] mt-10">
            <div class="absolute inset-y-0 start-4 flex items-center pointer-events-none">
              <ios-icon name="search" class="w-6 h-6 text-ios-fg-8" />
            </div>
            <input
              [formControl]="searchControl"
              [placeholder]="lang.t('insights.search.placeholder')"
              [attr.aria-label]="lang.t('insights.search.placeholder')"
              class="w-full h-[58px] ps-14 pe-16 rounded-lg bg-gray-50 border border-gray-200
                   text-[18px] font-heading font-medium text-ios-fg-10
                   placeholder:text-ios-fg-7
                   focus:outline-none focus:ring-2 focus:ring-ios-brand-primary/40 focus:border-ios-brand-primary
                   transition-colors"
            />
          </div>

          @if (store.isLoading()) {
            <!-- Initial load skeletons -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              @for (i of skeletons; track i) {
                <div class="rounded-lg border-2 border-ios-border-light overflow-hidden">
                  <div class="w-full aspect-[16/9] bg-gray-100 animate-pulse"></div>
                  <div class="p-6 flex flex-col gap-4">
                    <div class="h-3 w-24 rounded bg-gray-100 animate-pulse"></div>
                    <div class="h-5 w-5/6 rounded bg-gray-100 animate-pulse"></div>
                    <div class="h-4 w-full rounded bg-gray-100 animate-pulse"></div>
                    <div class="h-4 w-2/3 rounded bg-gray-100 animate-pulse"></div>
                  </div>
                </div>
              }
            </div>
          } @else if (store.error()) {
            <!-- Error state -->
            <div class="flex flex-col items-center gap-4 py-16 text-center">
              <p class="font-heading font-semibold text-[18px] text-ios-brand-dark">
                {{ store.error() }}
              </p>
              <button
                type="button"
                (click)="onRetry()"
                class="inline-flex items-center justify-center h-11 px-6 rounded-lg
                     bg-ios-brand-primary text-white font-heading font-semibold text-[15px]
                     hover:opacity-90 transition-opacity"
              >
                {{ lang.t('insights.retry') }}
              </button>
            </div>
          } @else if (store.isEmpty()) {
            <!-- Empty state -->
            <p class="font-heading font-medium text-[16px] text-ios-fg-7 py-16 text-center">
              {{ lang.t('insights.empty') }}
            </p>
          } @else {
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
                [disabled]="store.isLoadingMore()"
                class="inline-flex items-center justify-center gap-2 w-full h-12 rounded-lg
                     bg-white border-[1.5px] border-ios-brand-gold border-solid
                     text-[#736428] font-heading font-semibold text-[15px] transition-colors
                     disabled:opacity-60"
              >
                @if (store.isLoadingMore()) {
                  <ios-icon name="loader-circle" class="w-5 h-5 animate-spin" aria-hidden="true" />
                } @else {
                  {{ lang.t('insights.loadMore') }}
                  <ios-icon name="arrow-down" class="w-5 h-5" />
                }
              </button>
            }
          }
        </div>
      </section>

      <ios-landing-footer />
    </div>

    <!-- Scroll-to-top button (shared primitive) -->
    <ios-scroll-to-top />
  `,
})
export class InsightsPage implements OnInit {
  protected readonly store = inject(InsightsStore);
  protected readonly lang = inject(LanguageService);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly skeletons = [0, 1, 2, 3, 4, 5];

  /**
   * Reactive bridge from the FormControl's value stream to the store —
   * replaces a bare `.subscribe()` (banned in components — CLAUDE.md §4)
   * with a signal-driven effect. Debounced + de-duped so a keystroke burst
   * fires a single server-side search.
   */
  private readonly searchValue = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()),
    { initialValue: '' },
  );

  constructor() {
    effect(() => this.store.setSearchQuery(this.searchValue() ?? ''));
  }

  ngOnInit(): void {
    void this.store.load();
  }

  protected onLoadMore(): void {
    void this.store.loadMore();
  }

  protected onRetry(): void {
    void this.store.reload();
  }
}
