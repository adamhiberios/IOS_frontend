/**
 * PublicSearchStore — state for the navbar's global search dialog, backed by
 * `GET /search` (IDD-321).
 *
 * Results are relevance-ordered and offset-paginated (the backend caps
 * `offset` at 100). Changing the query or the type filter restarts from the
 * first page; out-of-order responses are dropped via a request sequence.
 *
 * The backend's result `url` is a path from its own `PublicUrlService`, which
 * doesn't always match this app's routes (certificates are addressed by UUID
 * there, by program code here; learner content lives under `/student/*` there,
 * `/dashboard/certificates/*` here). {@link resolveRoute} bridges the two.
 *
 * Components read signals only; all logic lives here (CLAUDE.md §5).
 */

import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';
import { CoursesApi } from '@features/courses/data-access/courses.api';
import { type CourseProgress } from '@features/courses/data-access/courses.model';

import { PublicCatalogStore } from './catalog.store';
import { PublicSearchApi } from './search.api';
import { type SearchResult, type SearchResultType } from './search.model';

/** Results fetched per page. */
const PAGE_LIMIT = 10;
/** Backend `MAX_SEARCH_OFFSET` — deeper pages are rejected with a 400. */
const MAX_OFFSET = 100;
/** Backend `MIN_QUERY_LENGTH`. */
export const MIN_SEARCH_QUERY_LENGTH = 2;

/**
 * Certificate marketing pages that exist as routes (`landing.routes.ts`).
 * A certificate outside this set falls back to the catalogue page.
 */
const CERT_MARKETING_CODES = new Set(['esm', 'esm-p', 'esm-a', 'epo', 'epo-p', 'epo-a', 'esf']);

type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

@Injectable({ providedIn: 'root' })
export class PublicSearchStore {
  private readonly api = inject(PublicSearchApi);
  private readonly coursesApi = inject(CoursesApi);
  private readonly catalog = inject(PublicCatalogStore);
  private readonly lang = inject(LanguageService);

  private readonly _query = signal('');
  private readonly _type = signal<SearchResultType | null>(null);
  private readonly _items = signal<readonly SearchResult[]>([]);
  private readonly _countsByType = signal<Partial<Record<SearchResultType, number>>>({});
  private readonly _total = signal(0);
  private readonly _hasMore = signal(false);
  private readonly _status = signal<SearchStatus>('idle');
  private readonly _loadingMore = signal(false);
  private readonly _error = signal<string | null>(null);

  /** Guards against out-of-order responses when the query changes fast. */
  private reqSeq = 0;

  readonly query = this._query.asReadonly();
  readonly activeType = this._type.asReadonly();
  readonly items = this._items.asReadonly();
  readonly countsByType = this._countsByType.asReadonly();
  readonly total = this._total.asReadonly();
  readonly status = this._status.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isLoading = computed(() => this._status() === 'loading');
  readonly isLoadingMore = this._loadingMore.asReadonly();
  /** The next page starts at `items().length`, which must stay within the backend's offset cap. */
  readonly hasMore = computed(() => this._hasMore() && this._items().length <= MAX_OFFSET);
  readonly isEmpty = computed(() => this._status() === 'success' && this._items().length === 0);

  /** Sum across every type — the "All" chip keeps its count while a type is selected. */
  readonly totalAcrossTypes = computed(() =>
    Object.values(this._countsByType()).reduce((sum, n) => sum + (n ?? 0), 0),
  );

  /**
   * Update the query and refetch from the first page (no-op if unchanged).
   * Clears the type filter: the per-type counts only come back unfiltered, so
   * a filtered search could never refresh the other chips for the new query.
   */
  setQuery(raw: string): void {
    const next = raw.trim();
    if (next === this._query()) return;
    this._query.set(next);
    this._type.set(null);
    void this.search();
  }

  /** Restrict results to one type, or `null` for all. */
  setType(type: SearchResultType | null): void {
    if (type === this._type()) return;
    this._type.set(type);
    void this.search();
  }

  /** Retry after an error. */
  retry(): void {
    void this.search();
  }

  /** Forget the previous search — called when the dialog closes. */
  reset(): void {
    this.reqSeq++;
    this._query.set('');
    this._type.set(null);
    this._items.set([]);
    this._countsByType.set({});
    this._total.set(0);
    this._hasMore.set(false);
    this._status.set('idle');
    this._loadingMore.set(false);
    this._error.set(null);
  }

  /** Fetch and append the next page. */
  async loadMore(): Promise<void> {
    if (this._loadingMore() || !this.hasMore()) return;
    const offset = this._items().length;
    if (offset > MAX_OFFSET) return;

    const seq = this.reqSeq;
    this._loadingMore.set(true);
    try {
      const page = await firstValueFrom(
        this.api.search({ q: this._query(), types: this.typesFilter(), limit: PAGE_LIMIT, offset }),
      );
      if (seq !== this.reqSeq) return;
      this._items.update((items) => [...items, ...page.items]);
      this._hasMore.set(page.hasMore);
    } catch (err) {
      if (seq !== this.reqSeq) return;
      this._error.set(problemDetailMessage(err) ?? this.lang.t('landing.search.error'));
    } finally {
      if (seq === this.reqSeq) this._loadingMore.set(false);
    }
  }

  /**
   * The app route for a result. Never throws: a lookup that fails falls back
   * to the nearest listing page rather than a broken link.
   */
  async resolveRoute(result: SearchResult): Promise<string> {
    const url = result.url;
    // Only ever navigate within the app — the backend promises relative paths.
    if (!url.startsWith('/') || url.startsWith('//')) return '/';

    const [, root, section, id] = url.split('/');

    if (root === 'certifications' && section) return this.certificateRoute(section);
    if (root === 'student' && section === 'certs' && id) return this.enrolledCertRoute(id);
    if (root === 'student' && section === 'lessons' && id) return this.lessonRoute(id);
    return url;
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private async search(): Promise<void> {
    const seq = ++this.reqSeq;
    const q = this._query();
    this._loadingMore.set(false);
    this._error.set(null);

    if (q.length < MIN_SEARCH_QUERY_LENGTH) {
      this._items.set([]);
      this._countsByType.set({});
      this._total.set(0);
      this._hasMore.set(false);
      this._status.set('idle');
      return;
    }

    this._status.set('loading');
    try {
      const page = await firstValueFrom(
        this.api.search({ q, types: this.typesFilter(), limit: PAGE_LIMIT, offset: 0 }),
      );
      if (seq !== this.reqSeq) return;
      this._items.set(page.items);
      this._total.set(page.total);
      this._hasMore.set(page.hasMore);
      // With a type selected the backend only counts that type; keep the
      // unfiltered counts so the other chips don't vanish.
      if (!this._type()) this._countsByType.set(page.countsByType);
      this._status.set('success');
    } catch (err) {
      if (seq !== this.reqSeq) return;
      this._items.set([]);
      this._hasMore.set(false);
      this._status.set('error');
      this._error.set(problemDetailMessage(err) ?? this.lang.t('landing.search.error'));
    }
  }

  private typesFilter(): SearchResultType[] | undefined {
    const type = this._type();
    return type ? [type] : undefined;
  }

  /** `/certifications/<uuid>` → `/certifications/<code>` (marketing pages are code-addressed). */
  private async certificateRoute(certId: string): Promise<string> {
    await this.catalog.load();
    const code = this.catalog
      .items()
      .find((c) => c.id === certId)
      ?.programCode.toLowerCase();
    return code && CERT_MARKETING_CODES.has(code) ? `/certifications/${code}` : '/certifications';
  }

  /** `/student/certs/<certId>` → `/dashboard/certificates/<CODE>`. */
  private async enrolledCertRoute(certId: string): Promise<string> {
    const code = (await this.enrolledProgress()).find((p) => p.certId === certId)?.programCode;
    return code ? `/dashboard/certificates/${code}` : '/dashboard/certificates';
  }

  /**
   * `/student/lessons/<lessonId>` → `/dashboard/certificates/<CODE>/session/<lessonId>`.
   * A lesson carries no certificate id, so walk the learner's (few) enrolled
   * curricula to find the one containing it.
   */
  private async lessonRoute(lessonId: string): Promise<string> {
    for (const progress of await this.enrolledProgress()) {
      try {
        const curriculum = await firstValueFrom(this.coursesApi.getCurriculum(progress.certId));
        const found = curriculum.modules.some((m) => m.lessons.some((l) => l.id === lessonId));
        if (found) return `/dashboard/certificates/${progress.programCode}/session/${lessonId}`;
      } catch {
        // Skip a curriculum that fails to load; try the next enrolment.
      }
    }
    return '/dashboard/certificates';
  }

  private async enrolledProgress(): Promise<CourseProgress[]> {
    try {
      return await firstValueFrom(this.coursesApi.getProgress());
    } catch {
      return [];
    }
  }
}
