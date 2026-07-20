import { type PagedResponse } from '@core/http';

/**
 * Wire shapes for the admin catalog endpoints — mirror the backend
 * `catalog-response.dto.ts` / `catalog-query.dto.ts` exactly
 * (`docs/backend-analysis.md` §6.3, §7.2). Names match the JSON on the wire.
 */

/** One certificate row (`CatalogItemDto`). `price` is a decimal string, e.g. "49.00". */
export interface CatalogItemDto {
  readonly id: string;
  readonly programCode: string;
  readonly title: string;
  readonly description: string | null;
  readonly price: string;
  readonly currency: string;
  readonly thumbnailUrl: string | null;
  readonly active: boolean;
  // Catalog-card metadata (BE-I-04) — all nullable.
  readonly badgeImageUrl: string | null;
  readonly track: string | null;
  readonly level: string | null;
  readonly durationHours: number | null;
  readonly syllabusUrl: string | null;
  readonly locale: string;
  readonly direction: 'ltr' | 'rtl';
  readonly fallbackUsed: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** `GET /admin/catalog` response — list envelope with `locale` + pagination meta. */
export type CatalogListResponseDto = PagedResponse<CatalogItemDto, { locale: string }>;

/** One certificate for the admin detail view (`CatalogDetailDto`) — includes raw translations. */
export interface CatalogDetailDto extends CatalogItemDto {
  readonly translations?: Record<string, Record<string, string>>;
}

/** `GET /admin/catalog/:id` response. */
export interface CatalogDetailResponseDto {
  readonly data: CatalogDetailDto;
  readonly meta: { readonly locale: string };
}
