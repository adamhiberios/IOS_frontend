/**
 * LandingStore — signal store for the landing page.
 *
 * Holds **only the server-driven dynamic data** the landing page needs:
 *   • `hero`              — cohort date + graduate count (change each cycle)
 *   • `blogSectionBadge`  — admin-configurable section label ("Insights")
 *   • `blogPosts`         — real CMS content
 *
 * All static copy (headings, cert names, level descriptions, step text, etc.)
 * lives directly in the section components and is never routed through this
 * store. Translatable static text uses `lang.t()` inside each component;
 * structural constants (icon names, colors, prices, links) are hardcoded
 * inline in each section component.
 *
 * ## Fallback behaviour
 * When the API endpoint is not yet live (null return) or returns an error,
 * `_data` falls back to `FALLBACK_DATA` — a minimal set of static defaults
 * that let the page render correctly while the backend is being built.
 *
 * Usage (in landing.page.ts):
 *   protected readonly store = inject(LandingStore);
 *   // template: [heroDynamic]="store.hero()"
 */

import { Injectable, computed, inject, signal } from '@angular/core';

import { LandingApi } from './landing.api';
import type { BlogPost, HeroDynamicData, LandingDynamicData } from './landing.model';

// ---------------------------------------------------------------------------
// Status type
// ---------------------------------------------------------------------------

type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

// ---------------------------------------------------------------------------
// Static fallback (shown while backend is unavailable)
// ---------------------------------------------------------------------------

const FALLBACK_BLOG_POSTS: BlogPost[] = [
  {
    id: 'post-1',
    date: 'Apr 15, 2026',
    title: 'Why Employers Require Scrum Certification in 2026',
    excerpt:
      'Discover why certified Scrum professionals consistently land higher-paying roles and move up faster than their peers.',
    readTime: '5 min read',
    imageUrl: '/assets/images/blog_1.png',
    link: '/blog/why-employers-require-scrum-certification',
  },
  {
    id: 'post-2',
    date: 'Mar 28, 2026',
    title: 'Foundation vs. Practitioner: Which Level Is Right for You?',
    excerpt:
      'Not sure which certification level to start with? We break down each path so you can make a confident choice.',
    readTime: '4 min read',
    imageUrl: '/assets/images/blog_2.png',
    link: '/blog/foundation-vs-practitioner',
  },
  {
    id: 'post-3',
    date: 'Mar 10, 2026',
    title: '5 Scenario-Based Exam Questions You Should Practise',
    excerpt:
      'IOS exams go beyond definitions. Work through these five real-world scenarios to sharpen your exam readiness.',
    readTime: '6 min read',
    imageUrl: '/assets/images/blog_3.png',
    link: '/blog/5-scenario-based-exam-questions',
  },
];

const FALLBACK_DATA: LandingDynamicData = {
  hero: {
    cohortDate: 'June 2, 2026',
    graduatesCount: '12,000+',
  },
  blogSectionBadge: 'Insights',
  blogPosts: FALLBACK_BLOG_POSTS,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

@Injectable({ providedIn: 'root' })
export class LandingStore {
  private readonly api = inject(LandingApi);

  // ── Private mutable state ────────────────────────────────────────────────

  /** Live API payload — null until the backend endpoint is available. */
  private readonly _apiData = signal<LandingDynamicData | null>(null);
  private readonly _status = signal<LoadStatus>('idle');
  private readonly _error = signal<string | null>(null);

  /**
   * Resolved data: API payload when available, static fallback otherwise.
   * Downstream signals all read from here.
   */
  private readonly _data = computed<LandingDynamicData>(() => this._apiData() ?? FALLBACK_DATA);

  // ── Public read-only views ───────────────────────────────────────────────

  readonly status = this._status.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isLoading = computed(() => this._status() === 'loading');

  /** Dynamic hero fields: cohort date and graduate count. */
  readonly hero = computed<HeroDynamicData>(() => this._data().hero);

  /** Admin-controlled blog section badge label, e.g. "Insights". */
  readonly blogSectionBadge = computed<string>(() => this._data().blogSectionBadge);

  /** Live blog posts from the CMS. */
  readonly blogPosts = computed<BlogPost[]>(() => this._data().blogPosts);

  // ── Actions ──────────────────────────────────────────────────────────────

  /**
   * Attempts to load live dynamic data from the backend API.
   * Falls back to `FALLBACK_DATA` on failure or when the endpoint is not yet
   * available (null return).
   *
   * Called once from `LandingPage.ngOnInit()`.
   */
  async load(): Promise<void> {
    if (this._status() === 'loading') return;

    this._status.set('loading');
    this._error.set(null);

    try {
      const data = await this.api.getPageData();
      if (data) {
        this._apiData.set(data);
      }
      // null return = endpoint not yet live → FALLBACK_DATA remains active
      this._status.set('success');
    } catch (err) {
      this._status.set('error');
      this._error.set(err instanceof Error ? err.message : 'Failed to load landing content');
      // FALLBACK_DATA remains active — the page still renders correctly
    }
  }
}
