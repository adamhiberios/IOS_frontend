/**
 * PublicSearchApi — transport for the global search, `GET /search`
 * (`@OptionalAuth()`). The bearer token, when present, is attached by
 * `authInterceptor`, which widens results to the learner's purchased course
 * content; the locale travels via `localeInterceptor`.
 *
 * The endpoint has its own tight rate limit (30/min by default), so a 429 is
 * an expected outcome of fast typing — errors are shown inline by the search
 * dialog and the global error toast is suppressed.
 */

import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import { SUPPRESS_ERROR_TOAST, toHttpParams } from '@core/http';
import { environment } from '@env/environment';

import { type SearchResponseDto } from './search.dto';
import { toSearchPage } from './search.mappers';
import { type SearchPage, type SearchResultType } from './search.model';

export interface SearchRequest {
  readonly q: string;
  readonly types?: readonly SearchResultType[];
  readonly limit?: number;
  readonly offset?: number;
}

@Injectable({ providedIn: 'root' })
export class PublicSearchApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/search`;

  /** `GET /search` — relevance-ranked, offset-paginated. */
  search(req: SearchRequest): Observable<SearchPage> {
    const params = toHttpParams({
      q: req.q,
      types: req.types?.length ? req.types.join(',') : undefined,
      limit: req.limit,
      offset: req.offset,
    });
    return this.http
      .get<SearchResponseDto>(this.base, {
        params,
        context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
      })
      .pipe(map(toSearchPage));
  }
}
