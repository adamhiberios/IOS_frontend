/**
 * Mappers between the admin contact wire DTOs and the frontend domain model.
 * The shapes match 1:1 (no snake_case gap here), so these exist to keep the
 * transport free of DTO types leaking outward, and to give the store a single
 * place to adapt if the wire shape moves.
 */

import { type ContactDetailDto, type ContactItemDto } from './contact.dto';
import { type ContactDetail, type ContactItem } from './contact.model';

/** Map a list row DTO to the domain model. */
export function toContactItem(dto: ContactItemDto): ContactItem {
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    subject: dto.subject,
    pageSlug: dto.pageSlug,
    status: dto.status,
    createdAt: dto.createdAt,
  };
}

/** Map the full submission DTO to the domain model. */
export function toContactDetail(dto: ContactDetailDto): ContactDetail {
  return {
    ...toContactItem(dto),
    message: dto.message,
    locale: dto.locale,
    ipHash: dto.ipHash,
    userAgent: dto.userAgent,
    updatedAt: dto.updatedAt,
  };
}
