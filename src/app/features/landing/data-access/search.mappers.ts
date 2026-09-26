import {
  type SearchHighlightDto,
  type SearchResponseDto,
  type SearchResultDto,
} from './search.dto';
import { type SearchPage, type SearchResult, type SearchSnippetSegment } from './search.model';

/**
 * Splits a plain-text snippet on the backend's highlight ranges. Ranges that
 * overlap, run backwards, or fall outside the text are skipped rather than
 * trusted, so a malformed range can only lose emphasis, never text.
 */
export function toSnippetSegments(
  snippet: string | null,
  highlights: readonly SearchHighlightDto[],
): SearchSnippetSegment[] {
  if (!snippet) return [];

  const segments: SearchSnippetSegment[] = [];
  let cursor = 0;
  for (const { start, length } of [...highlights].sort((a, b) => a.start - b.start)) {
    const end = start + length;
    if (start < cursor || length <= 0 || end > snippet.length) continue;
    if (start > cursor) segments.push({ text: snippet.slice(cursor, start), match: false });
    segments.push({ text: snippet.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < snippet.length) segments.push({ text: snippet.slice(cursor), match: false });
  return segments;
}

export function toSearchResult(dto: SearchResultDto): SearchResult {
  return {
    type: dto.type,
    id: dto.id,
    title: dto.title,
    snippet: toSnippetSegments(dto.snippet, dto.highlights ?? []),
    url: dto.url,
    imageUrl: dto.imageUrl,
  };
}

export function toSearchPage(dto: SearchResponseDto): SearchPage {
  return {
    items: dto.data.map(toSearchResult),
    countsByType: dto.meta.countsByType ?? {},
    total: dto.meta.pagination.total,
    hasMore: dto.meta.pagination.hasMore,
  };
}
