import { HttpParams } from '@angular/common/http';

/**
 * Cursor/keyset pagination shapes shared by every backend list endpoint
 * (`docs/backend-analysis.md` §1.6). Lists return `{ data, meta: { pagination } }`
 * with an opaque `nextCursor` on `(created_at, id)` — there is no total count.
 */
export interface PaginationMeta {
  readonly limit: number;
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

/** Envelope of a paginated list response. `M` carries any extra meta (e.g. `locale`). */
export interface PagedResponse<T, M = Record<string, unknown>> {
  readonly data: readonly T[];
  readonly meta: M & { readonly pagination: PaginationMeta };
}

/** Base query for any cursor-paginated endpoint. */
export interface CursorQuery {
  readonly cursor?: string;
  readonly limit?: number;
}

/** A single mapped page: domain items plus the cursor to fetch the next one. */
export interface Page<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

/** Map a raw `PagedResponse` into a domain `Page`, transforming each item. */
export function toPage<T, R>(res: PagedResponse<T>, mapItem: (item: T) => R): Page<R> {
  return {
    items: res.data.map(mapItem),
    nextCursor: res.meta.pagination.nextCursor,
    hasMore: res.meta.pagination.hasMore,
  };
}

/**
 * Build `HttpParams` from a plain query object, skipping `undefined`/`null`/`''`.
 * Booleans and numbers are stringified. Keeps API services free of repetitive
 * `if (x !== undefined) params = params.set(...)` boilerplate.
 */
export function toHttpParams(
  query: Record<string, string | number | boolean | undefined | null>,
): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params = params.set(key, String(value));
  }
  return params;
}
