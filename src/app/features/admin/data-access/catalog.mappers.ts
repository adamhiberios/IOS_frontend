import {
  type CatalogDetailDto,
  type CatalogItemDto,
  type CertificateImageUploadUrlResponseDto,
} from './catalog.dto';
import {
  type AdminCertificate,
  type AdminCertificateDetail,
  type CertificateImageUploadTarget,
  type CertificateLocaleFields,
  isCertLevel,
} from './catalog.model';

/** Map a wire `CatalogItemDto` to the frontend `AdminCertificate` model. */
export function toAdminCertificate(dto: CatalogItemDto): AdminCertificate {
  return {
    id: dto.id,
    programCode: dto.programCode,
    title: dto.title,
    description: dto.description,
    price: dto.price,
    currency: dto.currency,
    thumbnailUrl: dto.thumbnailUrl,
    active: dto.active,
    badgeImageUrl: dto.badgeImageUrl,
    track: dto.track,
    level: isCertLevel(dto.level) ? dto.level : null,
    durationHours: dto.durationHours,
    syllabusUrl: dto.syllabusUrl,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

function toLocaleFields(raw: Record<string, string>): CertificateLocaleFields {
  return { title: raw['title'], description: raw['description'] };
}

/** Map a wire `CatalogDetailDto` to `AdminCertificateDetail` (adds translations). */
export function toAdminCertificateDetail(dto: CatalogDetailDto): AdminCertificateDetail {
  const translations: Record<string, CertificateLocaleFields> = {};
  for (const [locale, fields] of Object.entries(dto.translations ?? {})) {
    translations[locale] = toLocaleFields(fields);
  }
  return { ...toAdminCertificate(dto), translations };
}

/**
 * Map the presigned-upload response (bare, no envelope) to the domain target.
 * `requiredHeaders` is copied rather than aliased so a later mutation of the
 * response object can't change what gets sent on the signed PUT, and defaults to
 * `{}` so a malformed response degrades to a failed upload rather than a crash.
 */
export function toCertificateImageUploadTarget(
  dto: CertificateImageUploadUrlResponseDto,
): CertificateImageUploadTarget {
  return {
    uploadUrl: dto.uploadUrl,
    requiredHeaders: { ...(dto.requiredHeaders ?? {}) },
    key: dto.key,
    publicUrl: dto.publicUrl,
    expiresInSeconds: dto.expiresInSeconds,
  };
}
