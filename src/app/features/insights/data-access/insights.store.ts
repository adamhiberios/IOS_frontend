/**
 * InsightsStore — signal store for the insights (blog/journal) page.
 *
 * Exposes read-only signals that the insights page consumes.
 * Currently backed by static fallback data; call `load()` to replace with
 * live API data once the backend endpoint is available.
 *
 * Also supports detail view via `loadBySlug(slug)` / `currentDetail` signal.
 */

import { Injectable, computed, inject, signal } from '@angular/core';

import { InsightsApi } from './insights.api';
import type { InsightDetailPost, InsightPost, InsightsPageData } from './insights.model';

/** Fallback body used when the detail API endpoint is not yet available. */
const FALLBACK_DETAIL_BODY: InsightDetailPost['body'] = [
  {
    type: 'paragraph',
    text: 'Over the past three years, Scrum certification has undergone a quiet but seismic shift in the Canadian job market. Where hiring managers once treated it as a "nice-to-have" line on a résumé, a growing number of organizations now list it as a mandatory requirement — right alongside a degree or years of experience.',
  },
  {
    type: 'heading',
    text: 'What Changed?',
  },
  {
    type: 'paragraph',
    text: 'The pandemic accelerated remote work, which placed an enormous premium on self-organizing teams and asynchronous delivery. Companies that had never heard of a Sprint Retrospective suddenly found themselves running distributed teams across time zones. Those that leaned on Scrum came out ahead — and their competitors noticed.',
  },
  {
    type: 'quote',
    text: 'Certification is no longer a proxy for commitment. It is a proxy for a shared vocabulary — and that vocabulary is what makes remote collaboration possible.',
    attribution: 'VP Engineering, Toronto-based fintech',
  },
  {
    type: 'heading',
    text: 'The Data Behind the Trend',
  },
  {
    type: 'paragraph',
    text: 'A review of 2,400 Canadian tech job postings from Q1 2025 found that 61 % explicitly mentioned Agile or Scrum experience, up from 38 % in 2022. More striking: 29 % listed a recognized Scrum certification as a formal requirement — not merely preferred.',
  },
  {
    type: 'list',
    items: [
      'Scrum Master and Product Owner roles: certification required in 74 % of listings.',
      'Senior developer roles: Agile experience required in 55 % of listings.',
      'Project manager titles being replaced by Scrum Master in 1 in 5 new postings.',
    ],
  },
  {
    type: 'heading',
    text: 'Which Certification Levels Are Employers Looking For?',
  },
  {
    type: 'paragraph',
    text: 'Foundational certifications (IOS-SF, IOS-PF) satisfy a majority of entry-level and mid-level requirements. Practitioner-level credentials are increasingly demanded for team leads and delivery managers. Expert-level certifications remain rare requirements but carry significant salary premiums — often 15–25 % above the market median.',
  },
  {
    type: 'paragraph',
    text: 'For professionals currently weighing their next step, the calculus is straightforward: starting at the Foundation level costs far less time and money than the salary differential you capture within the first twelve months of certification.',
  },
  {
    type: 'heading',
    text: 'What This Means for You',
  },
  {
    type: 'paragraph',
    text: 'Whether you are entering the workforce, pivoting roles, or preparing for a promotion conversation, Scrum certification is now among the highest-ROI credentials available in the Canadian technology market. The Institute of Scrum exists precisely to make that credential accessible, rigorous, and recognized.',
  },
];

/** Slugs derived from FALLBACK_DATA posts, used to seed detail fallback. */
const FALLBACK_DATA: InsightsPageData = {
  posts: [
    {
      id: 'post-1',
      date: 'Apr 15, 2026',
      title: 'Why Employers Now Require Scrum Certification',
      excerpt:
        'The shift from "nice to have" to "must have" — how Canadian employers are using Scrum credentials to filter candidates.',
      readTime: '5 min read',
      imageUrl: '/assets/images/blog_1.png',
      link: '/insights/why-employers-require-scrum-certification',
    },
    {
      id: 'post-2',
      date: 'Mar 28, 2026',
      title: 'Foundation vs. Practitioner: Which Is Right for You?',
      excerpt:
        'A practical comparison of our two most popular certification levels, with guidance on choosing the right starting point.',
      readTime: '5 min read',
      imageUrl: '/assets/images/blog_2.png',
      link: '/insights/foundation-vs-practitioner',
    },
    {
      id: 'post-3',
      date: 'Mar 10, 2026',
      title: '5 Scenario-Based Questions to Expect on Exam Day',
      excerpt:
        'We break down the most commonly tested scenarios and show you how to approach them with the Scrum framework.',
      readTime: '5 min read',
      imageUrl: '/assets/images/blog_3.png',
      link: '/insights/5-scenario-based-exam-questions',
    },
    {
      id: 'post-4',
      date: 'Feb 20, 2026',
      title: 'Building High-Performance Teams with Scrum',
      excerpt:
        'Learn how Scrum principles foster collaboration, accountability, and sustained velocity across cross-functional teams.',
      readTime: '7 min read',
      imageUrl: '/assets/images/blog_1.png',
      link: '/insights/building-high-performance-teams',
    },
    {
      id: 'post-5',
      date: 'Feb 5, 2026',
      title: 'The Role of the Product Owner in Agile Transformation',
      excerpt:
        'Why strong product ownership is the linchpin of any successful Agile adoption — and how to get it right.',
      readTime: '6 min read',
      imageUrl: '/assets/images/blog_2.png',
      link: '/insights/role-of-product-owner',
    },
    {
      id: 'post-6',
      date: 'Jan 18, 2026',
      title: 'Common Scrum Anti-Patterns and How to Avoid Them',
      excerpt:
        'From zombie sprints to proxy product owners — the traps teams fall into and practical ways to course-correct.',
      readTime: '8 min read',
      imageUrl: '/assets/images/blog_3.png',
      link: '/insights/common-scrum-antipatterns',
    },
    {
      id: 'post-7',
      date: 'Jan 3, 2026',
      title: 'Scaling Scrum: From One Team to the Enterprise',
      excerpt:
        'What changes when you move beyond a single Scrum team — frameworks, coordination, and the human factors that matter most.',
      readTime: '9 min read',
      imageUrl: '/assets/images/blog_1.png',
      link: '/insights/scaling-scrum-enterprise',
    },
    {
      id: 'post-8',
      date: 'Dec 12, 2025',
      title: 'Retrospectives That Actually Drive Change',
      excerpt:
        'Move beyond "start/stop/continue" — techniques for running retros that produce real, measurable improvements.',
      readTime: '6 min read',
      imageUrl: '/assets/images/blog_2.png',
      link: '/insights/retrospectives-that-drive-change',
    },
    {
      id: 'post-9',
      date: 'Nov 28, 2025',
      title: 'Estimation in Scrum: Story Points vs. Flow Metrics',
      excerpt:
        'A data-driven look at when relative estimation helps — and when flow-based metrics give you a clearer picture.',
      readTime: '7 min read',
      imageUrl: '/assets/images/blog_3.png',
      link: '/insights/estimation-story-points-vs-flow',
    },
  ],
};

type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

@Injectable({ providedIn: 'root' })
export class InsightsStore {
  private readonly api = inject(InsightsApi);

  private readonly _data = signal<InsightsPageData>(FALLBACK_DATA);
  private readonly _status = signal<LoadStatus>('idle');
  private readonly _error = signal<string | null>(null);
  private readonly _searchQuery = signal('');
  private readonly _visibleCount = signal(6);

  private readonly _detail = signal<InsightDetailPost | null>(null);
  private readonly _detailStatus = signal<LoadStatus>('idle');

  readonly status = this._status.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isLoading = computed(() => this._status() === 'loading');
  readonly searchQuery = this._searchQuery.asReadonly();

  readonly currentDetail = this._detail.asReadonly();
  readonly isDetailLoading = computed(() => this._detailStatus() === 'loading');
  readonly detailNotFound = computed(
    () => this._detailStatus() === 'error' && this._detail() === null,
  );

  readonly allPosts = computed<InsightPost[]>(() => this._data().posts);

  readonly filteredPosts = computed<InsightPost[]>(() => {
    const posts = this.allPosts();
    const query = this._searchQuery().trim().toLowerCase();
    if (!query) return posts;
    return posts.filter(
      (p) => p.title.toLowerCase().includes(query) || p.excerpt.toLowerCase().includes(query),
    );
  });

  readonly visiblePosts = computed<InsightPost[]>(() =>
    this.filteredPosts().slice(0, this._visibleCount()),
  );

  readonly hasMore = computed(() => this._visibleCount() < this.filteredPosts().length);

  /** Up to 3 posts related to the current detail post (excludes the current one). */
  readonly relatedPosts = computed<InsightPost[]>(() => {
    const current = this._detail();
    if (!current) return [];
    return this.allPosts()
      .filter((p) => p.id !== current.id)
      .slice(0, 3);
  });

  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
    this._visibleCount.set(6);
  }

  loadMore(): void {
    this._visibleCount.update((c) => Math.min(c + 3, this.allPosts().length));
  }

  async load(): Promise<void> {
    if (this._status() === 'loading') return;

    this._status.set('loading');
    this._error.set(null);

    try {
      const data = await this.api.getPosts();
      if (data) {
        this._data.set(data);
      }
      this._status.set('success');
    } catch (err) {
      this._status.set('error');
      this._error.set(err instanceof Error ? err.message : 'Failed to load insights content');
    }
  }

  /**
   * Load a single post by its URL slug.
   *
   * ── Current state ───────────────────────────────────────────────────────
   * Backend detail endpoint not yet available. Falls back to matching the
   * slug against the list data, then injects the static body copy. When the
   * endpoint is ready, replace the null-check block with an actual API call.
   */
  async loadBySlug(slug: string): Promise<void> {
    this._detail.set(null);
    this._detailStatus.set('loading');

    // Detail endpoint isn't live yet, so we match the slug against the list payload —
    // populate it first if a deep-link arrived before the list was loaded.
    if (this._status() === 'idle') {
      await this.load();
    }

    const match = this.allPosts().find((p) => p.link === `/insights/${slug}`);
    if (!match) {
      this._detailStatus.set('error');
      return;
    }

    const detail: InsightDetailPost = {
      ...match,
      slug,
      category: 'Agile & Scrum',
      author: 'IOS Editorial Team',
      authorRole: 'Institute of Scrum',
      body: FALLBACK_DETAIL_BODY,
    };

    this._detail.set(detail);
    this._detailStatus.set('success');
  }
}
