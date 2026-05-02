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
 *   Response: LandingPageDto
 *
 * All text fields are pre-localised by the backend based on Accept-Language.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface HeroDto {
  badge: string;
  headline: string;
  headline_highlight: string;
  subtext: string;
  source: string;
  cohort_label: string;
  cohort_date: string;
  graduates_count: string;
  graduates_label: string;
}

export interface CredibilityCardDto {
  icon: string;
  title: string;
}

export interface ValuePropCardDto {
  icon: string;
  title: string;
  description: string;
}

export interface CertCardDto {
  id: string;
  abbreviation: string;
  full_name: string;
  level_badge: string;
  badge_color: string;
  price: string;
  detail_link: string;
}

export interface CertificationLevelDto {
  id: string;
  icon: string;
  tab_label: string;
  description: string;
  explore_path: string;
  explore_link: string;
  audience_desc: string;
  cert_cards: CertCardDto[];
}

export interface HowItWorksStepDto {
  number: string;
  icon: string;
  title: string;
  description: string;
}

export interface MarketLevelDto {
  tag: string;
  name: string;
  audience: string[];
  description: string;
}

export interface CertTableCellDto {
  name: string;
  link: string;
}

export interface CertTableRowDto {
  role: string;
  cells: CertTableCellDto[];
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

export interface LandingPageDto {
  hero: HeroDto;
  credibility_cards: CredibilityCardDto[];
  value_prop_cards: ValuePropCardDto[];
  certification_levels: CertificationLevelDto[];
  how_it_works_steps: HowItWorksStepDto[];
  market_levels: MarketLevelDto[];
  cert_table_rows: CertTableRowDto[];
  blog_posts: BlogPostDto[];
}
