/**
 * LandingStore — signal store for the public landing page.
 *
 * Fetches the server-driven blocks from `GET /landing` (BE-I-20):
 *   • `featuredPrograms` — live catalog cards (title, price, link)
 *   • `stats`            — platform counters (programs / students / certs issued)
 *
 * The Scrum-Journal insight cards have **no `/landing` backing** — they render
 * from the static list this store owns. All other landing copy (headings, cert
 * levels, step text) lives directly in the section components via `lang.t()`.
 *
 * ## Fallback behaviour
 * On error the store keeps static `FALLBACK_STATS` and an empty featured list
 * (the featured section hides itself), so the page always renders.
 */

import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';

import { LandingApi } from './landing.api';
import { type PublicCertificate } from './catalog.model';
import { type InsightPost, type LandingData, type LandingStats } from './landing.model';

type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

/** Stats shown until the API responds (kept modest / non-misleading). */
const FALLBACK_STATS: LandingStats = { programs: 0, students: 0, certificatesIssued: 0 };

/** Static Scrum-Journal cards (no backend — the real blog lives in `insights`). */
const FALLBACK_INSIGHT_POSTS: InsightPost[] = [
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

  /** Static Scrum-Journal cards (not server-driven). */
  readonly insightPosts = signal<readonly InsightPost[]>(FALLBACK_INSIGHT_POSTS).asReadonly();
  /** Static section-badge label for the Scrum-Journal block. */
  readonly insightSectionBadge = signal('Insights').asReadonly();

  /**
   * Load the server-driven landing blocks. Never throws — failures surface via
   * {@link error} and the page keeps its fallbacks.
   */
  async load(): Promise<void> {
    if (this._status() === 'loading') return;
    this._status.set('loading');
    this._error.set(null);
    try {
      const data = await firstValueFrom(this.api.getPageData());
      this._data.set(data);
      this._status.set('success');
    } catch (err) {
      this._status.set('error');
      this._error.set(problemDetailMessage(err) ?? 'Failed to load landing content');
    }
  }
}
