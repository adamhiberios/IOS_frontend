/**
 * Landing page domain models.
 *
 * ## Design principle
 * Only data the **server provides** lives here. `GET /landing` (BE-I-20) returns
 * `featuredPrograms` (live catalog cards) + `stats` (platform counters). Static
 * copy (headings, cert-level structure, prices in the marketing carousel) stays
 * in the section components via `lang.t()` / constants.
 *
 * The Scrum-Journal / insight cards on the landing page are **not** part of the
 * `/landing` payload — `LandingStore` fetches them straight from the public
 * blog (`GET /blog`, via the `insights` feature's `InsightsApi`), keeping a
 * small static fallback for when nothing is published yet or the call fails
 * (see `landing.store`).
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
