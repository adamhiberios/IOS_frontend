import { type CatalogItemDto, type OutlineModuleDto, type OutlineResponseDto } from './catalog.dto';
import { type CourseOutline, type OutlineModule, type PublicCertificate } from './catalog.model';

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
    badgeImageUrl: dto.badgeImageUrl ?? null,
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
