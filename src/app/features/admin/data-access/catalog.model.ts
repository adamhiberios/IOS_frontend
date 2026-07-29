/** Certification mastery tier (`CertLevel`). */
export const CERT_LEVELS = ['foundation', 'practitioner', 'authority'] as const;
export type CertLevel = (typeof CERT_LEVELS)[number];

/** True when `value` is a known cert level. */
export function isCertLevel(value: string | null): value is CertLevel {
  return value !== null && (CERT_LEVELS as readonly string[]).includes(value);
}

/**
 * Frontend domain model for admin catalog (certificates). Trimmed from the DTO
 * to the fields the admin UI actually renders; i18n-resolution hints
 * (`locale`, `direction`, `fallbackUsed`) are dropped — the admin list shows the
 * canonical English row.
 */
export interface AdminCertificate {
  readonly id: string;
  readonly programCode: string;
  readonly title: string;
  readonly description: string | null;
  /** Decimal string as stored by the backend (e.g. "49.00"). */
  readonly price: string;
  readonly currency: string;
  readonly thumbnailUrl: string | null;
  readonly active: boolean;
  // Catalog-card metadata (BE-I-04).
  readonly badgeImageUrl: string | null;
  readonly track: string | null;
  readonly level: CertLevel | null;
  readonly durationHours: number | null;
  readonly syllabusUrl: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Per-locale translatable fields (`CertificateLocaleDto`). */
export interface CertificateLocaleFields {
  readonly title?: string;
  readonly description?: string;
}

/** Detail view — adds the raw per-locale translations (admin `GET /admin/catalog/:id`). */
export interface AdminCertificateDetail extends AdminCertificate {
  readonly translations: Readonly<Record<string, CertificateLocaleFields>>;
}

/**
 * Body for `PATCH /admin/catalog/:id/translations` (`UpdateTranslationsDto`).
 * Each supplied locale REPLACES that locale's block; pass `{}` for a locale to
 * clear it. Locales absent from the map are preserved.
 */
export interface CertificateTranslationsPayload {
  readonly translations: Record<string, CertificateLocaleFields>;
}

/** Active-state filter for the list. `undefined` = all. */
export type ActiveFilter = boolean | undefined;

/**
 * Body for create (`POST /admin/catalog`) and update (`PATCH /admin/catalog/:id`).
 * Mirrors the backend `CreateCertificateDto` / `UpdateCertificateDto`, including
 * the catalog-card metadata (BE-I-04). Nullable fields send `null` to clear;
 * `durationHours` is omitted when blank (the backend coerces `null → 0`, so it
 * can't be cleared to null via the form — a blank field preserves the value).
 * Translations are managed via a separate endpoint (out of scope for this form).
 */
export interface CertificateWritePayload {
  readonly title: string;
  readonly programCode: string;
  readonly price: number;
  readonly currency?: string;
  readonly description?: string | null;
  readonly thumbnailUrl?: string | null;
  readonly active?: boolean;
  readonly badgeImageUrl?: string | null;
  readonly track?: string | null;
  readonly level?: CertLevel | null;
  readonly durationHours?: number;
  readonly syllabusUrl?: string | null;
}

/** Query for `GET /admin/catalog`. Mirrors the backend `CatalogQueryDto`. */
export interface CatalogListQuery {
  readonly search?: string;
  readonly programCode?: string;
  readonly active?: boolean;
  readonly cursor?: string;
  readonly limit?: number;
  readonly sort?: '-created_at' | 'created_at';
}

/* ─── Certificate image upload (BE-I-27, narrowed by backend `66a7632`) ─── */

/**
 * The two image slots a certificate has. Each maps to one form field:
 * `badge` → `badgeImageUrl`, `thumbnail` → `thumbnailUrl`.
 */
export const CERTIFICATE_IMAGE_TYPES = ['badge', 'thumbnail'] as const;
export type CertificateImageType = (typeof CERTIFICATE_IMAGE_TYPES)[number];

/**
 * Content types the backend will sign an upload for
 * (`certificate-image-upload-url.dto.ts:15-20`). Anything else is a 400, so the
 * file picker filters to these and rejects others before spending a request.
 */
export const CERTIFICATE_IMAGE_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
] as const;
export type CertificateImageContentType = (typeof CERTIFICATE_IMAGE_CONTENT_TYPES)[number];

/** True when the browser-reported MIME type is one the backend will sign. */
export function isCertificateImageContentType(
  value: string,
): value is CertificateImageContentType {
  return (CERTIFICATE_IMAGE_CONTENT_TYPES as readonly string[]).includes(value);
}

/** `accept` attribute for the file input, derived from the allowed types. */
export const CERTIFICATE_IMAGE_ACCEPT = CERTIFICATE_IMAGE_CONTENT_TYPES.join(',');

/**
 * A signed upload target. `requiredHeaders` is kept **as returned** rather than
 * reduced to a `Content-Type` — the signature covers `x-amz-acl` too, and the
 * backend is free to add more, so the client echoes whatever it is told.
 */
export interface CertificateImageUploadTarget {
  readonly uploadUrl: string;
  readonly requiredHeaders: Readonly<Record<string, string>>;
  readonly key: string;
  /** Persist this on the certificate — not the `key` (cf. the avatar flow). */
  readonly publicUrl: string;
  readonly expiresInSeconds: number;
}
