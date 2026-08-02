/**
 * `ios-insight-detail-page` — full article view for a single blog post.
 *
 * Route: /insights/:slug  →  `GET /blog/:slug`.
 *
 * The body arrives as `contentHtml` (admin-authored) and is rendered through
 * Angular's built-in `[innerHTML]` sanitizer (`SecurityContext.HTML`) — the
 * allow-list required by CLAUDE.md §4. We never call `bypassSecurityTrust*`.
 * A 404 (draft / archived / unknown slug) shows the not-found state.
 *
 * Structure (top → bottom):
 *   1. Navbar
 *   2. Hero banner  — dark bg, breadcrumb (Home / Insights), title, byline
 *   3. Article body — featured image (overlaps hero), sanitized HTML content
 *   4. You Might Also Enjoy — related posts
 *   5. Footer
 *   6. Scroll-to-top floating button
 */

import {
  ChangeDetectionStrategy,
  Component,
  type OnDestroy,
  type OnInit,
  effect,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { LucideArrowLeft, LucideClock, LucideUser } from '@lucide/angular';

import { LanguageService } from '@core/i18n';
import { JsonLdService } from '@core/seo';
import { IosIcon, ScrollToTop, provideIcons } from '@ui';

import { LandingNavbar } from '../../landing/components/landing-navbar';
import { LandingFooter } from '../../landing/components/landing-footer';
import { InsightsCard } from '../components/insights-card';
import { InsightsStore } from '../data-access/insights.store';

@Component({
  selector: 'ios-insight-detail-page',
  imports: [
    LandingNavbar,
    LandingFooter,
    InsightsCard,
    RouterLink,
    NgOptimizedImage,
    IosIcon,
    ScrollToTop,
  ],
  providers: [provideIcons(LucideArrowLeft, LucideClock, LucideUser)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      /* Prose styling for admin-authored article HTML injected via [innerHTML].
         ::ng-deep pierces view encapsulation to reach the sanitized children;
         scoped under .ios-blog-prose so it never leaks to the rest of the app. */
      .ios-blog-prose {
        font-family: var(--font-body, sans-serif);
        font-size: 16px;
        line-height: 1.75;
        color: var(--color-ios-fg-mid, #535453);
      }
      .ios-blog-prose ::ng-deep h1,
      .ios-blog-prose ::ng-deep h2,
      .ios-blog-prose ::ng-deep h3,
      .ios-blog-prose ::ng-deep h4 {
        font-family: var(--font-heading, sans-serif);
        font-weight: 800;
        line-height: 1.3;
        color: var(--color-ios-brand-dark, #272827);
        margin-block: 1.5rem 0.75rem;
      }
      .ios-blog-prose ::ng-deep h1 {
        font-size: 28px;
      }
      .ios-blog-prose ::ng-deep h2 {
        font-size: 24px;
      }
      .ios-blog-prose ::ng-deep h3 {
        font-size: 20px;
      }
      .ios-blog-prose ::ng-deep p {
        margin-block: 0 1.25rem;
      }
      .ios-blog-prose ::ng-deep a {
        color: var(--color-ios-brand-primary, #8b0000);
        text-decoration: underline;
      }
      .ios-blog-prose ::ng-deep ul,
      .ios-blog-prose ::ng-deep ol {
        margin-block: 0 1.25rem;
        padding-inline-start: 1.5rem;
      }
      .ios-blog-prose ::ng-deep ul {
        list-style: disc;
      }
      .ios-blog-prose ::ng-deep ol {
        list-style: decimal;
      }
      .ios-blog-prose ::ng-deep li {
        margin-block: 0.35rem;
      }
      .ios-blog-prose ::ng-deep blockquote {
        margin-block: 1.25rem;
        padding: 1rem 1.5rem;
        border-inline-start: 4px solid var(--color-ios-brand-gold, #d9bd4c);
        border-radius: 0.75rem;
        background: var(--color-ios-brand-gold-soft, #fff9f0);
        font-family: var(--font-heading, sans-serif);
        font-style: italic;
        color: #736428;
      }
      .ios-blog-prose ::ng-deep img {
        max-width: 100%;
        height: auto;
        border-radius: 0.75rem;
        margin-block: 1.25rem;
      }
      .ios-blog-prose ::ng-deep strong {
        font-weight: 700;
        color: var(--color-ios-brand-dark, #272827);
      }
      .ios-blog-prose ::ng-deep code {
        font-family: ui-monospace, monospace;
        font-size: 0.9em;
        background: #f3f4f6;
        padding: 0.1rem 0.35rem;
        border-radius: 0.25rem;
      }
    `,
  ],
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
              <!-- Byline: author · date · read time -->
              <div class="flex items-center gap-4 mt-3 flex-wrap">
                @if (post.authorName) {
                  <div class="flex items-center gap-1.5">
                    <ios-icon name="user" class="w-4 h-4 text-ios-brand-gold" aria-hidden="true" />
                    <span class="text-[13px] font-body text-white/70">{{ post.authorName }}</span>
                  </div>
                }
                @if (post.date) {
                  <span class="text-[13px] font-body text-white/40">{{ post.date }}</span>
                }
                <div class="flex items-center gap-1.5">
                  <ios-icon name="clock" class="w-4 h-4 text-ios-brand-gold" aria-hidden="true" />
                  <span class="text-[13px] font-body text-white/70">{{
                    lang.t('insights.minRead', { count: post.readMinutes })
                  }}</span>
                </div>
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

        <!-- Sanitized article body -->
        <div class="px-6 md:px-16 lg:px-[120px] pt-12">
          <div class="ios-blog-prose max-w-4xl mx-auto" [innerHTML]="post.contentHtml"></div>
        </div>
      </article>
    }

    <!-- 4. You Might Also Enjoy -->
    @if (store.relatedPosts().length > 0) {
      <section class="bg-[#FFFCEE] py-16 px-6 md:px-16 lg:px-[120px]">
        <div class="max-w-4xl mx-auto">
          <!-- Section header -->
          <div class="flex flex-col gap-2 mb-10">
            <h2 class="font-heading font-extrabold text-[24px]">
              <span class="text-ios-fg">{{ lang.t('insight.detail.youMightAlsoEnjoyPart1') }}</span
              ><span class="text-ios-brand-primary">{{
                lang.t('insight.detail.youMightAlsoEnjoyPart2')
              }}</span>
            </h2>
            <div class="w-10 h-1 rounded-full bg-ios-brand-gold"></div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            @for (related of store.relatedPosts(); track related.id) {
              <ios-insights-card [post]="related" />
            }
          </div>
        </div>
      </section>
    }

    <!-- 5. Footer -->
    <ios-landing-footer />

    <!-- 6. Scroll-to-top (shared primitive) -->
    <ios-scroll-to-top />
  `,
})
export class InsightDetailPage implements OnInit, OnDestroy {
  protected readonly store = inject(InsightsStore);
  protected readonly lang = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  private readonly jsonLd = inject(JsonLdService);

  constructor() {
    // Mirrors the loaded article's structured data into the shared JSON-LD
    // <script> tag. Absent (older backend / mid-load) → leave whatever is
    // already there alone rather than briefly clearing it.
    effect(() => {
      const jsonLd = this.store.currentDetail()?.seo.jsonLd;
      if (jsonLd) {
        this.jsonLd.set(jsonLd);
      }
    });
  }

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    void this.store.loadBySlug(slug);
  }

  ngOnDestroy(): void {
    this.jsonLd.clear();
  }
}
