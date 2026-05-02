/**
 * Landing page DTO → Domain model mappers.
 *
 * Each `map*` function transforms the snake_case backend shape into the
 * camelCase domain model consumed by the store and components.
 *
 * Icon names are typed as `LucideIconName` at the model layer.
 * The cast is safe because the backend is expected to send valid icon names;
 * an unknown name will simply render nothing (handled by IosIcon).
 */

import type { LucideIconName } from '@ui';

import type {
  BlogPost,
  CertCard,
  CertificationLevel,
  CertTableCell,
  CertTableRow,
  CredibilityCard,
  HeroData,
  HowItWorksStep,
  LandingPageData,
  MarketLevel,
  ValuePropCard,
} from './landing.model';
import type {
  BlogPostDto,
  CertCardDto,
  CertificationLevelDto,
  CertTableCellDto,
  CertTableRowDto,
  CredibilityCardDto,
  HeroDto,
  HowItWorksStepDto,
  LandingPageDto,
  MarketLevelDto,
  ValuePropCardDto,
} from './landing.dto';

export function mapHero(dto: HeroDto): HeroData {
  return {
    badge: dto.badge,
    headline: dto.headline,
    headlineHighlight: dto.headline_highlight,
    subtext: dto.subtext,
    source: dto.source,
    cohortLabel: dto.cohort_label,
    cohortDate: dto.cohort_date,
    graduatesCount: dto.graduates_count,
    graduatesLabel: dto.graduates_label,
  };
}

export function mapCredibilityCard(dto: CredibilityCardDto): CredibilityCard {
  return {
    icon: dto.icon as LucideIconName,
    title: dto.title,
  };
}

export function mapValuePropCard(dto: ValuePropCardDto): ValuePropCard {
  return {
    icon: dto.icon as LucideIconName,
    title: dto.title,
    description: dto.description,
  };
}

export function mapCertCard(dto: CertCardDto): CertCard {
  return {
    id: dto.id,
    abbreviation: dto.abbreviation,
    fullName: dto.full_name,
    levelBadge: dto.level_badge,
    badgeColor: dto.badge_color,
    price: dto.price,
    detailLink: dto.detail_link,
  };
}

export function mapCertificationLevel(dto: CertificationLevelDto): CertificationLevel {
  return {
    id: dto.id,
    icon: dto.icon as LucideIconName,
    tabLabel: dto.tab_label,
    description: dto.description,
    explorePath: dto.explore_path,
    exploreLink: dto.explore_link,
    audienceDesc: dto.audience_desc,
    certCards: dto.cert_cards.map(mapCertCard),
  };
}

export function mapHowItWorksStep(dto: HowItWorksStepDto): HowItWorksStep {
  return {
    number: dto.number,
    icon: dto.icon as LucideIconName,
    title: dto.title,
    description: dto.description,
  };
}

export function mapMarketLevel(dto: MarketLevelDto): MarketLevel {
  return {
    tag: dto.tag,
    name: dto.name,
    audience: dto.audience,
    description: dto.description,
  };
}

export function mapCertTableCell(dto: CertTableCellDto): CertTableCell {
  return { name: dto.name, link: dto.link };
}

export function mapCertTableRow(dto: CertTableRowDto): CertTableRow {
  return {
    role: dto.role,
    cells: dto.cells.map(mapCertTableCell),
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

export function mapLandingPageData(dto: LandingPageDto): LandingPageData {
  return {
    hero: mapHero(dto.hero),
    credibilityCards: dto.credibility_cards.map(mapCredibilityCard),
    valuePropCards: dto.value_prop_cards.map(mapValuePropCard),
    certificationLevels: dto.certification_levels.map(mapCertificationLevel),
    howItWorksSteps: dto.how_it_works_steps.map(mapHowItWorksStep),
    marketLevels: dto.market_levels.map(mapMarketLevel),
    certTableRows: dto.cert_table_rows.map(mapCertTableRow),
    blogPosts: dto.blog_posts.map(mapBlogPost),
  };
}
