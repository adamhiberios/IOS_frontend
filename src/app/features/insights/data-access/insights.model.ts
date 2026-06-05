/**
 * Insights feature domain models.
 *
 * Defines `InsightPost` for the insights feature — a journal/article post.
 * This file exists as a feature-boundary marker in case the insights feature
 * diverges from the landing insights section in the future.
 */

export interface InsightPost {
  /** Stable slug / backend ID. */
  id: string;
  /** Human-readable date, e.g. "Apr 15, 2026". */
  date: string;
  title: string;
  excerpt: string;
  /** E.g. "5 min read". */
  readTime: string;
  imageUrl: string;
  /** Router link to the full post, e.g. "/insights/why-employers-require-scrum". */
  link: string;
}

export interface InsightsPageData {
  posts: InsightPost[];
}

/** A single content block inside a detail article. */
export type InsightContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'quote'; text: string; attribution?: string }
  | { type: 'list'; items: string[] };

/** Full article returned from the detail endpoint. */
export interface InsightDetailPost extends InsightPost {
  /** URL slug, e.g. "why-employers-require-scrum-certification". */
  slug: string;
  /** Category label, e.g. "Career". */
  category: string;
  /** Author display name. */
  author: string;
  /** Author role/title. */
  authorRole: string;
  /** Ordered content blocks that make up the article body. */
  body: InsightContentBlock[];
}
