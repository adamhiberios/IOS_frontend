/**
 * Landing page API response DTOs.
 *
 * These types mirror the JSON shape the backend will return.
 * They are intentionally kept separate from domain models so that
 * backend naming conventions do not leak into the component layer.
 *
 * ── Backend contract (future) ─────────────────────────────────────────────
 * GET /api/landing
 *   Headers: Accept-Language: en | ar | fr
 *   Response: LandingDynamicDto
 *
 * Only server-driven fields are represented here. Static copy (headings,
 * cert names, descriptions, etc.) is owned by section components and i18n.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface HeroDynamicDto {
  /** E.g. "June 2, 2026" — changes every cohort. */
  cohort_date: string;
  /** E.g. "12,000+" — live graduate count. */
  graduates_count: string;
}

export interface BlogPostDto {
  id: string;
  date: string;
  title: string;
  excerpt: string;
  read_time: string;
  image_url: string;
  link: string;
}

export interface LandingDynamicDto {
  hero: HeroDynamicDto;
  /** Admin-controlled section badge, e.g. "Insights". */
  blog_section_badge: string;
  blog_posts: BlogPostDto[];
}
