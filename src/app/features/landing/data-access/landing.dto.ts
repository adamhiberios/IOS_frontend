/**
 * Landing page API response DTO — `GET /landing` (public, BE-I-20).
 *
 * Bare payload (no envelope): `{ featuredPrograms, stats }`. `featuredPrograms`
 * are full `CatalogItemDto`s (localized by `X-Lang`, same shape the public
 * catalog returns), and `stats` are live platform counters. Static landing copy
 * (headings, cert-level structure, insight posts) is owned by the section
 * components / i18n and is never fetched.
 */

import { type CatalogItemDto } from './catalog.dto';

/** Live platform counters shown in the landing stats strip. */
export interface LandingStatsDto {
  readonly programs: number;
  readonly students: number;
  readonly certificatesIssued: number;
}

/** `GET /landing` — bare `{ featuredPrograms, stats }`. */
export interface LandingResponseDto {
  readonly featuredPrograms: readonly CatalogItemDto[];
  readonly stats: LandingStatsDto;
}
