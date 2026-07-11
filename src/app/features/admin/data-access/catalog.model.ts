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
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Active-state filter for the list. `undefined` = all. */
export type ActiveFilter = boolean | undefined;

/**
 * Body for create (`POST /admin/catalog`) and update (`PATCH /admin/catalog/:id`).
 * Mirrors the backend `CreateCertificateDto` / `UpdateCertificateDto`.
 *
 * NOTE (backend BE-I-04): the backend DTOs do **not** accept `badgeImageUrl`,
 * `track`, `level`, `durationHours` or `syllabusUrl` — with `forbidNonWhitelisted`
 * the server 400s on any extra key — so those catalog-card fields are not
 * editable here and are intentionally absent. Translations are managed via a
 * separate endpoint and are out of scope for this form.
 */
export interface CertificateWritePayload {
  readonly title: string;
  readonly programCode: string;
  readonly price: number;
  readonly currency?: string;
  readonly description?: string | null;
  readonly thumbnailUrl?: string | null;
  readonly active?: boolean;
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
