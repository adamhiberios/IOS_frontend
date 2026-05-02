/**
 * Mappers — translate backend DTOs into the feature's domain model.
 */

import type { InsightPost, InsightsPageData } from './insights.model';
import type { InsightPostDto, InsightsPageDto } from './insights.dto';

export function mapInsightPost(dto: InsightPostDto): InsightPost {
  return {
    id: dto.id,
    date: dto.date,
    title: dto.title,
    excerpt: dto.excerpt,
    readTime: dto.readTime,
    imageUrl: dto.imageUrl,
    link: `/insights/${dto.slug}`,
  };
}

export function mapInsightsPageData(dto: InsightsPageDto): InsightsPageData {
  return {
    posts: dto.posts.map(mapInsightPost),
  };
}
