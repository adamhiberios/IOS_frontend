/**
 * Insights (public blog) DTO — wire shapes for the backend Blog module
 * (`BE-I-11`, backend `334d0c6`). Mirrors the public `@Public()` endpoints:
 *
 *   - `GET /blog`        → `{ data, meta.pagination }` (cursor, published_at DESC)
 *   - `GET /blog/:slug`  → `{ data: BlogDetailDto, meta: { locale } }`
 *
 * Both are localized by `X-Lang` (added by `localeInterceptor`); the backend
 * resolves title/metaDescription/contentHtml into the requested locale with an
 * English fallback (`fallbackUsed` marks when the fallback kicked in). Draft /
 * archived / unknown slugs 404 on the detail endpoint — the public API never
 * reveals a non-published article. See `docs/backend-analysis.md` →
 * "Blog endpoints (BE-I-11)".
 */

import { type PagedResponse } from '@core/http';

/** One list row (`BlogListItemDto`) — no `contentHtml`. */
export interface BlogListItemDto {
  readonly slug: string;
  readonly title: string;
  /** Short excerpt used for cards and SEO. */
  readonly metaDescription: string | null;
  readonly publishedAt: string | null;
  readonly authorName: string | null;
  readonly locale: string;
  readonly direction: 'ltr' | 'rtl';
  readonly fallbackUsed: boolean;
}

/** `GET /blog` — cursor-paginated list of published articles. */
export type BlogListResponseDto = PagedResponse<BlogListItemDto, { locale: string }>;

/** SEO block returned with a single article detail. */
export interface BlogSeoDto {
  readonly metaTitle: string;
  readonly metaDescription: string | null;
  readonly canonicalUrl: string;
  readonly ogType: string;
  readonly publishedAt: string | null;
  readonly authorName: string | null;
}

/** The single-article payload (published only; 404 for draft/archived/unknown). */
export interface BlogDetailDto {
  readonly slug: string;
  readonly title: string;
  readonly contentHtml: string;
  readonly metaDescription: string | null;
  readonly publishedAt: string | null;
  readonly authorName: string | null;
  readonly locale: string;
  readonly direction: 'ltr' | 'rtl';
  readonly fallbackUsed: boolean;
  readonly seo: BlogSeoDto;
}

/** `GET /blog/:slug` — `BlogDetailDto` wrapped in a `{ data, meta }` envelope. */
export interface BlogDetailResponseDto {
  readonly data: BlogDetailDto;
  readonly meta: { readonly locale: string };
}
