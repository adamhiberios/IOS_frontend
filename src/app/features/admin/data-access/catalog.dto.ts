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
  readonly locale: string;
  readonly direction: 'ltr' | 'rtl';
  readonly fallbackUsed: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** `GET /admin/catalog` response — list envelope with `locale` + pagination meta. */
export type CatalogListResponseDto = PagedResponse<CatalogItemDto, { locale: string }>;
