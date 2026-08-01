/**
 * LandingStore — signal store for the public landing page.
 *
 * ## Composed from three independent sources (BE-I-30, backend `66a7632`)
 * The backend deleted the composite `GET /landing`, so this store now assembles
 * what that endpoint used to return:
 *
 *   • `stats`            — `GET /analytics/public-stats` via {@link LandingApi}
 *   • `featuredPrograms` — `GET /catalog` via the shared `PublicCatalogStore`
 *   • `insightPosts`     — `GET /blog` via the `insights` feature's `InsightsApi`
 *
 * All other landing copy (headings, cert levels, step text) lives directly in
 * the section components via `lang.t()`.
 *
 * ## Fallback behaviour
 * **Each source fails independently and none can take the page down.** A failed
 * stats call keeps `FALLBACK_STATS` (zeros — deliberately not invented numbers
 * on a public marketing page); a failed catalog load leaves the featured list
 * empty and that section hides itself; a failed or empty blog fetch keeps the
 * static insight posts. `load()` never throws.
 */

import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { InsightsApi } from '@features/insights/data-access/insights.api';

import { PublicCatalogStore } from './catalog.store';
import { LandingApi } from './landing.api';
import { type PublicCertificate } from './catalog.model';
import { type LandingStats } from './landing.model';
import type { InsightCardPost } from '../../insights/components/insights-card';

type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

/** Stats shown until the API responds (kept modest / non-misleading). */
const FALLBACK_STATS: LandingStats = { programs: 0, students: 0, certificatesIssued: 0 };

/** Number of recent articles shown in the landing "Scrum Journal" strip. */
const INSIGHT_POST_LIMIT = 3;

/**
 * How many catalog certificates the "featured" strip shows.
 *
 * The deleted `GET /landing` chose this set server-side; nothing replaced that,
 * so the choice is now the frontend's. Taking the first N of the catalog's own
 * ordering (newest-first) is the least surprising rule available without a
 * backend "featured" flag — if the product wants curation, that needs a backend
 * field, not a heuristic here.
 */
const FEATURED_PROGRAM_LIMIT = 3;

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
  private readonly catalogStore = inject(PublicCatalogStore);

  /** Live counters — null until loaded (or on error). */
  private readonly _stats = signal<LandingStats | null>(null);
  private readonly _status = signal<LoadStatus>('idle');
  private readonly _error = signal<string | null>(null);

  readonly status = this._status.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isLoading = computed(() => this._status() === 'loading');

  /**
   * Featured programs, derived from the shared catalog store rather than
   * fetched separately — the catalog is already loaded for `/certifications`,
   * so this reuses that cache instead of issuing a second request for the same
   * rows.
   */
  readonly featuredPrograms = computed<readonly PublicCertificate[]>(() =>
    this.catalogStore.items().slice(0, FEATURED_PROGRAM_LIMIT),
  );
  readonly stats = computed<LandingStats>(() => this._stats() ?? FALLBACK_STATS);

  /** Real published articles from `GET /blog`, falling back to static demo posts. */
  private readonly _insightPosts = signal<readonly InsightCardPost[]>(FALLBACK_INSIGHT_POSTS);
  readonly insightPosts = this._insightPosts.asReadonly();
  /** Static section-badge label for the Scrum-Journal block. */
  readonly insightSectionBadge = signal('Insights').asReadonly();

  /**
   * Load the three server-driven landing blocks in parallel. **Never throws**,
   * and one source failing never suppresses another: `allSettled` is used
   * rather than `all` precisely so a catalog outage can't blank the counters,
   * or a stats outage the featured strip. `status`/`error` track the counters
   * only — the other two carry their own fallbacks.
   */
  async load(): Promise<void> {
    if (this._status() === 'loading') return;
    this._status.set('loading');
    this._error.set(null);

    const [statsResult] = await Promise.allSettled([
      firstValueFrom(this.api.getPublicStats()),
      this.catalogStore.load(),
      this.loadInsightPosts(),
    ]);

    if (statsResult.status === 'fulfilled') {
      this._stats.set(statsResult.value);
      this._status.set('success');
    } else {
      this._status.set('error');
      this._error.set(
        problemDetailMessage(statsResult.reason) ?? 'Failed to load landing content',
      );
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
