import {
  type HttpErrorResponse,
  type HttpInterceptorFn,
  type HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthStore } from '@core/auth';

import { SKIP_AUTH } from './http.tokens';

/**
 * AUTH interceptor — first in the chain (CLAUDE.md §6).
 *
 * Responsibilities:
 *   1. Attach `Authorization: Bearer <accessToken>` to non-public requests.
 *   2. On 401, delegate to `AuthStore.refreshAccessToken()` — race-safe
 *      single-flight refresh per /docs/07 §2.3 — and replay the original
 *      request with the new token.
 *
 * The refresh call itself MUST NOT loop through this interceptor: any URL
 * matching `/auth/(login|register|refresh|logout)` is treated as public
 * here and never re-attempted on 401. The same exclusion mirrors the rule
 * in /docs/07 §2.3.
 */
const AUTH_PUBLIC_PATH = /\/auth\/(login|register|refresh|logout)(\/|$|\?)/;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStore);

  const isPublic = req.context.get(SKIP_AUTH) || AUTH_PUBLIC_PATH.test(req.url);
  if (isPublic) {
    return next(req);
  }

  const authedReq = withBearer(req, auth.accessToken());

  return next(authedReq).pipe(
    catchError((err: unknown) => {
      if (!isUnauthorized(err)) {
        return throwError(() => err);
      }

      // No bearer was attached → there's nothing to refresh; just bubble.
      if (!auth.accessToken()) {
        return throwError(() => err);
      }

      return auth.refreshAccessToken().pipe(
        switchMap((newToken) => next(withBearer(req, newToken))),
        catchError((refreshErr: unknown) => {
          // Refresh failed → log the user out and surface the original 401.
          auth.handleRefreshFailure();
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};

function withBearer<T>(req: HttpRequest<T>, token: string | null): HttpRequest<T> {
  if (!token) return req;
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function isUnauthorized(err: unknown): err is HttpErrorResponse {
  return typeof err === 'object' && err !== null && 'status' in err && err.status === 401;
}
