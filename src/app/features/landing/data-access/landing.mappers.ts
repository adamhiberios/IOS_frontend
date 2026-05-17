/**
 * Landing page DTO → Domain model mappers.
 *
 * Each function transforms the snake_case backend shape into the camelCase
 * domain model consumed by `LandingStore`.
 *
 * Only server-driven fields are mapped here. Static content lives in the
 * section components.
 */

import type { BlogPost, HeroDynamicData, LandingDynamicData } from './landing.model';
import type { BlogPostDto, HeroDynamicDto, LandingDynamicDto } from './landing.dto';

export function mapHeroDynamic(dto: HeroDynamicDto): HeroDynamicData {
  return {
    cohortDate: dto.cohort_date,
    graduatesCount: dto.graduates_count,
  };
}

export function mapBlogPost(dto: BlogPostDto): BlogPost {
  return {
    id: dto.id,
    date: dto.date,
    title: dto.title,
    excerpt: dto.excerpt,
    readTime: dto.read_time,
    imageUrl: dto.image_url,
    link: dto.link,
  };
}

export function mapLandingDynamicData(dto: LandingDynamicDto): LandingDynamicData {
  return {
    hero: mapHeroDynamic(dto.hero),
    blogSectionBadge: dto.blog_section_badge,
    blogPosts: dto.blog_posts.map(mapBlogPost),
  };
}
