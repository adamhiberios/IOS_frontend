/**
 * Insights mappers — wire `BlogListItemDto` / `BlogDetailDto` into the frontend
 * `InsightPost` / `InsightDetailPost` models.
 *
 * The backend owns text, author and dates but not a featured image or read-time,
 * so these are derived here: a deterministic placeholder image keyed off the
 * slug (so the same article always shows the same card image), a localized date
 * string, and a word-count read-time estimate from the article body.
 */

import { type BlogDetailDto, type BlogListItemDto } from './insights.dto';
import { type InsightDetailPost, type InsightPost } from './insights.model';

/** Bundled placeholder card images (backend supplies no featured image). */
const PLACEHOLDER_IMAGES = [
  '/assets/images/blog_1.png',
  '/assets/images/blog_2.png',
  '/assets/images/blog_3.png',
] as const;

/** Average adult reading speed (words/minute) used for the read-time estimate. */
const WORDS_PER_MINUTE = 200;

/** Stable non-negative hash of a string (djb2) — used to pick a placeholder. */
function hash(value: string): number {
  let h = 5381;
  for (let i = 0; i < value.length; i++) h = (h * 33) ^ value.charCodeAt(i);
  return h >>> 0;
}

/** Deterministic placeholder image for a slug (same slug → same image). */
export function placeholderImage(slug: string): string {
  return PLACEHOLDER_IMAGES[hash(slug) % PLACEHOLDER_IMAGES.length];
}

/** Localized long date, e.g. "Apr 15, 2026". Empty string when unpublished. */
export function formatPublishedDate(iso: string | null, locale: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Estimate read-time (minutes, min 1) from an HTML body via word count. */
export function estimateReadMinutes(contentHtml: string): number {
  const text = contentHtml
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .trim();
  const words = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** Map a wire list row to the `InsightPost` card model. */
export function toInsightPost(dto: BlogListItemDto, locale: string): InsightPost {
  return {
    id: dto.slug,
    slug: dto.slug,
    date: formatPublishedDate(dto.publishedAt, locale),
    publishedAt: dto.publishedAt,
    title: dto.title,
    excerpt: dto.metaDescription ?? '',
    authorName: dto.authorName ?? '',
    imageUrl: placeholderImage(dto.slug),
    link: `/insights/${dto.slug}`,
    fallbackUsed: dto.fallbackUsed,
  };
}

/** Map a wire detail response to the `InsightDetailPost` model. */
export function toInsightDetail(dto: BlogDetailDto, locale: string): InsightDetailPost {
  return {
    id: dto.slug,
    slug: dto.slug,
    date: formatPublishedDate(dto.publishedAt, locale),
    publishedAt: dto.publishedAt,
    title: dto.title,
    excerpt: dto.metaDescription ?? '',
    authorName: dto.authorName ?? '',
    imageUrl: placeholderImage(dto.slug),
    link: `/insights/${dto.slug}`,
    fallbackUsed: dto.fallbackUsed,
    contentHtml: dto.contentHtml,
    locale: dto.locale,
    readMinutes: estimateReadMinutes(dto.contentHtml),
    seo: {
      metaTitle: dto.seo.metaTitle,
      metaDescription: dto.seo.metaDescription ?? '',
      canonicalUrl: dto.seo.canonicalUrl,
      ogType: dto.seo.ogType,
      publishedAt: dto.seo.publishedAt,
      authorName: dto.seo.authorName ?? '',
      jsonLd: dto.seo.jsonLd,
    },
  };
}
