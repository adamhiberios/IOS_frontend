import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { AppEventBus } from '@core/event-bus';
import { type ProblemDetails, problemDetailMessage } from '@core/http';
import { LanguageService } from '@core/i18n';

import { AdminBlogApi } from './blog.api';
import { AdminBlogImportApi } from './blog-import.api';
import { toCreateBlogBody, toTranslationsBody, toUpdateBlogBody } from './blog.mappers';
import {
  type BlogAdminDetail,
  type BlogAdminItem,
  type BlogFilters,
  type BlogTranslationLocale,
  type BlogTranslationsPayload,
  type CreateBlogPayload,
  type UpdateBlogPayload,
} from './blog.model';
import {
  ContentImportError,
  type ImportTarget,
  importErrorText,
  importIssueText,
} from './content-import.messages';

/**
 * Issue codes whose shared (lesson) wording names the lesson — re-worded for
 * articles under `admin.blogImport.issues.*`.
 */
const BLOG_IMPORT_TARGET: ImportTarget = {
  issueOverrides: {
    prefix: 'admin.blogImport.issues',
    codes: ['CONTENT_EMPTY', 'CONTENT_TOO_LONG', 'TITLE_HEADING_REMOVED', 'HEADING_1_IN_CONTENT'],
  },
};

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
 *
 * Article bodies come from Word, like lesson bodies: the admin uploads a .docx
 * (per locale), the backend converts it to HTML and the store saves that HTML
 * right away through the ordinary update routes. There is no in-app editor.
 */
@Injectable({ providedIn: 'root' })
export class AdminBlogStore {
  private readonly api = inject(AdminBlogApi);
  private readonly blogImport = inject(AdminBlogImportApi);
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
  /** Non-blocking notes from the last Word document(s) saved (missing alt text, …). */
  private readonly _importWarnings = signal<readonly string[]>([]);

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
  readonly importWarnings = this._importWarnings.asReadonly();
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

  /**
   * Create a draft whose body comes from a Word document (required).
   *
   * The article is created with a stub body, because the conversion needs its
   * id; the document is then converted and one PATCH stores the HTML.
   * `onCreated` reports the new id as soon as the row exists, so if the
   * document is then rejected the dialog can carry on as an edit of that draft
   * instead of creating another.
   */
  async create(
    payload: CreateBlogPayload,
    file: File | null,
    onCreated?: (id: string) => void,
  ): Promise<boolean> {
    this._importWarnings.set([]);
    const ok = await this.runAction('new', async () => {
      if (!file) throw new ContentImportError(this.lang.t('admin.blogImport.fileRequired'));
      const created = await firstValueFrom(this.api.create(toCreateBlogBody(payload)));
      onCreated?.(created.id);
      try {
        const html = await this.convertDocx(created.id, file, 'en');
        await firstValueFrom(this.api.update(created.id, { contentHtml: html }));
      } catch (err) {
        // The draft exists now — show it in the list behind the dialog.
        void this.fetch(false);
        throw err;
      }
    });
    // Notes about a document that didn't end up saved would only mislead.
    if (!ok) this._importWarnings.set([]);
    return ok;
  }

  /**
   * Update the English fields. With a file, the document is converted first and
   * its HTML goes out in the same PATCH; without one the stored body is kept.
   */
  async update(id: string, payload: UpdateBlogPayload, file?: File | null): Promise<boolean> {
    this._importWarnings.set([]);
    const ok = await this.runAction(id, async () => {
      const html = file ? await this.convertDocx(id, file, 'en') : undefined;
      await firstValueFrom(this.api.update(id, toUpdateBlogBody(payload, html)));
    });
    if (!ok) this._importWarnings.set([]);
    return ok;
  }

  /**
   * Save the translations. Each locale with a Word document gets its converted
   * HTML; the others keep the body already in `payload` (blocks are replaced
   * whole on the backend, so the stored body must be sent back).
   */
  async updateTranslations(
    id: string,
    payload: BlogTranslationsPayload,
    files: Partial<Record<BlogTranslationLocale, File>> = {},
  ): Promise<boolean> {
    this._importWarnings.set([]);
    const ok = await this.runAction(id, async () => {
      const next: BlogTranslationsPayload = { ...payload };
      for (const [loc, file] of Object.entries(files) as [BlogTranslationLocale, File][]) {
        const html = await this.convertDocx(id, file, loc);
        const current = next[loc];
        next[loc] = {
          title: current?.title ?? '',
          metaDescription: current?.metaDescription ?? '',
          contentHtml: html,
        };
      }
      await firstValueFrom(this.api.updateTranslations(id, toTranslationsBody(next)));
    });
    if (!ok) this._importWarnings.set([]);
    return ok;
  }

  clearImportWarnings(): void {
    this._importWarnings.set([]);
  }

  /**
   * Convert a .docx to article HTML for `locale`. Throws
   * {@link ContentImportError} with a translated message when the document
   * cannot be used; non-blocking notes are collected in {@link importWarnings}.
   */
  private async convertDocx(id: string, file: File, locale: string): Promise<string> {
    const t = (key: string, params?: Record<string, string | number>): string =>
      this.lang.t(key, params);
    // Name the language when a translation's document is the one at fault.
    const prefix = locale === 'en' ? '' : `${locale.toUpperCase()}: `;
    let result;
    try {
      result = await firstValueFrom(this.blogImport.convert(id, file, locale));
    } catch (err) {
      throw new ContentImportError(prefix + importErrorText(t, err, BLOG_IMPORT_TARGET));
    }
    if (!result.canSave) {
      throw new ContentImportError(
        prefix +
          [
            this.lang.t('admin.blogImport.errorsIntro'),
            ...result.errors.map((i) => importIssueText(t, i, BLOG_IMPORT_TARGET)),
          ].join(' '),
      );
    }
    this._importWarnings.update((current) => [
      ...current,
      ...result.warnings.map((i) => prefix + importIssueText(t, i, BLOG_IMPORT_TARGET)),
    ]);
    return result.html;
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

  /** Permanently delete a draft or archived article (IDD-389). */
  async permanentDelete(id: string): Promise<boolean> {
    return this.runAction(id, () => firstValueFrom(this.api.permanentDelete(id)));
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
      this._actionError.set(
        err instanceof ContentImportError
          ? err.message
          : (problemDetailMessage(err) ?? this.lang.t('admin.blog.saveError')),
      );
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
    this._importWarnings.set([]);
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
