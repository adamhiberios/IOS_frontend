/**
 * Insights feature domain models.
 *
 * Reuses `BlogPost` from the landing feature since insights are blog/journal posts.
 * This file exists as a feature-boundary marker in case the insights feature
 * diverges from the landing blog section in the future.
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
