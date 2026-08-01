/**
 * Landing page domain models.
 *
 * ## Design principle
 * Only data the **server provides** lives here. Static copy (headings,
 * cert-level structure, prices in the marketing carousel) stays in the section
 * components via `lang.t()` / constants.
 *
 * ## Where the landing page's server data comes from (BE-I-30, backend `66a7632`)
 * The old composite `GET /landing` was deleted; its payload is now three
 * separate sources, all composed in `LandingStore`:
 *
 *   - **stats** — `GET /analytics/public-stats` via `LandingApi`.
 *   - **featured programs** — `GET /catalog` via the existing
 *     `PublicCatalogStore`. There is no `LandingData.featuredPrograms` type any
 *     more: they are plain `PublicCertificate`s owned by the catalog store, and
 *     giving them a second home here would duplicate that model.
 *   - **insight cards** — `GET /blog` via the `insights` feature's
 *     `InsightsApi`, with a small static fallback for when nothing is published
 *     or the call fails (see `landing.store`).
 */

/** Live platform counters shown in the stats strip under the hero. */
export interface LandingStats {
  readonly programs: number;
  readonly students: number;
  readonly certificatesIssued: number;
}
