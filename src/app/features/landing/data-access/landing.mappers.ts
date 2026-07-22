/**
 * Landing page DTO → domain mappers for `GET /landing` (BE-I-20).
 *
 * `featuredPrograms` reuse the public-catalog mapper (same `CatalogItemDto`
 * shape); `stats` are copied through. Static content (insight posts) is not
 * mapped here — it lives in the store / section components.
 */

import { toPublicCertificate } from './catalog.mappers';
import { type LandingResponseDto } from './landing.dto';
import { type LandingData } from './landing.model';

/** Map the bare `GET /landing` response into the `LandingData` domain model. */
export function toLandingData(dto: LandingResponseDto): LandingData {
  return {
    featuredPrograms: dto.featuredPrograms.map(toPublicCertificate),
    stats: {
      programs: dto.stats.programs,
      students: dto.stats.students,
      certificatesIssued: dto.stats.certificatesIssued,
    },
  };
}
