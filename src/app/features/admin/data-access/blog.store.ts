import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { AppEventBus } from '@core/event-bus';
import { type ProblemDetails, problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { AdminBlogApi } from './blog.api';
import { toCreateBlogBody, toTranslationsBody, toUpdateBlogBody } from './blog.mappers';
import {
  type BlogAdminDetail,
  type BlogAdminItem,
  type BlogFilters,
  type BlogTranslationsPayload,
  type CreateBlogPayload,
  type UpdateBlogPayload,
} from './blog.model';

/** Page size for the admin list (backend max is 100). */
const PAGE_LIMIT = 50;

/**
 * Extract the publish-gate reasons from a `409 BLOG_NOT_PUBLISHABLE` body: each
 * check lands in the RFC-7807 `errors[]` array as `{ code: 'NOT_PUBLISHABLE',
 * message }` (mirrors the exam-authoring pattern). Returns the messages, or `[]`.
 */
function publishReasonsFrom(err: unknown): readonly string[] {
  if (!(err instanceof HttpErrorResponse)) return [];
  const body = err.error as ProblemDetails | null;
  const errors = body?.errors;
  if (!errors) return [];
  return errors
    .map((e) => e.message)
    .filter((m): m is string => typeof m === 'string' && m.trim().length > 0);
}

/**
 * Signal store for admin blog authoring (BE-I-11 / BLOG-ADMIN).
 *
 * Cursor-paginated list (all statuses, newest-first) with `status` + `search`
 * filters; owns create / update / translations / publish / unpublish / delete
 * (archive) actions and lazily loads the full authoring detail for the edit and
 * translations dialogs. Cleared on `user.logged-out`. Business logic lives here;
 * the page only binds signals (CLAUDE.md §5).
 */
@Injectable({ providedIn: 'root' })
export class AdminBlogStore {
  private readonly api = inject(AdminBlogApi);
  private readonly lang = inject(LanguageService);
  private readonly bus = inject(AppEventBus);

  constructor() {
    this.bus
      .on('user.logged-out')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.clear());
  }

  private readonly _items = signal<readonly BlogAdminItem[]>([]);
  private readonly _loading = signal(false);
  private readonly _loadingMore = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _nextCursor = signal<string | null>(null);
  private readonly _hasMore = signal(false);
  private readonly _filters = signal<BlogFilters>({});
  private readonly _loaded = signal(false);

  private readonly _actionPendingId = signal<string | null>(null);
  private readonly _actionError = signal<string | null>(null);
  private readonly _publishReasons = signal<readonly string[]>([]);

  private readonly _detail = signal<BlogAdminDetail | null>(null);
  private readonly _detailLoading = signal(false);
  private readonly _detailError = signal<string | null>(null);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadingMore = this._loadingMore.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly actionPendingId = this._actionPendingId.asReadonly();
  readonly actionError = this._actionError.asReadonly();
  readonly publishReasons = this._publishReasons.asReadonly();
  readonly detail = this._detail.asReadonly();
  readonly detailLoading = this._detailLoading.asReadonly();
  readonly detailError = this._detailError.asReadonly();
  readonly isEmpty = computed(
    () => !this._loading() && this._error() === null && this._items().length === 0,
  );

  /** Load the first page (once) unless `force`d. */
  async load(force = false): Promise<void> {
    if (!force && this._loaded()) return;
    await this.fetch(false);
  }

  /** Append the next keyset page, if any. */
  async loadMore(): Promise<void> {
    if (this._loadingMore() || !this._hasMore() || this._nextCursor() === null) return;
    await this.fetch(true);
  }

  /** Replace the filter set and reload from page 1. No-ops when unchanged. */
  async setFilters(next: BlogFilters): Promise<void> {
    if (filtersEqual(next, this._filters())) return;
    this._filters.set(next);
    await this.fetch(false);
  }

  async retry(): Promise<void> {
    await this.fetch(false);
  }

  // ── Detail (edit / translations dialogs) ───────────────────────────────────

  /** Fetch the full authoring detail for a row. Returns it, or `null` on error. */
  async loadDetail(id: string): Promise<BlogAdminDetail | null> {
    this._detail.set(null);
    this._detailError.set(null);
    this._detailLoading.set(true);
    try {
      const detail = await firstValueFrom(this.api.getById(id));
      this._detail.set(detail);
      return detail;
    } catch (err) {
      this._detailError.set(problemDetailMessage(err) ?? this.lang.t('admin.blog.detailError'));
      return null;
    } finally {
      this._detailLoading.set(false);
    }
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  async create(payload: CreateBlogPayload): Promise<boolean> {
    return this.runAction('new', () => firstValueFrom(this.api.create(toCreateBlogBody(payload))));
  }

  async update(id: string, payload: UpdateBlogPayload): Promise<boolean> {
    return this.runAction(id, () => firstValueFrom(this.api.update(id, toUpdateBlogBody(payload))));
  }

  async updateTranslations(id: string, payload: BlogTranslationsPayload): Promise<boolean> {
    return this.runAction(id, () =>
      firstValueFrom(this.api.updateTranslations(id, toTranslationsBody(payload))),
    );
  }

  async publish(id: string): Promise<boolean> {
    return this.runAction(id, () => firstValueFrom(this.api.publish(id)));
  }

  async unpublish(id: string): Promise<boolean> {
    return this.runAction(id, () => firstValueFrom(this.api.unpublish(id)));
  }

  /** Archive (soft-delete) an article. */
  async remove(id: string): Promise<boolean> {
    return this.runAction(id, () => firstValueFrom(this.api.remove(id)));
  }

  clearActionError(): void {
    this._actionError.set(null);
    this._publishReasons.set([]);
  }

  private async runAction(pendingKey: string, action: () => Promise<unknown>): Promise<boolean> {
    if (this._actionPendingId() !== null) return false;
    this._actionPendingId.set(pendingKey);
    this._actionError.set(null);
    this._publishReasons.set([]);
    try {
      await action();
      await this.fetch(false);
      return true;
    } catch (err) {
      const reasons = publishReasonsFrom(err);
      if (reasons.length > 0) this._publishReasons.set(reasons);
      this._actionError.set(problemDetailMessage(err) ?? this.lang.t('admin.blog.saveError'));
      return false;
    } finally {
      this._actionPendingId.set(null);
    }
  }

  private async fetch(append: boolean): Promise<void> {
    if (append) this._loadingMore.set(true);
    else this._loading.set(true);
    this._error.set(null);

    try {
      const page = await firstValueFrom(
        this.api.list({
          ...this._filters(),
          cursor: append ? (this._nextCursor() ?? undefined) : undefined,
          limit: PAGE_LIMIT,
        }),
      );
      this._items.update((current) => (append ? [...current, ...page.items] : [...page.items]));
      this._nextCursor.set(page.nextCursor);
      this._hasMore.set(page.hasMore);
      this._loaded.set(true);
    } catch (err) {
      this._error.set(problemDetailMessage(err) ?? this.lang.t('admin.blog.error'));
    } finally {
      this._loading.set(false);
      this._loadingMore.set(false);
    }
  }

  private clear(): void {
    this._items.set([]);
    this._error.set(null);
    this._actionError.set(null);
    this._publishReasons.set([]);
    this._nextCursor.set(null);
    this._hasMore.set(false);
    this._filters.set({});
    this._loaded.set(false);
    this._detail.set(null);
    this._detailError.set(null);
  }
}

function filtersEqual(a: BlogFilters, b: BlogFilters): boolean {
  return a.status === b.status && (a.search ?? '') === (b.search ?? '');
}
