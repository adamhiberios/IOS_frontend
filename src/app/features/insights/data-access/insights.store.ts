/**
 * InsightsStore — signal store for the public blog (`BE-I-11`).
 *
 * Backs the listing grid and the article detail view with live data from the
 * `GET /blog` (cursor-paginated) and `GET /blog/:slug` endpoints. Search is
 * server-side (`?search=`, English title); the list is an infinite cursor feed
 * that keeps the backend's `published_at DESC` order (no client resort). The
 * detail endpoint 404s for draft/archived/unknown slugs, which surfaces as
 * {@link detailNotFound}.
 *
 * Components read signals only; all logic lives here (CLAUDE.md §5).
 */

import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { type Page, problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { InsightsApi } from './insights.api';
import { type InsightDetailPost, type InsightPost } from './insights.model';

/** Articles fetched per page. */
const PAGE_LIMIT = 9;

type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

@Injectable({ providedIn: 'root' })
export class InsightsStore {
  private readonly api = inject(InsightsApi);
  private readonly lang = inject(LanguageService);

  private readonly _items = signal<readonly InsightPost[]>([]);
  private readonly _cursor = signal<string | null>(null);
  private readonly _hasMore = signal(false);
  private readonly _status = signal<LoadStatus>('idle');
  private readonly _loadingMore = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _search = signal('');

  /** Guards against out-of-order responses when the search term changes fast. */
  private reqSeq = 0;

  private readonly _detail = signal<InsightDetailPost | null>(null);
  private readonly _detailStatus = signal<LoadStatus>('idle');
  private readonly _detailError = signal<string | null>(null);

  readonly status = this._status.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isLoading = computed(() => this._status() === 'loading');
  readonly isLoadingMore = this._loadingMore.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly searchQuery = this._search.asReadonly();

  readonly visiblePosts = this._items.asReadonly();
  readonly isEmpty = computed(() => this._status() === 'success' && this._items().length === 0);

  readonly currentDetail = this._detail.asReadonly();
  readonly detailError = this._detailError.asReadonly();
  readonly isDetailLoading = computed(() => this._detailStatus() === 'loading');
  readonly detailNotFound = computed(
    () => this._detailStatus() === 'error' && this._detail() === null,
  );

  /** Up to 3 loaded articles related to the current detail post (excludes it). */
  readonly relatedPosts = computed<readonly InsightPost[]>(() => {
    const current = this._detail();
    if (!current) return [];
    return this._items()
      .filter((p) => p.slug !== current.slug)
      .slice(0, 3);
  });

  /** Update the server-side search term and refetch the first page (no-op if unchanged). */
  setSearchQuery(query: string): void {
    const next = query.trim();
    if (next === this._search()) return;
    this._search.set(next);
    void this.load(true);
  }

  /**
   * Load the first page for the current search term. Skips a redundant fetch
   * when already loaded unless `force` is passed (search change / retry).
   */
  async load(force = false): Promise<void> {
    if (!force && (this._status() === 'loading' || this._status() === 'success')) return;

    const seq = ++this.reqSeq;
    this._status.set('loading');
    this._error.set(null);

    try {
      const page = await this.fetchPage(null);
      if (seq !== this.reqSeq) return; // superseded by a newer search/reload
      this._items.set(page.items);
      this._cursor.set(page.nextCursor);
      this._hasMore.set(page.hasMore);
      this._status.set('success');
    } catch (err) {
      if (seq !== this.reqSeq) return;
      this._items.set([]);
      this._hasMore.set(false);
      this._status.set('error');
      this._error.set(problemDetailMessage(err) ?? this.lang.t('insights.loadError'));
    }
  }

  /** Retry after an error. */
  async reload(): Promise<void> {
    await this.load(true);
  }

  /** Fetch and append the next cursor page. No-op when nothing more to load. */
  async loadMore(): Promise<void> {
    if (this._loadingMore() || !this._hasMore()) return;
    const cursor = this._cursor();
    if (!cursor) return;

    const seq = this.reqSeq;
    this._loadingMore.set(true);
    try {
      const page = await this.fetchPage(cursor);
      if (seq !== this.reqSeq) return; // a search/reload happened meanwhile
      this._items.update((items) => [...items, ...page.items]);
      this._cursor.set(page.nextCursor);
      this._hasMore.set(page.hasMore);
    } catch (err) {
      if (seq !== this.reqSeq) return;
      this._error.set(problemDetailMessage(err) ?? this.lang.t('insights.loadError'));
    } finally {
      if (seq === this.reqSeq) this._loadingMore.set(false);
    }
  }

  /**
   * Load a single article by slug. A 404 (draft/archived/unknown) resolves to
   * {@link detailNotFound}. Also warms the list so related articles can render
   * on a cold deep-link.
   */
  async loadBySlug(slug: string): Promise<void> {
    this._detail.set(null);
    this._detailStatus.set('loading');
    this._detailError.set(null);

    if (this._status() === 'idle') void this.load();

    try {
      const detail = await firstValueFrom(this.api.getBySlug(slug));
      this._detail.set(detail);
      this._detailStatus.set('success');
    } catch (err) {
      this._detail.set(null);
      this._detailStatus.set('error');
      this._detailError.set(problemDetailMessage(err) ?? this.lang.t('insights.loadError'));
    }
  }

  private fetchPage(cursor: string | null): Promise<Page<InsightPost>> {
    return firstValueFrom(
      this.api.list({
        search: this._search() || undefined,
        cursor: cursor ?? undefined,
        limit: PAGE_LIMIT,
      }),
    );
  }
}
