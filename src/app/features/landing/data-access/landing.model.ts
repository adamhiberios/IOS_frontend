/**
 * Landing page domain models.
 *
 * All string fields hold already-resolved, locale-appropriate text.
 * When the backend API is wired, these come directly from the API response
 * (localised server-side via Accept-Language). The static fallback in
 * `landing.store.ts` pre-populates them in English.
 *
 * Icon names stay as `LucideIconName` — the backend can supply them as
 * strings and the type constrains what is valid.
 */

import type { LucideIconName } from '@ui';

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

export interface HeroData {
  badge: string;
  headline: string;
  headlineHighlight: string;
  subtext: string;
  source: string;
  cohortLabel: string;
  /** Human-readable cohort start date, e.g. "June 2, 2026". */
  cohortDate: string;
  /** Display string for graduate count, e.g. "12,000+". */
  graduatesCount: string;
  graduatesLabel: string;
}

// ---------------------------------------------------------------------------
// Credibility strip (section 3)
// ---------------------------------------------------------------------------

export interface CredibilityCard {
  icon: LucideIconName;
  title: string;
}

// ---------------------------------------------------------------------------
// Value proposition (section 4)
// ---------------------------------------------------------------------------

export interface ValuePropCard {
  icon: LucideIconName;
  title: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Certification levels & cert cards (section 5)
// ---------------------------------------------------------------------------

export interface CertCard {
  /** URL-safe abbreviation, e.g. "ESM". Used as a track id. */
  id: string;
  abbreviation: string;
  fullName: string;
  /** Short level label shown in the badge chip, e.g. "Foundation". */
  levelBadge: string;
  /** Hex or CSS color for the badge chip background, e.g. "#426981". */
  badgeColor: string;
  /** Formatted price string, e.g. "CAD $180". */
  price: string;
  /** Deep-link to the certification detail page, e.g. "/certifications/esm". */
  detailLink: string;
}

export interface CertificationLevel {
  /** Stable identifier, e.g. "FOUNDATION". */
  id: string;
  icon: LucideIconName;
  tabLabel: string;
  description: string;
  /** Call-to-action label, e.g. "Explore Foundation Path". */
  explorePath: string;
  /** Router link for the explore CTA. */
  exploreLink: string;
  /** Audience description paragraph. */
  audienceDesc: string;
  certCards: CertCard[];
}

// ---------------------------------------------------------------------------
// How It Works (section 9)
// ---------------------------------------------------------------------------

export interface HowItWorksStep {
  /** Display number, e.g. "01". */
  number: string;
  icon: LucideIconName;
  title: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Market stats / certification levels explained (section 8)
// ---------------------------------------------------------------------------

export interface MarketLevel {
  /** Short uppercase tag, e.g. "CORE KNOWLEDGE". */
  tag: string;
  /** Level name, e.g. "FOUNDATION". */
  name: string;
  /** Bullet items for the "It's for" list. */
  audience: string[];
  description: string;
}

export interface CertTableCell {
  name: string;
  link: string;
}

export interface CertTableRow {
  role: string;
  cells: CertTableCell[];
}

// ---------------------------------------------------------------------------
// Blog posts (section 9 / Scrum Journal)
// ---------------------------------------------------------------------------

export interface BlogPost {
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

// ---------------------------------------------------------------------------
// Aggregate page payload
// ---------------------------------------------------------------------------

/**
 * Everything the landing page needs in one object.
 * `LandingApi.getPageData()` will return this once the backend is ready.
 * `LandingStore` currently populates it from static fallback data.
 */
export interface LandingPageData {
  hero: HeroData;
  credibilityCards: CredibilityCard[];
  valuePropCards: ValuePropCard[];
  certificationLevels: CertificationLevel[];
  howItWorksSteps: HowItWorksStep[];
  marketLevels: MarketLevel[];
  certTableRows: CertTableRow[];
  blogPosts: BlogPost[];
}
