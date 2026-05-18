/**
 * `ios-insight-detail-page` — full article view for a single Insights post.
 *
 * Route: /insights/:slug
 *
 * Structure (top → bottom):
 *   1. Navbar
 *   2. Hero banner  — dark #272827 bg, breadcrumb (Home / Insights), title, read time
 *   3. Article body — featured image (overlaps hero by ~half), content blocks
 *   4. You Might Also Enjoy — related posts on #FFFCEE bg
 *   5. Footer
 *   6. Scroll-to-top floating button
 */

import { ChangeDetectionStrategy, Component, type OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { LucideArrowLeft, LucideArrowUp, LucideClock } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { IosIcon, provideIcons } from '@ui';

import { LandingNavbar } from '../../landing/components/landing-navbar';
import { LandingFooter } from '../../landing/components/landing-footer';
import { InsightsCard } from '../components/insights-card';
import { InsightsStore } from '../data-access/insights.store';

@Component({
  selector: 'ios-insight-detail-page',
  imports: [LandingNavbar, LandingFooter, InsightsCard, RouterLink, NgOptimizedImage, IosIcon],
  providers: [provideIcons(LucideArrowLeft, LucideArrowUp, LucideClock)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- 1. Navbar -->
    <ios-landing-navbar />

    <!-- 2. Hero banner -->
    <section class="relative bg-ios-fg overflow-hidden">
      <!-- Decorative circles -->
      <div
        class="absolute top-[-157px] end-[-160px] w-[320px] h-[320px] rounded-full bg-white/5"
        aria-hidden="true"
      ></div>
      <div
        class="absolute bottom-[-127px] start-[-128px] w-[256px] h-[256px] rounded-full bg-white/5"
        aria-hidden="true"
      ></div>

      <div class="relative px-6 md:px-16 lg:px-[120px] pt-14 pb-[200px]">
        <div class="flex items-start gap-3">
          <!-- Back button -->
          <a
            routerLink="/insights"
            class="flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 shrink-0 mt-1"
            [attr.aria-label]="lang.t('insight.detail.back')"
          >
            <ios-icon name="arrow-left" class="w-5 h-5 text-white" />
          </a>

          <div class="flex flex-col gap-1 min-w-0">
            <!-- Breadcrumb — Home / Insights only -->
            <div
              class="flex items-center gap-2 text-sm font-heading font-medium text-white/60 flex-wrap"
            >
              <a routerLink="/" class="hover:text-white transition-colors">
                {{ lang.t('insight.detail.breadcrumb.home') }}
              </a>
              <span>/</span>
              <a routerLink="/insights" class="hover:text-white transition-colors">
                {{ lang.t('insight.detail.breadcrumb.insights') }}
              </a>
            </div>

            <!-- Title -->
            @if (store.isDetailLoading()) {
              <div class="h-7 w-64 rounded-md bg-white/20 animate-pulse mt-1"></div>
              <div class="h-4 w-24 rounded-md bg-white/10 animate-pulse mt-3"></div>
            } @else if (store.currentDetail(); as post) {
              <h1
                class="font-heading font-semibold text-[24px] leading-[1.3] text-white mt-1 max-w-2xl"
              >
                {{ post.title }}
              </h1>
              <!-- Read time under title -->
              <div class="flex items-center gap-1.5 mt-3">
                <ios-icon name="clock" class="w-4 h-4 text-ios-brand-gold" aria-hidden="true" />
                <span class="text-[13px] font-body text-white/70">{{ post.readTime }}</span>
              </div>
            }
          </div>
        </div>
      </div>
    </section>

    <!-- 3. Article body -->
    @if (store.isDetailLoading()) {
      <!-- Skeleton loader -->
      <section class="px-6 md:px-16 lg:px-[120px] py-16 bg-white">
        <div class="max-w-3xl mx-auto flex flex-col gap-6">
          <div class="w-full aspect-[16/7] rounded-xl bg-gray-100 animate-pulse"></div>
          <div class="h-4 w-1/3 rounded bg-gray-100 animate-pulse"></div>
          <div class="h-4 w-full rounded bg-gray-100 animate-pulse"></div>
          <div class="h-4 w-5/6 rounded bg-gray-100 animate-pulse"></div>
          <div class="h-4 w-full rounded bg-gray-100 animate-pulse"></div>
          <div class="h-4 w-4/6 rounded bg-gray-100 animate-pulse"></div>
        </div>
      </section>
    } @else if (store.detailNotFound()) {
      <!-- 404 state -->
      <section class="px-6 md:px-16 lg:px-[120px] py-24 bg-white text-center">
        <p class="font-heading font-semibold text-[20px] text-ios-brand-dark mb-4">
          {{ lang.t('insight.detail.notFound') }}
        </p>
        <a
          routerLink="/insights"
          class="inline-flex items-center gap-2 text-ios-brand-primary font-heading font-medium hover:underline"
        >
          <ios-icon name="arrow-left" class="w-4 h-4" />
          {{ lang.t('insight.detail.backToInsights') }}
        </a>
      </section>
    } @else if (store.currentDetail(); as post) {
      <article class="bg-white pb-20">
        <!-- Featured image — pulled up to overlap the hero by ~half the image height -->
        <div class="w-full px-6 md:px-16 lg:px-[120px] -mt-[180px] relative z-10">
          <div class="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-lg">
            <img
              [ngSrc]="post.imageUrl"
              [alt]="post.title"
              width="896"
              height="448"
              class="w-full aspect-[16/7] object-cover"
              loading="eager"
              decoding="async"
            />
          </div>
        </div>

        <!-- Body content blocks -->
        <div class="px-6 md:px-16 lg:px-[120px] pt-12">
          <div class="max-w-4xl mx-auto flex flex-col gap-6">
            @for (block of post.body; track $index) {
              @switch (block.type) {
                @case ('heading') {
                  <h2
                    class="font-heading font-extrabold text-[22px] md:text-[26px] leading-snug text-ios-brand-dark mt-4"
                  >
                    {{ block.text }}
                  </h2>
                }
                @case ('paragraph') {
                  <p class="font-body font-normal text-[16px] leading-[1.75] text-ios-fg-mid">
                    {{ block.text }}
                  </p>
                }
                @case ('quote') {
                  <blockquote
                    class="relative border-s-4 border-ios-brand-gold rounded-xl bg-[#FFFCEE] ps-6 pe-6 py-5 my-2"
                  >
                    <p
                      class="font-heading font-semibold italic text-[17px] leading-relaxed text-[#736428]"
                    >
                      "{{ block.text }}"
                    </p>
                    @if (block.attribution) {
                      <footer class="mt-3 text-[13px] font-body text-[#736428]/80">
                        — {{ block.attribution }}
                      </footer>
                    }
                  </blockquote>
                }
                @case ('list') {
                  <ul class="flex flex-col gap-3 ps-2">
                    @for (item of block.items; track $index) {
                      <li class="flex items-start gap-3">
                        <span
                          class="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-ios-brand-primary"
                          aria-hidden="true"
                        ></span>
                        <span class="font-body text-[16px] leading-[1.7] text-ios-fg-mid">{{
                          item
                        }}</span>
                      </li>
                    }
                  </ul>
                }
              }
            }
          </div>
        </div>
      </article>
    }

    <!-- 5. You Might Also Enjoy -->
    @if (store.relatedPosts().length > 0) {
      <section class="bg-[#FFFCEE] py-16 px-6 md:px-16 lg:px-[120px]">
        <div class="max-w-4xl mx-auto">
          <!-- Section header -->
          <div class="flex flex-col gap-2 mb-10">
            <h2 class="font-heading font-extrabold text-[24px]">
              <span class="text-ios-fg">{{ lang.t('insight.detail.youMightAlsoEnjoyPart1') }}</span
              ><span class="text-ios-brand-primary">{{ lang.t('insight.detail.youMightAlsoEnjoyPart2') }}</span>
            </h2>
            <div class="w-10 h-1 rounded-full bg-ios-brand-gold"></div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            @for (post of store.relatedPosts(); track post.id) {
              <ios-insights-card [post]="post" />
            }
          </div>
        </div>
      </section>
    }

    <!-- 6. Footer -->
    <ios-landing-footer />

    <!-- 7. Scroll-to-top -->
    <button
      (click)="scrollToTop()"
      class="fixed bottom-8 end-8 z-50 flex items-center justify-center w-11 h-11 rounded-full border-2 border-ios-brand-primary-soft bg-ios-brand-primary-soft hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ios-brand-primary/50"
      [attr.aria-label]="lang.t('insight.detail.scrollToTop')"
    >
      <ios-icon name="arrow-up" class="w-5 h-5 text-ios-brand-primary" />
    </button>
  `,
})
export class InsightDetailPage implements OnInit {
  protected readonly store = inject(InsightsStore);
  protected readonly lang = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    void this.store.loadBySlug(slug);
  }

  protected scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
