/**
 * Insights DTO — the raw shape returned by the backend API.
 *
 * Currently unused (API returns null). Kept as a contract so the mapper and
 * API layer are ready when the backend is wired.
 */

export interface InsightPostDto {
  id: string;
  date: string;
  title: string;
  excerpt: string;
  readTime: string;
  imageUrl: string;
  slug: string;
}

export interface InsightsPageDto {
  posts: InsightPostDto[];
}
