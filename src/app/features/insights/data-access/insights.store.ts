/**
 * InsightsStore — signal store for the insights (blog/journal) page.
 *
 * Exposes read-only signals that the insights page consumes.
 * Currently backed by static fallback data; call `load()` to replace with
 * live API data once the backend endpoint is available.
 */

import { Injectable, computed, inject, signal } from '@angular/core';

import { InsightsApi } from './insights.api';
import type { InsightPost, InsightsPageData } from './insights.model';

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

  readonly status = this._status.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isLoading = computed(() => this._status() === 'loading');
  readonly searchQuery = this._searchQuery.asReadonly();

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
}
