/**
 * Landing page DTO → domain mappers for `GET /analytics/public-stats` (BE-I-30).
 *
 * Featured programs are **no longer mapped here**: since the backend split the
 * old `/landing` payload, they come from `GET /catalog` through the existing
 * `PublicCatalogStore`, which already owns that mapping. Re-mapping them here
 * would be a second, drifting copy of the same transform.
 */

import { type PublicStatsResponseDto } from './landing.dto';
import { type LandingStats } from './landing.model';

/**
 * Map the `{ stats }` response into the domain model. Each counter goes through
 * {@link toCount} so a missing or non-numeric field renders as `0` rather than
 * `NaN` on a public marketing page.
 */
export function toLandingStats(dto: PublicStatsResponseDto): LandingStats {
  const stats = dto.stats;
  return {
    programs: toCount(stats?.programs),
    students: toCount(stats?.students),
    certificatesIssued: toCount(stats?.certificatesIssued),
  };
}

/** A finite, non-negative number, or `0`. */
function toCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}
