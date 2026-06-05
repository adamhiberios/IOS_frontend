/**
 * Landing page domain models.
 *
 * ## Design principle
 * Only data that the **server will provide** lives here.
 * Static copy (headings, descriptions, cert names, icons, prices, links) lives
 * directly in each section component — either as `lang.t()` calls for
 * translatable text, or as hardcoded constants for structural/visual values.
 *
 * ## Server-driven fields
 * | Field              | Example value       | Why server-driven                        |
 * |--------------------|---------------------|------------------------------------------|
 * | cohortDate         | "June 2, 2026"      | Changes every cohort cycle               |
 * | graduatesCount     | "12,000+"           | Live stat, updated by backend            |
 * | insightSectionBadge | "Insights"          | Admins may relabel the section           |
 * | insightPosts        | [{…}, …]            | Real CMS content                         |
 */

/**
 * The only hero values that change at runtime.
 * All other hero text (headline, subtext, CTA labels, etc.) is static copy
 * translated via `lang.t()` inside `HeroSection`.
 */
export interface HeroDynamicData {
  /** Human-readable cohort start date, e.g. "June 2, 2026". */
  cohortDate: string;
  /** Display string for graduate count, e.g. "12,000+". */
  graduatesCount: string;
}

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
  link: string;
}

/**
 * Everything the landing page fetches from the backend.
 * `LandingApi.getPageData()` will return this once the endpoint is live.
 * `LandingStore` falls back to static defaults when the API is unavailable.
 */
export interface LandingDynamicData {
  hero: HeroDynamicData;
  /**
   * Label for the insights section badge, e.g. "Insights".
   * Kept server-driven so admins can rename the section without a deploy.
   */
  insightSectionBadge: string;
  insightPosts: InsightPost[];
}
