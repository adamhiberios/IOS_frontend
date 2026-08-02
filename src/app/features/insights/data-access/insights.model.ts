/**
 * Insights feature domain models — the public blog (`BE-I-11`).
 *
 * The backend Blog module owns title, excerpt (`metaDescription`), author,
 * published date, and the article body (`contentHtml`). It does **not** provide
 * a featured image or a read-time estimate, so the mappers derive a deterministic
 * placeholder image from the slug and compute read-time from the article body on
 * the detail view (see `insights.mappers.ts`).
 */

/** A single article as shown in the listing grid / related-articles rail. */
export interface InsightPost {
  /** Stable id — the article slug. */
  id: string;
  /** URL slug, e.g. "why-employers-require-scrum-certification". */
  slug: string;
  /** Localized, human-readable published date, e.g. "Apr 15, 2026" ('' if unpublished). */
  date: string;
  /** Raw ISO published timestamp (null if never published). */
  publishedAt: string | null;
  title: string;
  /** Short excerpt (backend `metaDescription`). */
  excerpt: string;
  /** Author display name. */
  authorName: string;
  /** Deterministic placeholder image derived from the slug. */
  imageUrl: string;
  /** Router link to the full post, e.g. "/insights/<slug>". */
  link: string;
  /** True when the backend served the English fallback (requested locale missing). */
  fallbackUsed: boolean;
}

/** SEO metadata returned with a single article. */
export interface InsightSeo {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogType: string;
  publishedAt: string | null;
  authorName: string;
  /**
   * schema.org `BlogPosting` JSON-LD, verbatim from the backend
   * (`StructuredDataService.blogPosting`) — rendered by `JsonLdService`, never
   * reconstructed client-side. Absent on backend builds that predate it.
   */
  jsonLd?: Record<string, unknown>;
}

/** Full article returned from the detail endpoint (`GET /blog/:slug`). */
export interface InsightDetailPost extends InsightPost {
  /** Sanitized-on-render HTML body (rendered via Angular's built-in sanitizer). */
  contentHtml: string;
  /** Resolved content locale, e.g. "en". */
  locale: string;
  /** Estimated read-time in minutes, computed from `contentHtml`. */
  readMinutes: number;
  seo: InsightSeo;
}
