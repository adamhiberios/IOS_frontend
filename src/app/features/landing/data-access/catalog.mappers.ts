import {
  type CatalogDetailItemDto,
  type CatalogItemDto,
  type OutlineModuleDto,
  type OutlineResponseDto,
} from './catalog.dto';
import {
  type CourseOutline,
  type OutlineModule,
  type PublicCertificate,
  type PublicCertificateDetail,
} from './catalog.model';

// ---------------------------------------------------------------------------
// Track / level normalization — shared by every view that groups the public
// catalog by career track (landing navbar mega-menu, cert-levels-section).
// Lives here rather than duplicated per-component so the two stay consistent.
// ---------------------------------------------------------------------------

/** The tracks that have bespoke marketing copy and a brand color/order. */
export type KnownTrack = 'scrumMaster' | 'productOwner' | 'scrumFacilitator';

/** Display/tab order for recognised tracks; anything else sorts after them. */
export const TRACK_ORDER: readonly KnownTrack[] = [
  'scrumMaster',
  'productOwner',
  'scrumFacilitator',
];

/** Card order within a track: Foundation → Practitioner → Authority. */
export const LEVEL_ORDER = ['foundation', 'practitioner', 'authority'] as const;

/**
 * Backend `track` is free text, so match it loosely: lower-cased with every
 * non-alphanumeric character stripped, which absorbs "Scrum Master",
 * "scrum-master" and "SCRUM_MASTER" alike.
 */
const TRACK_ALIASES: Record<string, KnownTrack> = {
  scrummaster: 'scrumMaster',
  productowner: 'productOwner',
  scrumfacilitator: 'scrumFacilitator',
};

/** Normalises a backend `track` string to a recognised track, or `null`. */
export function normalizeTrack(track: string | null | undefined): KnownTrack | null {
  const normalized = (track ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return TRACK_ALIASES[normalized] ?? null;
}

/** Sort weight for a tier, with unset levels trailing the known ones. */
export function levelRank(level: PublicCertificate['level']): number {
  const idx = level ? LEVEL_ORDER.indexOf(level) : -1;
  return idx === -1 ? LEVEL_ORDER.length : idx;
}

/** Map a wire `CatalogItemDto` to the frontend `PublicCertificate` model. */
export function toPublicCertificate(dto: CatalogItemDto): PublicCertificate {
  return {
    id: dto.id,
    programCode: dto.programCode,
    title: dto.title,
    description: dto.description,
    price: dto.price,
    currency: dto.currency,
    thumbnailUrl: dto.thumbnailUrl,
    fallbackUsed: dto.fallbackUsed,
    track: dto.track ?? null,
    level: dto.level ?? null,
    durationHours: dto.durationHours ?? null,
    badgeImageUrl: dto.badgeImageUrl ?? null,
  };
}

/**
 * Map the `GET /catalog/:id` response to the frontend `PublicCertificateDetail`
 * model — `toPublicCertificate` plus the optional `seo` block, which the list
 * endpoint never returns.
 */
export function toPublicCertificateDetail(dto: CatalogDetailItemDto): PublicCertificateDetail {
  return {
    ...toPublicCertificate(dto),
    seo: dto.seo
      ? {
          metaTitle: dto.seo.metaTitle,
          metaDescription: dto.seo.metaDescription,
          canonicalUrl: dto.seo.canonicalUrl,
          ogType: dto.seo.ogType,
          jsonLd: dto.seo.jsonLd,
        }
      : undefined,
  };
}

function toOutlineModule(dto: OutlineModuleDto): OutlineModule {
  return {
    id: dto.id,
    title: dto.title,
    position: dto.position,
    lessons: dto.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      position: l.position,
      durationSeconds: l.durationSeconds,
      hasVideo: l.hasVideo,
    })),
  };
}

/** Map the `GET /catalog/:id/outline` response to the `CourseOutline` model. */
export function toCourseOutline(dto: OutlineResponseDto): CourseOutline {
  return {
    certId: dto.data.certId,
    title: dto.data.title,
    modules: dto.data.modules.map(toOutlineModule),
  };
}

/**
 * Format a raw backend price + ISO currency into a localized currency string
 * (e.g. "$149.00"). Falls back to `"<currency> <price>"` if `Intl` can't format
 * the currency (unknown code) so the UI never shows a raw number with no unit.
 */
export function formatPrice(price: string, currency: string, locale: string): string {
  const amount = Number(price);
  if (!Number.isFinite(amount)) return `${currency} ${price}`;
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
