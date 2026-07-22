/**
 * Landing page domain models.
 *
 * ## Design principle
 * Only data the **server provides** lives here. `GET /landing` (BE-I-20) returns
 * `featuredPrograms` (live catalog cards) + `stats` (platform counters). Static
 * copy (headings, cert-level structure, prices in the marketing carousel) stays
 * in the section components via `lang.t()` / constants.
 *
 * The Scrum-Journal / insight posts on the landing page have **no `/landing`
 * backing** — they render from a static list the store owns (see `landing.store`).
 */

import { type PublicCertificate } from './catalog.model';

/** Live platform counters shown in the stats strip under the hero. */
export interface LandingStats {
  readonly programs: number;
  readonly students: number;
  readonly certificatesIssued: number;
}

/** Everything the landing page fetches from `GET /landing`. */
export interface LandingData {
  readonly featuredPrograms: readonly PublicCertificate[];
  readonly stats: LandingStats;
}

/**
 * A single Scrum-Journal card on the landing page. Static content (no backend);
 * the public blog itself lives in the `insights` feature.
 */
export interface InsightPost {
  /** Stable slug / id. */
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
