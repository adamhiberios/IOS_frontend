import { type CreatePromoBody, type PromoCodeDto, type UpdatePromoBody } from './promo.dto';
import { type CreatePromoPayload, type PromoCode, type UpdatePromoPayload } from './promo.model';

/** Map a promo DTO to the domain model (1:1). */
export function toPromoCode(dto: PromoCodeDto): PromoCode {
  return {
    id: dto.id,
    code: dto.code,
    discountType: dto.discountType,
    discountValue: dto.discountValue,
    applicableCertIds: dto.applicableCertIds,
    maxUses: dto.maxUses,
    usageCount: dto.usageCount,
    expiresAt: dto.expiresAt,
    active: dto.active,
    createdAt: dto.createdAt,
  };
}

/**
 * Build the create body: `discountValue` only for `percentage`; blank optionals
 * are omitted so backend defaults (unlimited uses, all certs, no expiry) apply.
 */
export function toCreatePromoBody(payload: CreatePromoPayload): CreatePromoBody {
  return {
    code: payload.code.trim(),
    discountType: payload.discountType,
    ...(payload.discountType === 'percentage' && payload.discountValue !== null
      ? { discountValue: payload.discountValue }
      : {}),
    ...(payload.applicableCertIds.length
      ? { applicableCertIds: [...payload.applicableCertIds] }
      : {}),
    ...(payload.maxUses !== null ? { maxUses: payload.maxUses } : {}),
    ...(payload.expiresAt ? { expiresAt: payload.expiresAt } : {}),
  };
}

/**
 * Build the update body. Cleared fields are sent as `null` (the backend's clear
 * signal); `discountValue` is nulled for `full_waiver`. `code` is never sent.
 */
export function toUpdatePromoBody(payload: UpdatePromoPayload): UpdatePromoBody {
  return {
    discountType: payload.discountType,
    discountValue: payload.discountType === 'percentage' ? payload.discountValue : null,
    applicableCertIds: payload.applicableCertIds.length ? [...payload.applicableCertIds] : null,
    maxUses: payload.maxUses,
    expiresAt: payload.expiresAt,
  };
}
