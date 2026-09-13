/**
 * Mappers between the admin resource-download wire DTOs and the frontend
 * domain model. The shapes match 1:1; these keep DTO types out of the store and
 * page, and give one place to adapt if the wire shape moves.
 */

import {
  type ResourceDownloadDetailDto,
  type ResourceDownloadItemDto,
} from './resource-download.dto';
import { type ResourceDownloadDetail, type ResourceDownloadItem } from './resource-download.model';

/** Map a list row DTO to the domain model. */
export function toResourceDownloadItem(dto: ResourceDownloadItemDto): ResourceDownloadItem {
  return {
    id: dto.id,
    resourceSlug: dto.resourceSlug,
    fullName: dto.fullName,
    email: dto.email,
    country: dto.country,
    pageSlug: dto.pageSlug,
    status: dto.status,
    createdAt: dto.createdAt,
  };
}

/** Map the full record DTO to the domain model. */
export function toResourceDownloadDetail(dto: ResourceDownloadDetailDto): ResourceDownloadDetail {
  return {
    ...toResourceDownloadItem(dto),
    adminNotes: dto.adminNotes,
    locale: dto.locale,
    ipHash: dto.ipHash,
    userAgent: dto.userAgent,
    updatedAt: dto.updatedAt,
  };
}
