/**
 * Landing page API response DTO — `GET /analytics/public-stats` (public).
 *
 * **Replaces the deleted `GET /landing`** (BE-I-30). The backend removed that
 * composite endpoint in `66a7632` and split its payload three ways:
 *
 *   - live counters      → `GET /analytics/public-stats`  ← this file
 *   - featured programs  → `GET /catalog`                  (composed in
 *                                                          `landing.store` from
 *                                                          the existing
 *                                                          `PublicCatalogStore`)
 *   - static home copy   → `GET /cms/pages/home`           (**not consumed** —
 *                                                          landing copy still
 *                                                          lives in the section
 *                                                          components + i18n)
 *
 * The response is **wrapped in `stats`** — `{ stats: {...} }`, neither a bare
 * object nor the usual `{ data }` envelope
 * (`public-stats-response.dto.ts:24-27`). Counters are safe aggregates only;
 * the backend never exposes per-user rows here.
 */

/** Live platform counters shown in the landing stats strip. */
export interface PublicStatsDto {
  readonly programs: number;
  readonly students: number;
  readonly certificatesIssued: number;
}

/** `GET /analytics/public-stats` — `{ stats }`. */
export interface PublicStatsResponseDto {
  readonly stats: PublicStatsDto;
}
