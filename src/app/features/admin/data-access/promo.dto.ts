/**
 * Wire shapes for admin promo-code management (BE-I-05 / B4).
 *
 *   POST   /admin/promo-codes       → { data } (201; 409 duplicate code)
 *   GET    /admin/promo-codes       → { data, meta.pagination } (cursor)
 *   GET    /admin/promo-codes/:id   → { data }
 *   PATCH  /admin/promo-codes/:id   → { data } (code immutable)
 *   DELETE /admin/promo-codes/:id   → { data } (soft-delete → active=false)
 *
 * Create/update/delete: super_admin / finance_admin. List/detail also allows
 * support_admin (read-only).
 */

import { type PagedResponse } from '@core/http';

import { type DiscountType } from './promo.model';

export interface PromoCodeDto {
  readonly id: string;
  readonly code: string;
  readonly discountType: DiscountType;
  readonly discountValue: number | null;
  readonly applicableCertIds: string[] | null;
  readonly maxUses: number | null;
  readonly usageCount: number;
  readonly expiresAt: string | null;
  readonly active: boolean;
  readonly createdById: string | null;
  readonly createdAt: string;
}

/** `{ data, meta.pagination }` envelope for the promo list. */
export type PromoListResponseDto = PagedResponse<PromoCodeDto>;

/** `{ data }` envelope for create / detail / update / delete. */
export interface PromoDetailResponseDto {
  readonly data: PromoCodeDto;
}

/**
 * `POST /admin/promo-codes` body. `discountValue` is required for `percentage`
 * and must be omitted for `full_waiver`. Omit `applicableCertIds` for all certs.
 */
export interface CreatePromoBody {
  readonly code: string;
  readonly discountType: DiscountType;
  readonly discountValue?: number;
  readonly applicableCertIds?: string[];
  readonly maxUses?: number;
  readonly expiresAt?: string;
}

/**
 * `PATCH /admin/promo-codes/:id` body. `code`/`usageCount` are rejected (400).
 * Nullable fields clear the value; `active` retires / reactivates.
 */
export interface UpdatePromoBody {
  readonly discountType?: DiscountType;
  readonly discountValue?: number | null;
  readonly applicableCertIds?: string[] | null;
  readonly maxUses?: number | null;
  readonly expiresAt?: string | null;
  readonly active?: boolean;
}
