import { type SearchResultTypeDto } from './search.dto';

export type SearchResultType = SearchResultTypeDto;

/** Display order of the type filter chips — mirrors the backend's TYPE_BOOST ranking. */
export const SEARCH_RESULT_TYPES: readonly SearchResultType[] = [
  'certificate',
  'cms_page',
  'blog_article',
  'learning_module',
  'lesson',
];

/** One run of snippet text; `match` runs are rendered emphasised. */
export interface SearchSnippetSegment {
  readonly text: string;
  readonly match: boolean;
}

export interface SearchResult {
  readonly type: SearchResultType;
  readonly id: string;
  readonly title: string;
  /** Snippet pre-split on the highlight ranges — rendered as text, never as HTML. */
  readonly snippet: readonly SearchSnippetSegment[];
  /** Backend-suggested path; resolved to a real app route on open. */
  readonly url: string;
  readonly imageUrl: string | null;
}

export interface SearchPage {
  readonly items: readonly SearchResult[];
  readonly countsByType: Partial<Record<SearchResultType, number>>;
  readonly total: number;
  readonly hasMore: boolean;
}
