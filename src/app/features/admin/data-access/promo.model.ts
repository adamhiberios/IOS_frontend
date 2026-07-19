/**
 * Frontend domain model for admin promo-code management (BE-I-05 / B4).
 * Mirrors `promo.dto.ts`.
 *
 * View (list/detail) is allowed for super_admin / finance_admin / support_admin;
 * mutations (create / update / retire / reactivate) are super_admin /
 * finance_admin only (backend-enforced).
 */

/** Discount kinds (matches the backend `DiscountType` enum). */
export const DISCOUNT_TYPES = ['percentage', 'full_waiver'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

/** True when `value` is a known discount type. */
export function isDiscountType(value: string): value is DiscountType {
  return (DISCOUNT_TYPES as readonly string[]).includes(value);
}

export interface PromoCode {
  readonly id: string;
  readonly code: string;
  readonly discountType: DiscountType;
  /** Percent off (percentage type); null for full_waiver. */
  readonly discountValue: number | null;
  /** Certificate ids the promo applies to; null/empty = all certificates. */
  readonly applicableCertIds: readonly string[] | null;
  /** Max redemptions; null = unlimited. */
  readonly maxUses: number | null;
  /** Read-only redemption count (DB trigger-owned). */
  readonly usageCount: number;
  readonly expiresAt: string | null;
  readonly active: boolean;
  readonly createdAt: string;
}

/** Optional server-side filters for the promo list. */
export interface PromoFilters {
  readonly active?: boolean;
  /** true = already expired; false = not-yet-expired (incl. no expiry). */
  readonly expired?: boolean;
}

/** Editable fields when creating a promo (`code` is set here, immutable after). */
export interface CreatePromoPayload {
  readonly code: string;
  readonly discountType: DiscountType;
  readonly discountValue: number | null;
  readonly applicableCertIds: readonly string[];
  readonly maxUses: number | null;
  readonly expiresAt: string | null;
}

/** Editable fields when updating a promo (`code` is immutable server-side). */
export interface UpdatePromoPayload {
  readonly discountType: DiscountType;
  readonly discountValue: number | null;
  readonly applicableCertIds: readonly string[];
  readonly maxUses: number | null;
  readonly expiresAt: string | null;
}

/** Percent discount bounds the backend enforces. */
export const PROMO_PERCENT_MIN = 0.01;
export const PROMO_PERCENT_MAX = 100;

/** True when the promo's expiry is in the past (relative to `now`). */
export function isExpired(promo: PromoCode, now: number): boolean {
  return promo.expiresAt !== null && new Date(promo.expiresAt).getTime() < now;
}
