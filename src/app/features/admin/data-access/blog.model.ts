/**
 * Frontend domain model for admin blog authoring (BE-I-11 / BLOG-ADMIN).
 * Mirrors `blog.dto.ts` with camelCase locale fields.
 *
 * RBAC (backend-enforced; the UI only hides actions):
 *   - list / read / create / update → content_creator, learning_admin
 *   - publish / unpublish / delete  → learning_admin
 *   - super_admin bypasses all.
 */

/** Article lifecycle status (matches the backend `BlogStatus` enum). */
export const BLOG_STATUSES = ['draft', 'published', 'archived'] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

/** True when `value` is a known blog status. */
export function isBlogStatus(value: string): value is BlogStatus {
  return (BLOG_STATUSES as readonly string[]).includes(value);
}

/**
 * Non-English locales editable in the translation matrix. English is authored
 * via the canonical title/contentHtml/metaDescription fields (auto-mirrored into
 * `translations.en` by the backend), so it is not listed here. The app UI stays
 * en/fr/ar, but the backend supports these extra authoring targets.
 */
export const BLOG_TRANSLATION_LOCALES = ['tr', 'fr', 'es', 'ar', 'de'] as const;
export type BlogTranslationLocale = (typeof BLOG_TRANSLATION_LOCALES)[number];

/** One locale's authored content (camelCase; snake_case on the wire). */
export interface BlogLocaleContent {
  readonly title: string;
  readonly contentHtml: string;
  readonly metaDescription: string;
}

/** An admin list row (all statuses). */
export interface BlogAdminItem {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly status: BlogStatus;
  readonly metaDescription: string | null;
  readonly authorName: string | null;
  readonly publishedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Full authoring detail — list row + body + per-locale translations. */
export interface BlogAdminDetail extends BlogAdminItem {
  readonly contentHtml: string;
  /** Per-locale content keyed by locale code (`en`, `tr`, …); may be partial. */
  readonly translations: Readonly<Record<string, BlogLocaleContent>>;
}

/** Editable canonical English fields when creating an article. */
export interface CreateBlogPayload {
  readonly title: string;
  readonly contentHtml: string;
  /** Optional explicit slug; when blank the backend derives one from the title. */
  readonly slug: string | null;
  readonly metaDescription: string | null;
}

/** Editable canonical English fields when updating (slug immutable once published). */
export interface UpdateBlogPayload {
  readonly title: string;
  readonly contentHtml: string;
  readonly slug: string | null;
  readonly metaDescription: string | null;
}

/** Per-locale translations to replace-merge (only supplied locales change). */
export type BlogTranslationsPayload = Partial<Record<BlogTranslationLocale, BlogLocaleContent>>;

/** Optional server-side filters for the admin list. */
export interface BlogFilters {
  readonly status?: BlogStatus;
  readonly search?: string;
}
