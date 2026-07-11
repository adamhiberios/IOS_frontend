import { type CatalogItemDto } from './catalog.dto';
import { type AdminCertificate } from './catalog.model';

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
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
