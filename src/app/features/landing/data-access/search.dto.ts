/**
 * Wire shapes for the public global search — `GET /search` (IOS_Backend
 * `SearchController`, IDD-321). `@OptionalAuth()`: anonymous callers match
 * published public content; a signed-in learner also matches lessons and
 * modules of the programmes they purchased.
 */

/** `SearchSourceType` on the backend. */
export type SearchResultTypeDto =
  | 'certificate'
  | 'blog_article'
  | 'cms_page'
  | 'learning_module'
  | 'lesson';

export interface SearchQueryDto {
  readonly q: string;
  /** Comma-separated on the wire. */
  readonly types?: string;
  readonly limit?: number;
  readonly offset?: number;
}

/** Character range of a matched term inside `snippet`. */
export interface SearchHighlightDto {
  readonly start: number;
  readonly length: number;
}

export interface SearchResultDto {
  readonly type: SearchResultTypeDto;
  readonly id: string;
  readonly title: string;
  /** PLAIN TEXT — never HTML. Emphasis travels separately in `highlights`. */
  readonly snippet: string | null;
  readonly highlights: readonly SearchHighlightDto[];
  /** Relative frontend path the backend suggests (see `PublicUrlService`). */
  readonly url: string;
  readonly imageUrl: string | null;
  readonly locale: string;
  readonly direction: 'ltr' | 'rtl';
  readonly fallbackUsed: boolean;
  readonly status: string;
}

export interface SearchResponseDto {
  readonly data: readonly SearchResultDto[];
  readonly meta: {
    readonly query: string;
    readonly locale: string;
    readonly countsByType: Partial<Record<SearchResultTypeDto, number>>;
    readonly pagination: {
      readonly limit: number;
      readonly offset: number;
      readonly total: number;
      readonly hasMore: boolean;
    };
  };
}
