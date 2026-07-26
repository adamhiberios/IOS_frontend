/**
 * Public catalog domain types.
 *
 * The public catalog is a thin, purchasable-product view: a certificate's
 * commercial fields (`price`/`currency`), its resolved `title`/`description`,
 * and a preview `outline`. It is matched to the static marketing pages by
 * `programCode` (e.g. "ESM"); marketing copy the backend doesn't own (audience,
 * key-learning, FAQ, imagery) stays in the page components.
 */

/** A certificate as shown on the public catalog (already locale-resolved). */
export interface PublicCertificate {
  readonly id: string;
  readonly programCode: string;
  readonly title: string;
  readonly description: string | null;
  /** Raw decimal string as sent by the backend, e.g. "149.00". */
  readonly price: string;
  /** ISO 4217 currency code, e.g. "USD". */
  readonly currency: string;
  readonly thumbnailUrl: string | null;
  /** True when the row fell back to English because the locale had no translation. */
  readonly fallbackUsed: boolean;
  /** Backend grouping — free-text career track, e.g. "Scrum Master", "Product Owner". */
  readonly track: string | null;
  /** Backend tier for this certificate, when set. */
  readonly level: 'foundation' | 'practitioner' | 'authority' | null;
  /** Certificate badge image URL, when the backend has one configured. */
  readonly badgeImageUrl: string | null;
}

/** Query for `GET /catalog` (browse list). */
export interface CatalogListQuery {
  readonly search?: string;
  readonly programCode?: string;
  readonly cursor?: string;
  readonly limit?: number;
  readonly sort?: '-created_at' | 'created_at';
}

/** One lesson in the public curriculum outline. */
export interface OutlineLesson {
  readonly id: string;
  readonly title: string;
  readonly position: number;
  readonly durationSeconds: number;
  readonly hasVideo: boolean;
}

/** One module in the public curriculum outline. */
export interface OutlineModule {
  readonly id: string;
  readonly title: string;
  readonly position: number;
  readonly lessons: readonly OutlineLesson[];
}

/** The public curriculum outline (titles only — content is purchase-gated). */
export interface CourseOutline {
  readonly certId: string;
  readonly title: string;
  readonly modules: readonly OutlineModule[];
}
