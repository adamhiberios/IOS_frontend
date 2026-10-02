/**
 * Mappers between the admin blog wire DTOs and the frontend domain model.
 * Handles the snake_case ↔ camelCase gap inside the per-locale translation
 * blocks (`content_html`/`meta_description` on the wire).
 */

import {
  type BlogAdminDetailDto,
  type BlogAdminItemDto,
  type BlogCoverUploadUrlResponseDto,
  type BlogLocaleDto,
  type CreateBlogBody,
  type UpdateBlogBody,
  type UpdateBlogTranslationsBody,
} from './blog.dto';
import {
  type BlogAdminDetail,
  type BlogAdminItem,
  type BlogCoverUploadTarget,
  type BlogLocaleContent,
  type BlogTranslationsPayload,
  type CreateBlogPayload,
  type UpdateBlogPayload,
} from './blog.model';

/** Map an admin list row DTO to the domain model (1:1). */
export function toBlogAdminItem(dto: BlogAdminItemDto): BlogAdminItem {
  return {
    id: dto.id,
    slug: dto.slug,
    title: dto.title,
    status: dto.status,
    metaDescription: dto.metaDescription,
    authorName: dto.authorName,
    publishedAt: dto.publishedAt,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/** Wire locale block (snake_case) → domain content (camelCase, blanks filled). */
function toLocaleContent(dto: BlogLocaleDto): BlogLocaleContent {
  return {
    title: dto.title ?? '',
    contentHtml: dto.content_html ?? '',
    metaDescription: dto.meta_description ?? '',
  };
}

/** Map the bare authoring-detail DTO to the domain model. */
export function toBlogAdminDetail(dto: BlogAdminDetailDto): BlogAdminDetail {
  const translations: Record<string, BlogLocaleContent> = {};
  for (const [locale, block] of Object.entries(dto.translations ?? {})) {
    translations[locale] = toLocaleContent(block);
  }
  return {
    ...toBlogAdminItem(dto),
    contentHtml: dto.contentHtml,
    coverImageUrl: dto.coverImageUrl || null,
    coverImageAlt: dto.coverImageAlt || null,
    translations,
  };
}

/**
 * Body for the placeholder an article starts as. The Word import needs an
 * existing article id, and the backend requires a non-empty body on create, so
 * the draft is created with a stub body — drafts are never public — and the
 * converted content replaces it straight away.
 */
export const NEW_ARTICLE_PLACEHOLDER_HTML = '<p></p>';

/** Build the create body: English fields; blank slug/meta omitted (backend derives). */
export function toCreateBlogBody(payload: CreateBlogPayload): CreateBlogBody {
  const slug = payload.slug?.trim();
  const metaDescription = payload.metaDescription?.trim();
  return {
    title: payload.title.trim(),
    contentHtml: NEW_ARTICLE_PLACEHOLDER_HTML,
    ...(slug ? { slug } : {}),
    ...(metaDescription ? { metaDescription } : {}),
  };
}

/**
 * Build the update body. Title is always sent; `contentHtml` only when a new
 * Word document was converted — otherwise the stored body is left exactly as it
 * is. `metaDescription` and the cover fields are sent as-is (empty string clears
 * them); `slug` is sent only when non-blank so a published article's locked
 * slug is never touched.
 */
export function toUpdateBlogBody(payload: UpdateBlogPayload, contentHtml?: string): UpdateBlogBody {
  const slug = payload.slug?.trim();
  return {
    title: payload.title.trim(),
    ...(contentHtml !== undefined ? { contentHtml } : {}),
    metaDescription: payload.metaDescription?.trim() ?? '',
    coverImageUrl: payload.coverImageUrl.trim(),
    coverImageAlt: payload.coverImageAlt.trim(),
    ...(slug ? { slug } : {}),
  };
}

/** Map the presigned cover-upload response to the domain target. */
export function toBlogCoverUploadTarget(dto: BlogCoverUploadUrlResponseDto): BlogCoverUploadTarget {
  return {
    uploadUrl: dto.uploadUrl,
    requiredHeaders: { ...(dto.requiredHeaders ?? {}) },
    key: dto.key,
    publicUrl: dto.publicUrl,
    expiresInSeconds: dto.expiresInSeconds,
  };
}

/** Domain content (camelCase) → wire locale block (snake_case). */
function toLocaleDto(content: BlogLocaleContent): BlogLocaleDto {
  return {
    title: content.title.trim(),
    content_html: content.contentHtml,
    meta_description: content.metaDescription.trim(),
  };
}

/**
 * Build the translations replace-merge body. Only locales with at least one
 * non-empty field are included; each is sent as a full block so the server-side
 * per-locale replace is deterministic. Locales left entirely blank are omitted
 * (preserved unchanged).
 */
export function toTranslationsBody(payload: BlogTranslationsPayload): UpdateBlogTranslationsBody {
  const translations: Record<string, BlogLocaleDto> = {};
  for (const [locale, content] of Object.entries(payload)) {
    if (!content) continue;
    const hasContent =
      content.title.trim() !== '' ||
      content.contentHtml.trim() !== '' ||
      content.metaDescription.trim() !== '';
    if (hasContent) translations[locale] = toLocaleDto(content);
  }
  return { translations };
}
