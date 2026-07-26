/**
 * LandingStore — signal store for the public landing page.
 *
 * Fetches the server-driven blocks from `GET /landing` (BE-I-20):
 *   • `featuredPrograms` — live catalog cards (title, price, link)
 *   • `stats`            — platform counters (programs / students / certs issued)
 *
 * The Scrum-Journal insight cards are **not** part of the `/landing` payload —
 * this store fetches the 3 most recent published articles straight from the
 * public blog (`GET /blog`) via the `insights` feature's `InsightsApi`/mapper,
 * so the section always shows real content. All other landing copy (headings,
 * cert levels, step text) lives directly in the section components via `lang.t()`.
 *
 * ## Fallback behaviour
 * On error the store keeps static `FALLBACK_STATS` and an empty featured list
 * (the featured section hides itself). Insight posts fall back to a small
 * static set — independently of the `/landing` call — when the blog has
 * nothing published yet or the request fails, so the page always renders.
 */

import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { InsightsApi } from '@features/insights/data-access/insights.api';

import { LandingApi } from './landing.api';
import { type PublicCertificate } from './catalog.model';
import { type LandingData, type LandingStats } from './landing.model';
import type { InsightCardPost } from '../../insights/components/insights-card';

type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

/** Stats shown until the API responds (kept modest / non-misleading). */
const FALLBACK_STATS: LandingStats = { programs: 0, students: 0, certificatesIssued: 0 };

/** Number of recent articles shown in the landing "Scrum Journal" strip. */
const INSIGHT_POST_LIMIT = 3;

/** Shown only if the blog has nothing published yet, or `GET /blog` fails. */
const FALLBACK_INSIGHT_POSTS: InsightCardPost[] = [
  {
    id: 'post-1',
    date: 'Apr 15, 2026',
    title: 'Why Employers Require Scrum Certification in 2026',
    excerpt:
      'Discover why certified Scrum professionals consistently land higher-paying roles and move up faster than their peers.',
    readTime: '5 min read',
    imageUrl: '/assets/images/blog_1.png',
    link: '/insights/why-employers-require-scrum-certification',
  },
  {
    id: 'post-2',
    date: 'Mar 28, 2026',
    title: 'Foundation vs. Practitioner: Which Level Is Right for You?',
    excerpt:
      'Not sure which certification level to start with? We break down each path so you can make a confident choice.',
    readTime: '4 min read',
    imageUrl: '/assets/images/blog_2.png',
    link: '/insights/foundation-vs-practitioner',
  },
  {
    id: 'post-3',
    date: 'Mar 10, 2026',
    title: '5 Scenario-Based Exam Questions You Should Practise',
    excerpt:
      'IOS exams go beyond definitions. Work through these five real-world scenarios to sharpen your exam readiness.',
    readTime: '6 min read',
    imageUrl: '/assets/images/blog_3.png',
    link: '/insights/5-scenario-based-exam-questions',
  },
];

@Injectable({ providedIn: 'root' })
export class LandingStore {
  private readonly api = inject(LandingApi);
  private readonly insightsApi = inject(InsightsApi);

  /** Live `/landing` payload — null until loaded (or on error). */
  private readonly _data = signal<LandingData | null>(null);
  private readonly _status = signal<LoadStatus>('idle');
  private readonly _error = signal<string | null>(null);

  readonly status = this._status.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isLoading = computed(() => this._status() === 'loading');

  readonly featuredPrograms = computed<readonly PublicCertificate[]>(
    () => this._data()?.featuredPrograms ?? [],
  );
  readonly stats = computed<LandingStats>(() => this._data()?.stats ?? FALLBACK_STATS);

  /** Real published articles from `GET /blog`, falling back to static demo posts. */
  private readonly _insightPosts = signal<readonly InsightCardPost[]>(FALLBACK_INSIGHT_POSTS);
  readonly insightPosts = this._insightPosts.asReadonly();
  /** Static section-badge label for the Scrum-Journal block. */
  readonly insightSectionBadge = signal('Insights').asReadonly();

  /**
   * Load the server-driven landing blocks (`/landing` + the latest blog
   * posts). Never throws — failures surface via {@link error} (for the
   * `/landing` call) and the page keeps its fallbacks; a failed/empty blog
   * fetch is silently absorbed by {@link loadInsightPosts} since the journal
   * strip has always had a static fallback.
   */
  async load(): Promise<void> {
    if (this._status() === 'loading') return;
    this._status.set('loading');
    this._error.set(null);
    try {
      const [data] = await Promise.all([
        firstValueFrom(this.api.getPageData()),
        this.loadInsightPosts(),
      ]);
      this._data.set(data);
      this._status.set('success');
    } catch (err) {
      this._status.set('error');
      this._error.set(problemDetailMessage(err) ?? 'Failed to load landing content');
    }
  }

  /**
   * Fetch the most recent published articles for the landing page. Keeps the
   * static {@link FALLBACK_INSIGHT_POSTS} when the blog has nothing published
   * or the request fails — this never throws, so it can't fail {@link load}.
   */
  private async loadInsightPosts(): Promise<void> {
    try {
      const page = await firstValueFrom(this.insightsApi.list({ limit: INSIGHT_POST_LIMIT }));
      if (page.items.length > 0) this._insightPosts.set(page.items);
    } catch {
      // Keep the static fallback — the journal strip should never block the page.
    }
  }
}
