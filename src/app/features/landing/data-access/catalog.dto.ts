import { type PagedResponse } from '@core/http';

/**
 * Wire shapes for the **public** catalog endpoints — mirror the backend
 * `catalog-response.dto.ts` (`docs/backend-analysis.md` §6.3) exactly. Public
 * responses add `locale` / `direction` / `fallbackUsed` (the resolved-locale
 * markers) and never include the raw `translations` JSONB. Titles/descriptions
 * arrive already resolved into the requested locale (English fallback).
 *
 * Kept local to the landing feature (no cross-feature import of the admin
 * catalog layer, per CLAUDE.md §5).
 */

/** One certificate row (`CatalogItemDto`). `price` is a decimal string, e.g. "149.00". */
export interface CatalogItemDto {
  readonly id: string;
  readonly programCode: string;
  readonly title: string;
  readonly description: string | null;
  readonly price: string;
  readonly currency: string;
  readonly thumbnailUrl: string | null;
  readonly badgeImageUrl?: string | null;
  readonly track?: string | null;
  readonly level?: 'foundation' | 'practitioner' | 'authority' | null;
  readonly durationHours?: number | null;
  readonly syllabusUrl?: string | null;
  readonly active: boolean;
  readonly locale: string;
  readonly direction: 'ltr' | 'rtl';
  readonly fallbackUsed: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** `GET /catalog` — cursor-paginated list of active certificates. */
export type CatalogListResponseDto = PagedResponse<CatalogItemDto, { locale: string }>;

/** `GET /catalog/:id` — one active certificate (404 if inactive). */
export interface CatalogDetailResponseDto {
  readonly data: CatalogItemDto;
  readonly meta: { readonly locale: string };
}

/** One lesson in the public outline (titles + durations only, no content). */
export interface OutlineLessonDto {
  readonly id: string;
  readonly title: string;
  readonly position: number;
  readonly durationSeconds: number;
  readonly hasVideo: boolean;
}

/** One module in the public outline. */
export interface OutlineModuleDto {
  readonly id: string;
  readonly title: string;
  readonly position: number;
  readonly lessons: readonly OutlineLessonDto[];
}

/** `GET /catalog/:id/outline` — localized module/lesson titles (preview only). */
export interface OutlineResponseDto {
  readonly data: {
    readonly certId: string;
    readonly title: string;
    readonly modules: readonly OutlineModuleDto[];
  };
  readonly meta: {
    readonly locale: string;
    readonly direction: 'ltr' | 'rtl';
    readonly preview: boolean;
  };
}
