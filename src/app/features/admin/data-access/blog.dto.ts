/**
 * Wire shapes for admin blog authoring (BE-I-11 / BLOG-ADMIN, backend `334d0c6`).
 *
 *   GET    /admin/blog                  → { data, meta.pagination } (all statuses)
 *   GET    /admin/blog/:id              → bare BlogAdminDetailDto (+ contentHtml + translations)
 *   POST   /admin/blog                  → { data } (201; always DRAFT; 409 slug exists)
 *   PATCH  /admin/blog/:id              → { data } (slug locked once published → 409)
 *   PATCH  /admin/blog/:id/translations → { data } (per-locale replace-merge)
 *   POST   /admin/blog/:id/publish      → { data } (409 BLOG_NOT_PUBLISHABLE, errors[])
 *   POST   /admin/blog/:id/unpublish    → { data }
 *   DELETE /admin/blog/:id              → { data } (soft-delete → archived)
 *
 * Read+create+update: content_creator / learning_admin. publish / unpublish /
 * delete: learning_admin (super_admin bypasses all). Envelopes vary per endpoint
 * (BE-I-01) — the list is `{ data, meta }`, GET-one is **bare**, writes are `{ data }`.
 */

import { type PagedResponse } from '@core/http';

import { type BlogStatus } from './blog.model';

/**
 * A single locale's authored content inside the `translations` JSONB. Keys are
 * snake_case on the wire (`content_html` / `meta_description`) to match the
 * backend entity contract. Every field is optional (a locale may translate only
 * some fields).
 */
export interface BlogLocaleDto {
  readonly title?: string;
  readonly content_html?: string;
  readonly meta_description?: string;
}

/** One admin list row (all statuses). */
export interface BlogAdminItemDto {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly status: BlogStatus;
  readonly metaDescription: string | null;
  readonly authorId: string | null;
  readonly authorName: string | null;
  readonly publishedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** `GET /admin/blog` — cursor list (created_at DESC); `meta` carries `locale`. */
export type BlogAdminListResponseDto = PagedResponse<BlogAdminItemDto, { locale: string }>;

/** `GET /admin/blog/:id` — bare authoring detail (adds body + raw translations). */
export interface BlogAdminDetailDto extends BlogAdminItemDto {
  readonly contentHtml: string;
  /** Raw per-locale translations JSONB, e.g. `{ en: {...}, tr: {...} }`. */
  readonly translations: Readonly<Record<string, BlogLocaleDto>>;
}

/** `{ data }` envelope for create / update / translations / publish / unpublish. */
export interface BlogAdminDetailResponseDto {
  readonly data: BlogAdminDetailDto;
}

/** `POST /admin/blog` body — canonical English fields + optional slug. */
export interface CreateBlogBody {
  readonly title: string;
  readonly contentHtml: string;
  readonly slug?: string;
  readonly metaDescription?: string;
}

/** `PATCH /admin/blog/:id` body — partial English fields + slug. */
export interface UpdateBlogBody {
  readonly title?: string;
  readonly contentHtml?: string;
  readonly slug?: string;
  readonly metaDescription?: string;
}

/** `PATCH /admin/blog/:id/translations` body — per-locale replace-merge. */
export interface UpdateBlogTranslationsBody {
  readonly translations: Readonly<Record<string, BlogLocaleDto>>;
}
